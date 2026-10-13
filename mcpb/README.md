# goose-mcp (MCPB Bundle)

MCP server wrapping the goose CLI — sessions, recipes, providers, extensions

## Usage

Add to \claude_desktop_config.json\:
\\\json
{
  "mcpServers": {
    "goose-mcp": {
      "command": "uv",
      "args": ["run", "--directory", "\D:\Dev\repos", "python", "-m", "goose_mcp"],
      "env": { "PYTHONPATH": "\D:\Dev\repos/src" }
    }
  }
}
\\\

## Tools

- **goose_version**: goose_version
- **goose_session_start**: goose_session_start
- **goose_session_status**: goose_session_status
- **goose_session_list**: goose_session_list
- **goose_recipe_run**: goose_recipe_run
- **goose_providers_list**: goose_providers_list
- **goose_extensions_list**: goose_extensions_list
- **show_sessions_card**: show_sessions_card
- **show_goose_status_card**: show_goose_status_card

## Requirements

- Python 3.12+
- uv
