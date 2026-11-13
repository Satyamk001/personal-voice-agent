"""Speech-to-text with automatic provider fallback.

Fallback chain (configurable via STT_FALLBACK_CHAIN env var):
  groq (Whisper)  →  gemini (multimodal audio)

On rate-limit or transient errors the next provider is tried transparently.
"""
import os
from pathlib import Path

from . import config
from .logging_utils import log_stage

_EXT_TO_MIME = {
    ".webm": "audio/webm",
    ".ogg": "audio/ogg",
    ".mp4": "audio/mp4",
    ".m4a": "audio/mp4",
    ".mp3": "audio/mp3",
    ".wav": "audio/wav",
}


def _get_audio_mime_type(file_path: str) -> str:
    suffix = Path(file_path).suffix.lower()
    return _EXT_TO_MIME.get(suffix, "audio/webm")


# ── Individual provider implementations ──────────────────────────────

def _transcribe_with_gemini(file_path: str) -> str:
    from google import genai
    from google.genai import types

    client = genai.Client(api_key=config.GEMINI_API_KEY)
    mime_type = _get_audio_mime_type(file_path)

    with open(file_path, "rb") as f:
        audio_data = f.read()

    response = client.models.generate_content(
        model=config.GEMINI_CHAT_MODEL if config.GEMINI_CHAT_MODEL.startswith("gemini") else "gemini-3.8-flash",
        contents=[
            types.Part.from_bytes(data=audio_data, mime_type=mime_type),
            (
                "Please transcribe this spoken audio recording accurately and verbatim. "
                "Return ONLY the exact transcribed text. "
                "If there is no speech, only silence, or background noise, return an empty string."
            ),
        ],
    )
    return response.text.strip() if response.text else ""


def _transcribe_with_groq(file_path: str) -> str:
    from openai import OpenAI

    client = OpenAI(base_url="https://api.groq.com/openai/v1", api_key=config.GROQ_API_KEY)
    model = config.STT_MODEL if config.STT_MODEL.startswith("whisper") else "whisper-large-v3-turbo"
    with open(file_path, "rb") as audio_file:
        transcript = client.audio.transcriptions.create(
            model=model,
            file=audio_file,
        )
    return transcript.text.strip() if transcript.text else ""


def _transcribe_with_openai(file_path: str) -> str:
    from openai import OpenAI

    client = OpenAI(api_key=config.OPENAI_API_KEY)
    model = config.STT_MODEL if config.STT_MODEL.startswith("whisper") else "whisper-1"
    with open(file_path, "rb") as audio_file:
        transcript = client.audio.transcriptions.create(
            model=model,
            file=audio_file,
        )
    return transcript.text.strip() if transcript.text else ""


_STT_PROVIDERS = {
    "groq": _transcribe_with_groq,
    "gemini": _transcribe_with_gemini,
    "openai": _transcribe_with_openai,
}


def _is_rate_limit_or_transient(exc: Exception) -> bool:
    """Return True if the exception looks like a rate-limit or transient error."""
    msg = str(exc).lower()
    signals = [
        "429", "rate_limit", "rate limit", "ratelimit",
        "quota", "resource_exhausted", "too many requests",
        "503", "502", "service unavailable", "overloaded",
    ]
    return any(s in msg for s in signals)


def transcribe_audio(file_path: str) -> str:
    """Transcribe a local audio file, walking the STT fallback chain.

    Tries each configured STT provider in order; on rate-limit or transient
    errors, moves to the next. Non-rate-limit errors are raised immediately.
    """
    chain = config.get_stt_fallback_chain()
    if not chain:
        raise RuntimeError("No STT provider has an API key configured.")

    log_stage(f"Mic -> STT (chain: {' → '.join(chain)})", input=f"<audio file: {file_path}>")

    last_exc: Exception | None = None
    for provider in chain:
        transcribe_fn = _STT_PROVIDERS.get(provider)
        if not transcribe_fn:
            log_stage("STT skip", provider=provider, error="Unknown provider")
            continue

        try:
            log_stage(f"STT trying", provider=provider)
            text = transcribe_fn(file_path)
            log_stage(f"STT success ({provider})", output=text)
            return text
        except Exception as exc:
            last_exc = exc
            if _is_rate_limit_or_transient(exc):
                log_stage(
                    "STT fallback",
                    provider=provider,
                    error=f"Rate-limited / transient ({type(exc).__name__}), trying next...",
                )
                continue
            # Non-transient error: propagate
            raise

    # All providers exhausted
    raise last_exc  # type: ignore[misc]
