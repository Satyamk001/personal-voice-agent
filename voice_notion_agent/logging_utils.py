"""A tiny helper for consistent, truncated stage-handoff logging and message formatting.

Every stage boundary in the pipeline (STT -> Orchestrator -> specialist ->
TTS) prints one line showing what went in and/or what came out, truncated
so a long transcript or page of research doesn't flood the console.
"""
from typing import Any

_MAX_LEN = 160


def extract_text(content: Any) -> str:
    """Extract plain text string from message content.

    Gemini models in langchain-google-genai return content as:
    - a plain string: 'Hello!'
    - a list of parts: [{'type': 'text', 'text': 'Hello!', 'extras': {...}}]
    """
    if not content:
        return ""
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        texts = []
        for part in content:
            if isinstance(part, str):
                texts.append(part)
            elif isinstance(part, dict):
                if part.get("type") == "text" and "text" in part:
                    texts.append(part["text"])
                elif "text" in part:
                    texts.append(part["text"])
            elif hasattr(part, "text"):
                texts.append(str(part.text))
        return "".join(texts)
    if isinstance(content, dict):
        return str(content.get("text", content))
    return str(content)


def truncate(text: str, max_len: int = _MAX_LEN) -> str:
    """Collapse newlines and cut long text down to a single readable line."""
    text = " ".join(text.split())
    return text if len(text) <= max_len else text[: max_len - 1] + "…"


def log_stage(stage: str, **fields: str) -> None:
    """Print one truncated log line for a pipeline stage handoff."""
    parts = " ".join(f"{name}={truncate(str(value))!r}" for name, value in fields.items())
    print(f"[{stage}] {parts}")
