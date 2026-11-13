"""A web-research tool the agent can call before writing a Notion page."""
from langchain_core.tools import tool
from langchain_tavily import TavilySearch

from .. import config
from ..logging_utils import extract_text, log_stage
from ..models import get_chat_model

_search = None
_llm = None


def _get_search():
    global _search
    if _search is None:
        _search = TavilySearch(tavily_api_key=config.TAVILY_API_KEY, max_results=5)
    return _search


def _get_llm():
    global _llm
    if _llm is None:
        _llm = get_chat_model(temperature=0.3)
    return _llm


@tool
def research_topic(topic: str) -> str:
    """Research a topic on the web and return a concise markdown summary.

    Use this before creating a Notion page whenever the user asks you to
    "research", "look into", or "find out about" something. The summary
    should then be passed as the content when creating the Notion page.
    """
    log_stage("researcher -> Tavily", input=topic)
    search = _get_search()
    raw_results = search.invoke({"query": topic})
    results_text = "\n".join(
        f"- {r['title']}: {r['content']}" for r in raw_results.get("results", [])
    )
    log_stage("Tavily -> researcher", output=results_text)

    prompt = (
        "You are a research assistant. Using the raw search results below, "
        "write a concise, well-organized summary about the topic. Use short "
        "headings and bullet points. Keep it under 300 words.\n\n"
        f"Topic: {topic}\n\nRaw search results:\n{results_text}"
    )
    llm = _get_llm()
    response = llm.invoke(prompt)
    summary_text = extract_text(response.content)
    log_stage("summarize LLM -> researcher", output=summary_text)
    return summary_text
