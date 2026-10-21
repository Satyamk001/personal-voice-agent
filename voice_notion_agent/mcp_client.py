"""MCP server connections for Gmail and Notion.

Both are reached over stdio via a local Node process. Neither takes
credentials in this config - each authenticates itself using a token
cached on disk by a one-time interactive setup command:

Gmail:  npx @gongrzhe/server-gmail-autoauth-mcp auth (saved to ~/.gmail-mcp/credentials.json)
Notion: npx -y mcp-remote https://mcp.notion.com/mcp (saved to ~/.mcp-auth/)

Executable paths are resolved using shutil.which() so Windows can launch .CMD
scripts properly without throwing [WinError 2].
"""
import shutil
from pathlib import Path
from langchain_mcp_adapters.client import MultiServerMCPClient


def resolve_cmd(cmd: str) -> str | None:
    """Resolve an executable's absolute path (including .CMD on Windows)."""
    return shutil.which(cmd)


def is_notion_authenticated() -> bool:
    """Check if Notion OAuth tokens exist in ~/.mcp-auth."""
    auth_dir = Path.home() / ".mcp-auth"
    if not auth_dir.exists():
        return False
    # mcp-remote stores tokens in files ending with tokens.json or containing token
    token_files = list(auth_dir.glob("**/*token*.json"))
    return len(token_files) > 0


def is_gmail_authenticated() -> bool:
    """Check if Gmail OAuth credentials exist in ~/.gmail-mcp/credentials.json."""
    creds_file = Path.home() / ".gmail-mcp" / "credentials.json"
    return creds_file.exists()


def get_mcp_client() -> MultiServerMCPClient:
    """Assemble the MultiServerMCPClient with resolved command paths."""
    connections = {}

    # Notion stdio bridge
    notion_cmd = resolve_cmd("mcp-remote")
    if notion_cmd:
        connections["notion"] = {
            "transport": "stdio",
            "command": notion_cmd,
            "args": ["https://mcp.notion.com/mcp"],
        }
    else:
        npx_cmd = resolve_cmd("npx")
        if npx_cmd:
            connections["notion"] = {
                "transport": "stdio",
                "command": npx_cmd,
                "args": ["-y", "mcp-remote", "https://mcp.notion.com/mcp"],
            }

    # Gmail stdio server
    gmail_cmd = resolve_cmd("gmail-mcp")
    if gmail_cmd:
        connections["gmail"] = {
            "transport": "stdio",
            "command": gmail_cmd,
            "args": [],
        }
    else:
        npx_cmd = resolve_cmd("npx")
        if npx_cmd:
            connections["gmail"] = {
                "transport": "stdio",
                "command": npx_cmd,
                "args": ["-y", "@gongrzhe/server-gmail-autoauth-mcp"],
            }

    return MultiServerMCPClient(connections)


mcp_client = get_mcp_client()
