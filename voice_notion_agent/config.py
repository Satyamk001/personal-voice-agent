"""Environment configuration for the voice agent.

Provider priority with automatic fallback:
  LLM:  groq  →  openrouter  →  gemini
  STT:  groq  →  gemini

Configured to use Groq as the primary LLM + STT provider (fast inference,
generous free tier), OpenRouter as the first fallback (huge model catalog,
high rate limits), and Gemini as the last resort.

TTS stays on edge-tts (free Microsoft Neural TTS, no key needed).

Gmail and Notion are reached over MCP (see mcp_client.py), and each
authenticates itself using a token cached on disk by a one-time setup command.
"""
import os

from dotenv import load_dotenv

load_dotenv()

# ── API Keys ──────────────────────────────────────────────────────────
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
TAVILY_API_KEY = os.getenv("TAVILY_API_KEY")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")

# ── Provider and model choices ────────────────────────────────────────
# Primary provider; fallback chain is resolved at runtime in models.py
LLM_PROVIDER = os.getenv("LLM_PROVIDER", "groq").lower()
CHAT_MODEL = os.getenv("CHAT_MODEL", "")  # empty = auto-select per provider

# Per-provider default models (used when CHAT_MODEL is empty or doesn't
# match the active provider)
GROQ_CHAT_MODEL = os.getenv("GROQ_CHAT_MODEL", "openai/gpt-oss-120b")
OPENROUTER_CHAT_MODEL = os.getenv("OPENROUTER_CHAT_MODEL", "google/gemini-2.5-flash")
GEMINI_CHAT_MODEL = os.getenv("GEMINI_CHAT_MODEL", "gemini-3.8-flash")

# LLM fallback chain: comma-separated provider names tried in order if the
# primary provider's call fails with a rate-limit or transient error.
LLM_FALLBACK_CHAIN = os.getenv("LLM_FALLBACK_CHAIN", "groq,openrouter,gemini")

STT_PROVIDER = os.getenv("STT_PROVIDER", "groq").lower()
STT_MODEL = os.getenv("STT_MODEL", "whisper-large-v3-turbo")

TTS_PROVIDER = os.getenv("TTS_PROVIDER", "edge-tts").lower()
TTS_VOICE = os.getenv("TTS_VOICE", "en-US-AriaNeural")

# ── Fallback chain: comma-separated provider names for STT ────────────
STT_FALLBACK_CHAIN = os.getenv("STT_FALLBACK_CHAIN", "groq,gemini")


def _default_model_for_provider(provider: str) -> str:
    """Return the default chat model for a given provider."""
    defaults = {
        "groq": GROQ_CHAT_MODEL,
        "openrouter": OPENROUTER_CHAT_MODEL,
        "gemini": GEMINI_CHAT_MODEL,
        "openai": "gpt-4o-mini",
    }
    return defaults.get(provider, "")


def _key_for_provider(provider: str) -> str | None:
    """Return the API key configured for a provider, or None."""
    keys = {
        "groq": GROQ_API_KEY,
        "openrouter": OPENROUTER_API_KEY,
        "gemini": GEMINI_API_KEY,
        "openai": OPENAI_API_KEY,
    }
    return keys.get(provider)


def get_llm_fallback_chain() -> list[str]:
    """Return the ordered list of LLM providers to try."""
    chain = [p.strip() for p in LLM_FALLBACK_CHAIN.split(",") if p.strip()]
    # Only keep providers that have a key configured
    return [p for p in chain if _key_for_provider(p)]


def get_stt_fallback_chain() -> list[str]:
    """Return the ordered list of STT providers to try."""
    chain = [p.strip() for p in STT_FALLBACK_CHAIN.split(",") if p.strip()]
    return [p for p in chain if _key_for_provider(p)]


def validate() -> None:
    """Fail fast with a clear message if no usable provider is configured."""
    errors = []

    # At least one LLM provider must have a key
    llm_chain = get_llm_fallback_chain()
    if not llm_chain:
        errors.append(
            "No LLM provider has an API key set. Configure at least one of:\n"
            "  GROQ_API_KEY, OPENROUTER_API_KEY, GEMINI_API_KEY, or OPENAI_API_KEY"
        )
    else:
        print(f"[config] LLM fallback chain: {' → '.join(llm_chain)}")

    # At least one STT provider must have a key
    stt_chain = get_stt_fallback_chain()
    if not stt_chain:
        errors.append(
            "No STT provider has an API key set. Configure at least one of:\n"
            "  GROQ_API_KEY, GEMINI_API_KEY, or OPENAI_API_KEY"
        )
    else:
        print(f"[config] STT fallback chain: {' → '.join(stt_chain)}")

    # Tavily is used by the researcher tool
    if not TAVILY_API_KEY:
        errors.append("TAVILY_API_KEY (from https://app.tavily.com)")

    if errors:
        raise RuntimeError(
            "Configuration errors:\n  - " + "\n  - ".join(errors)
            + "\nCopy .env.example to .env and fill them in."
        )
