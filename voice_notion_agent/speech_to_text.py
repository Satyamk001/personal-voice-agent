"""Speech-to-text via Google Gemini multimodal audio, free Groq Whisper, or OpenAI."""
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


def _transcribe_with_gemini(file_path: str) -> str:
    from google import genai
    from google.genai import types

    client = genai.Client(api_key=config.GEMINI_API_KEY)
    mime_type = _get_audio_mime_type(file_path)

    with open(file_path, "rb") as f:
        audio_data = f.read()

    response = client.models.generate_content(
        model=config.STT_MODEL if config.STT_MODEL.startswith("gemini") else "gemini-3.8-flash",
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


def transcribe_audio(file_path: str) -> str:
    """Transcribe a local audio file to text using the configured provider."""
    provider = config.STT_PROVIDER
    log_stage(f"Mic -> STT ({provider})", input=f"<audio file: {file_path}>")

    if provider == "gemini":
        text = _transcribe_with_gemini(file_path)
    elif provider == "groq":
        text = _transcribe_with_groq(file_path)
    elif provider == "openai":
        text = _transcribe_with_openai(file_path)
    else:
        raise ValueError(
            f"Unsupported STT_PROVIDER: {provider}. Supported options: gemini, groq, openai."
        )

    log_stage("STT -> Orchestrator", output=text)
    return text
