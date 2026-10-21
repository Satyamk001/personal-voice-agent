"""The Gmail specialist sub-agent: owns the Gmail MCP tools exclusively."""
from pathlib import Path
from langchain.agents import create_agent

from ..mcp_client import is_gmail_authenticated, mcp_client
from ..models import get_chat_model

SYSTEM_PROMPT = """You are the Gmail specialist on a team of AI assistants.

You have direct tool access to the user's real Gmail inbox: reading,
searching, drafting, and sending email.

Never call the tool that actually sends an email unless the request you
were given explicitly confirms it should be sent (e.g. it says "send it",
"go ahead and send", or similar). If you're only asked to draft something,
or the request is ambiguous about whether to send, write the draft and say
it's ready to send pending confirmation - do not send it.

Reply with a short, natural confirmation of what you found or did, not a
dump of raw tool output.
"""


async def build_email_expert():
    """Discover the Gmail MCP tools and assemble the specialist agent."""
    keys_file = Path.home() / ".gmail-mcp" / "gcp-oauth.keys.json"
    if not keys_file.exists():
        print(
            "[agent] email_expert: Gmail MCP is not configured.\n"
            "       1. Place 'gcp-oauth.keys.json' in ~/.gmail-mcp/\n"
            "       2. Run 'npx @gongrzhe/server-gmail-autoauth-mcp auth' to authenticate."
        )
        return None

    if not is_gmail_authenticated():
        print(
            "[agent] email_expert: 'gcp-oauth.keys.json' found, but authentication is not completed.\n"
            "       Run 'npx @gongrzhe/server-gmail-autoauth-mcp auth' in your terminal to log in."
        )
        return None

    gmail_tools = await mcp_client.get_tools(server_name="gmail")
    return create_agent(get_chat_model(), tools=gmail_tools, system_prompt=SYSTEM_PROMPT)
