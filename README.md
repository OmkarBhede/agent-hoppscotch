# agent-hoppscotch

CLI for AI agents to interact with Hoppscotch GraphQL API. Manage teams, collections, requests, and environments from the command line.

## AI Coding Assistants

Add the skill to your AI coding assistant for richer context:

```bash
npx skills add OmkarBhede/agent-hoppscotch
```

This works with Claude Code, Codex, Cursor, Gemini CLI, GitHub Copilot, Goose, OpenCode, and Windsurf.

## Installation

```bash
# Global installation
npm install -g agent-hoppscotch

# Or use with npx
npx agent-hoppscotch --help
```

## Quick Start

```bash
# Setup (one-time)
agent-hoppscotch auth set-endpoint "http://your-hoppscotch-instance/graphql"
agent-hoppscotch auth set-cookie "<cookie_from_browser>"

# Set defaults (optional)
agent-hoppscotch auth set-default --team <teamId> --collection <collectionId>

# Start using
agent-hoppscotch team list
agent-hoppscotch collection list --team <id>
agent-hoppscotch request create --title "My API" --method POST --url "{{BASE_URL}}/api/users"
```

## Commands

### Authentication
```bash
agent-hoppscotch auth set-cookie "<cookie>"     # Store session cookie
agent-hoppscotch auth set-endpoint "<url>"      # Store GraphQL endpoint
agent-hoppscotch auth set-default --team <id>   # Set default team
agent-hoppscotch auth status                    # Show configuration
agent-hoppscotch auth clear                     # Remove credentials
```

### Teams
```bash
agent-hoppscotch team list                      # List all teams
agent-hoppscotch team find "<term>"             # Search by name
agent-hoppscotch team get <teamId>              # Get details
```

### Collections
```bash
agent-hoppscotch collection list --team <id>    # List root collections
agent-hoppscotch collection list --parent <id>  # List child collections
agent-hoppscotch collection find "<term>" --team <id>
agent-hoppscotch collection get <id>
agent-hoppscotch collection create --team <id> --title "Auth APIs"
agent-hoppscotch collection create --parent <id> --title "Login"
agent-hoppscotch collection delete <id>
agent-hoppscotch collection export --team <id>
```

### Requests
```bash
agent-hoppscotch request list --collection <id>
agent-hoppscotch request find "<term>" --team <id>
agent-hoppscotch request get <id>

# Create request
agent-hoppscotch request create \
  --collection <id> --team <id> \
  --title "Create User" \
  --method POST \
  --url "{{BASE_URL}}/api/users" \
  --headers '[{"key":"Content-Type","value":"application/json","active":true}]' \
  --body '{"name":"John","email":"john@example.com"}' \
  --auth-type bearer \
  --auth-token "{{API_TOKEN}}"

# Update request
agent-hoppscotch request update <id> --title "New Title" --method PUT

# Delete/Move
agent-hoppscotch request delete <id>
agent-hoppscotch request move <id> --to <collectionId>
```

### Environments
```bash
agent-hoppscotch env list --team <id>
agent-hoppscotch env get <id> --team <id>
agent-hoppscotch env create --team <id> --name "Development" \
  --variables '[{"key":"BASE_URL","value":"http://localhost:8080"}]'
agent-hoppscotch env update <id> --team <id> --variables '<json>'
agent-hoppscotch env delete <id>
```

## Global Flags

| Flag | Description |
|------|-------------|
| `--json` | Output as JSON (for parsing) |
| `--verbose` | Show raw GraphQL queries/responses |
| `--cookie <str>` | Override stored cookie |
| `--endpoint <url>` | Override stored endpoint |

## Configuration

Credentials are stored in `~/.hoppscotch/`:
- `auth.json` - Cookie and endpoint
- `defaults.json` - Default team/collection IDs

## Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Success |
| 1 | General error |
| 2 | Authentication error |
| 3 | Not found |
| 4 | Validation error |

## Getting Your Cookie

1. Log into your Hoppscotch instance in your browser
2. Open DevTools (F12) → Application → Cookies
3. Copy the cookie string containing `connect.sid`, `access_token`, and `refresh_token`

**Example cookie format:**
```
connect.sid=s%3ATu1_ApriD6v5EvbUe64j8SYWU8XDm31k.5KTQZL28tskTc3mJV3hn4CnMhS1HZBq9VAah4YorJLE; access_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJodHRwOi8vaG9wcHNjb3RjaC5sb2NhbDozMDAwIiwic3ViIjoiY21reXp0bnRyMDAwMDB0bzFkMTQ1OWJsMSIsImF1ZCI6WyJodHRwOi8vaG9wcHNjb3RjaC5sb2NhbDozMDAwIl0sImlhdCI6MTc2OTY2NDk2NSwiZXhwIjoxNzc4MzA0OTY1fQ.az2nOwCCgIBDrgISIPYRgF4rhvrJevKlGvpz_yPvAlQ; refresh_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJodHRwOi8vaG9wcHNjb3RjaC5sb2NhbDozMDAwIiwic3ViIjoiY21reXp0bnRyMDAwMDB0bzFkMTQ1OWJsMSIsImF1ZCI6WyJodHRwOi8vaG9wcHNjb3RjaC5sb2NhbDozMDAwIl0sImlhdCI6MTc2OTY2NDk2NSwiZXhwIjoxODMwMTQ0OTY1fQ.XXv3mtI1zwYUGaNHo7T6bNt3D5UJUmnmTJAl3uyZ1MA
```

## Use with AI Agents

This CLI is designed for AI coding assistants like Claude Code. Instead of loading verbose GraphQL documentation, agents can use simple CLI commands:

```bash
# Before: ~2,500 tokens to load GraphQL docs
# After: ~100 tokens per command

agent-hoppscotch request create --title "Login" --method POST --url "{{BASE_URL}}/auth/login"
```

## License

MIT
