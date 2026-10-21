"""The Notion specialist sub-agent: owns the Notion MCP tools exclusively."""
from langchain.agents import create_agent

from ..mcp_client import is_notion_authenticated, mcp_client, resolve_cmd
from ..models import get_chat_model

SYSTEM_PROMPT = """You are the Notion specialist on a team of AI assistants.

You have direct tool access to the user's Notion workspace: searching,
reading, and creating pages. Handle whatever Notion request you're given
using those tools.

Reply with a short, natural confirmation of what you found or did - not a
dump of raw tool output or a page URL, unless the caller specifically asks
for a link.
"""


async def build_notion_expert():
    """Discover the Notion MCP tools and assemble the specialist agent."""
    if not resolve_cmd("mcp-remote") and not resolve_cmd("npx"):
        print("[agent] notion_expert: Neither 'mcp-remote' nor 'npx' was found on system PATH.")
        return None

    if not is_notion_authenticated():
        print(
            "[agent] notion_expert: Notion is not authenticated yet.\n"
            "       To enable Notion access, run this command once in your terminal:\n"
            "       npx -y mcp-remote https://mcp.notion.com/mcp"
        )
        return None

    notion_tools = await mcp_client.get_tools(server_name="notion")
    return create_agent(get_chat_model(), tools=notion_tools, system_prompt=SYSTEM_PROMPT)
