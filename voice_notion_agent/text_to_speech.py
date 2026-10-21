"""Text-to-speech using edge-tts (free Microsoft Neural TTS) or optional OpenAI."""
import asyncio
import os
import tempfile
from pathlib import Path

from . import config
from .logging_utils import log_stage


async def _synthesize_edge_tts(text: str, voice: str, out_path: str) -> None:
    import edge_tts

    communicate = edge_tts.Communicate(text, voice)
    await communicate.save(out_path)


async def synthesize_speech_async(text: str) -> str:
    """Async speech synthesis returning the path to a generated MP3 file."""
    log_stage("Orchestrator -> TTS", input=text)
    temp_dir = Path(tempfile.gettempdir())
    tmp_path = str(temp_dir / f"tts_{os.urandom(8).hex()}.mp3")

    provider = config.TTS_PROVIDER

    if provider == "openai" and config.OPENAI_API_KEY:
        from openai import OpenAI

        client = OpenAI(api_key=config.OPENAI_API_KEY)
        with client.audio.speech.with_streaming_response.create(
            model=config.TTS_MODEL,
            voice=config.TTS_VOICE,
            input=text,
        ) as response:
            response.stream_to_file(tmp_path)
    else:
        # Default: edge-tts (free, no key needed)
        voice = config.TTS_VOICE if config.TTS_VOICE.startswith("en-") else "en-US-AriaNeural"
        await _synthesize_edge_tts(text, voice, tmp_path)

    log_stage("TTS -> Speaker", output=f"<audio file: {tmp_path}>")
    return tmp_path


def synthesize_speech(text: str) -> str:
    """Synchronous wrapper for speech synthesis."""
    try:
        loop = asyncio.get_running_loop()
    except RuntimeError:
        loop = None

    if loop and loop.is_running():
        # Inside an active event loop: run in a separate thread to avoid loop conflicts
        import concurrent.futures

        with concurrent.futures.ThreadPoolExecutor(max_workers=1) as pool:
            return pool.submit(lambda: asyncio.run(synthesize_speech_async(text))).result()
    else:
        return asyncio.run(synthesize_speech_async(text))
