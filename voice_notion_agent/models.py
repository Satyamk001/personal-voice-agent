"""Model initialization with automatic rate-limit fallback.

The primary provider is tried first; if it raises a rate-limit (HTTP 429) or
transient server error, the next provider in the fallback chain is tried.
This happens transparently on every LLM call via a thin wrapper.

Fallback chain order (configurable via LLM_FALLBACK_CHAIN env var):
  groq  →  openrouter  →  gemini
"""
from __future__ import annotations

import asyncio
import functools
import traceback
from typing import Any

from langchain_core.language_models.chat_models import BaseChatModel
from langchain_core.messages import BaseMessage

from . import config
from .logging_utils import log_stage


# ── Provider → ChatModel factory ──────────────────────────────────────

def _make_groq_model(model: str, temperature: float) -> BaseChatModel:
    from langchain_groq import ChatGroq
    return ChatGroq(
        model=model or config.GROQ_CHAT_MODEL,
        groq_api_key=config.GROQ_API_KEY,
        temperature=temperature,
    )


def _make_openrouter_model(model: str, temperature: float) -> BaseChatModel:
    from langchain_openrouter import ChatOpenRouter
    return ChatOpenRouter(
        model=model or config.OPENROUTER_CHAT_MODEL,
        api_key=config.OPENROUTER_API_KEY,
        temperature=temperature,
        max_tokens=2048,
    )


def _make_gemini_model(model: str, temperature: float) -> BaseChatModel:
    from langchain_google_genai import ChatGoogleGenerativeAI
    return ChatGoogleGenerativeAI(
        model=model or config.GEMINI_CHAT_MODEL,
        google_api_key=config.GEMINI_API_KEY,
        temperature=temperature,
    )


def _make_openai_model(model: str, temperature: float) -> BaseChatModel:
    from langchain_openai import ChatOpenAI
    return ChatOpenAI(
        model=model or "gpt-4o-mini",
        api_key=config.OPENAI_API_KEY,
        temperature=temperature,
    )


_PROVIDER_FACTORIES = {
    "groq": _make_groq_model,
    "openrouter": _make_openrouter_model,
    "gemini": _make_gemini_model,
    "openai": _make_openai_model,
}


def _is_rate_limit_or_transient(exc: Exception) -> bool:
    """Return True if the exception looks like a rate-limit, model, or transient error."""
    msg = str(exc).lower()
    # Check common HTTP status codes and keywords
    fallback_signals = [
        "429", "rate_limit", "rate limit", "ratelimit",
        "quota", "resource_exhausted", "too many requests",
        "503", "502", "service unavailable", "overloaded",
        "model_not_found", "not_found", "404", "does not exist",
        "paymentrequired", "credits", "max_tokens", "token limit",
    ]
    return any(signal in msg for signal in fallback_signals)


# ── Fallback-aware model wrapper ──────────────────────────────────────

class FallbackChatModel:
    """A thin wrapper that tries providers in order on rate-limit errors.

    It lazily creates the ChatModel for each provider and caches it.
    On a rate-limit / transient error, it logs the failure and tries the
    next provider in the chain. If all providers fail, it raises the last
    error.
    """

    def __init__(self, temperature: float = 0.3):
        self.temperature = temperature
        self.chain = config.get_llm_fallback_chain()
        self._models: dict[str, BaseChatModel] = {}

        if not self.chain:
            raise RuntimeError("No LLM providers configured with API keys.")

    def _get_model(self, provider: str) -> BaseChatModel:
        if provider not in self._models:
            factory = _PROVIDER_FACTORIES.get(provider)
            if not factory:
                raise ValueError(f"Unknown LLM provider: {provider}")
            model_name = config._default_model_for_provider(provider)
            self._models[provider] = factory(model_name, self.temperature)
        return self._models[provider]

    def invoke(self, *args: Any, **kwargs: Any) -> Any:
        last_exc: Exception | None = None
        for provider in self.chain:
            try:
                model = self._get_model(provider)
                result = model.invoke(*args, **kwargs)
                return result
            except Exception as exc:
                last_exc = exc
                if _is_rate_limit_or_transient(exc):
                    log_stage(
                        f"LLM fallback",
                        provider=provider,
                        error=f"Rate-limited / transient ({type(exc).__name__}), trying next...",
                    )
                    continue
                # Non-rate-limit error: propagate immediately
                raise
        # All providers exhausted
        raise last_exc  # type: ignore[misc]

    async def ainvoke(self, *args: Any, **kwargs: Any) -> Any:
        last_exc: Exception | None = None
        for provider in self.chain:
            try:
                model = self._get_model(provider)
                result = await model.ainvoke(*args, **kwargs)
                return result
            except Exception as exc:
                last_exc = exc
                if _is_rate_limit_or_transient(exc):
                    log_stage(
                        f"LLM fallback",
                        provider=provider,
                        error=f"Rate-limited / transient ({type(exc).__name__}), trying next...",
                    )
                    continue
                raise
        raise last_exc  # type: ignore[misc]

    def bind_tools(self, *args: Any, **kwargs: Any) -> "FallbackChatModelWithTools":
        """Bind tools across all providers in the chain."""
        return FallbackChatModelWithTools(self, args, kwargs)

    # Proxy common attributes so LangChain's create_agent recognises this
    # as a valid model.
    def __getattr__(self, name: str) -> Any:
        # Delegate attribute lookups to the first model in the chain
        if name.startswith("_"):
            raise AttributeError(name)
        model = self._get_model(self.chain[0])
        return getattr(model, name)


class FallbackChatModelWithTools:
    """Wraps bind_tools result with the same fallback logic."""

    def __init__(self, parent: FallbackChatModel, bind_args: tuple, bind_kwargs: dict):
        self._parent = parent
        self._bind_args = bind_args
        self._bind_kwargs = bind_kwargs
        self._bound_models: dict[str, Any] = {}

    def _get_bound(self, provider: str) -> Any:
        if provider not in self._bound_models:
            model = self._parent._get_model(provider)
            self._bound_models[provider] = model.bind_tools(*self._bind_args, **self._bind_kwargs)
        return self._bound_models[provider]

    def invoke(self, *args: Any, **kwargs: Any) -> Any:
        last_exc: Exception | None = None
        for provider in self._parent.chain:
            try:
                bound = self._get_bound(provider)
                return bound.invoke(*args, **kwargs)
            except Exception as exc:
                last_exc = exc
                if _is_rate_limit_or_transient(exc):
                    log_stage(
                        f"LLM fallback (tools)",
                        provider=provider,
                        error=f"Rate-limited / transient, trying next...",
                    )
                    continue
                raise
        raise last_exc  # type: ignore[misc]

    async def ainvoke(self, *args: Any, **kwargs: Any) -> Any:
        last_exc: Exception | None = None
        for provider in self._parent.chain:
            try:
                bound = self._get_bound(provider)
                return await bound.ainvoke(*args, **kwargs)
            except Exception as exc:
                last_exc = exc
                if _is_rate_limit_or_transient(exc):
                    log_stage(
                        f"LLM fallback (tools)",
                        provider=provider,
                        error=f"Rate-limited / transient, trying next...",
                    )
                    continue
                raise
        raise last_exc  # type: ignore[misc]

    def __getattr__(self, name: str) -> Any:
        if name.startswith("_"):
            raise AttributeError(name)
        bound = self._get_bound(self._parent.chain[0])
        return getattr(bound, name)


# ── Public API ────────────────────────────────────────────────────────

def get_chat_model(temperature: float = 0.3) -> BaseChatModel:
    """Return a ChatModel that automatically falls back across providers.

    The returned object walks the configured fallback chain on every call.
    On rate-limit (429) or transient (502/503) errors from the current
    provider, it transparently retries on the next provider.
    """
    return FallbackChatModel(temperature=temperature)  # type: ignore[return-value]
