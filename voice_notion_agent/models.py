"""Model initialization for agents and tools."""
from langchain_core.language_models.chat_models import BaseChatModel

from . import config


def get_chat_model(temperature: float = 0.3) -> BaseChatModel:
    """Return an initialized ChatModel based on LLM_PROVIDER."""
    provider = config.LLM_PROVIDER
    if provider == "gemini":
        from langchain_google_genai import ChatGoogleGenerativeAI

        return ChatGoogleGenerativeAI(
            model=config.CHAT_MODEL,
            google_api_key=config.GEMINI_API_KEY,
            temperature=temperature,
        )
    elif provider == "groq":
        from langchain_groq import ChatGroq

        return ChatGroq(
            model=config.CHAT_MODEL,
            groq_api_key=config.GROQ_API_KEY,
            temperature=temperature,
        )
    elif provider == "openai":
        from langchain_openai import ChatOpenAI

        return ChatOpenAI(
            model=config.CHAT_MODEL,
            api_key=config.OPENAI_API_KEY,
            temperature=temperature,
        )
    else:
        raise ValueError(
            f"Unsupported LLM_PROVIDER: {config.LLM_PROVIDER}. Supported options: gemini, groq, openai."
        )
