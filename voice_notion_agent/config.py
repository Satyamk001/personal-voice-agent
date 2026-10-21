"""Environment configuration for the voice agent.

Configured to use Google Gemini, Tavily Search, and Microsoft Edge-TTS by default,
with support for free alternatives (Groq) and OpenAI.

Gmail and Notion are reached over MCP (see mcp_client.py), and each authenticates
itself using a token cached on disk by a one-time setup command.
"""
import os

from dotenv import load_dotenv

load_dotenv()

# API Keys
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
TAVILY_API_KEY = os.getenv("TAVILY_API_KEY")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
GROQ_API_KEY = os.getenv("GROQ_API_KEY")

# Provider and model choices
LLM_PROVIDER = os.getenv("LLM_PROVIDER", "gemini").lower()
CHAT_MODEL = os.getenv("CHAT_MODEL", "gemini-3.8-flash")

STT_PROVIDER = os.getenv("STT_PROVIDER", "gemini").lower()
STT_MODEL = os.getenv("STT_MODEL", "gemini-3.8-flash")

TTS_PROVIDER = os.getenv("TTS_PROVIDER", "edge-tts").lower()
TTS_VOICE = os.getenv("TTS_VOICE", "en-US-AriaNeural")


def validate() -> None:
    """Fail fast with a clear message if required secrets are missing."""
    missing = []

    # Check LLM key requirement
    if LLM_PROVIDER == "gemini" and not GEMINI_API_KEY:
        missing.append("GEMINI_API_KEY (from https://aistudio.google.com)")
    elif LLM_PROVIDER == "groq" and not GROQ_API_KEY:
        missing.append("GROQ_API_KEY (from https://console.groq.com)")
    elif LLM_PROVIDER == "openai" and not OPENAI_API_KEY:
        missing.append("OPENAI_API_KEY (from https://platform.openai.com)")

    # Check STT key requirement
    if STT_PROVIDER == "gemini" and not GEMINI_API_KEY and not any("GEMINI_API_KEY" in m for m in missing):
        missing.append("GEMINI_API_KEY (required for Gemini STT)")
    elif STT_PROVIDER == "groq" and not GROQ_API_KEY and not any("GROQ_API_KEY" in m for m in missing):
        missing.append("GROQ_API_KEY (required for Groq Whisper STT)")
    elif STT_PROVIDER == "openai" and not OPENAI_API_KEY and not any("OPENAI_API_KEY" in m for m in missing):
        missing.append("OPENAI_API_KEY (required for OpenAI Whisper STT)")

    # Check TTS key requirement if using OpenAI
    if TTS_PROVIDER == "openai" and not OPENAI_API_KEY and not any("OPENAI_API_KEY" in m for m in missing):
        missing.append("OPENAI_API_KEY (required for OpenAI TTS)")

    # Tavily is used by the researcher tool
    if not TAVILY_API_KEY:
        missing.append("TAVILY_API_KEY (from https://app.tavily.com)")

    if missing:
        raise RuntimeError(
            f"Missing required environment variables:\n  - "
            + "\n  - ".join(missing)
            + "\nCopy .env.example to .env and fill them in."
        )
