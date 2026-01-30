---
name: agent-hoppscotch
description: CLI tool for managing Hoppscotch API documentation. Use when user asks to document API, add API to Hoppscotch, update API docs, or manage API collections.
allowed-tools: Bash(agent-hoppscotch:*)
---

# agent-hoppscotch CLI

CLI for AI agents to interact with Hoppscotch GraphQL API.

## Installation

```bash
cd agent-hoppscotch && npm install
# For global access:
npm link
```

## Quick Start

```bash
# Setup (one-time)
agent-hoppscotch auth set-endpoint "http://hoppscotch.local:3170/graphql"
agent-hoppscotch auth set-cookie "<cookie_from_browser>"
agent-hoppscotch auth set-default --team <teamId> --collection <collectionId>

# Basic workflow
agent-hoppscotch team list
agent-hoppscotch collection list --team <id>
agent-hoppscotch request create --title "..." --method POST --url "..."
```

## Commands

### Auth
```bash
agent-hoppscotch auth set-cookie "<cookie>"    # Store session cookie
agent-hoppscotch auth set-endpoint "<url>"     # Store GraphQL endpoint
agent-hoppscotch auth set-default --team <id> --collection <id>  # Set defaults
agent-hoppscotch auth status                   # Show configuration
agent-hoppscotch auth clear                    # Remove credentials
```

### Team
```bash
agent-hoppscotch team list                     # List all teams
agent-hoppscotch team find "<term>"            # Search by name
agent-hoppscotch team get <teamId>             # Get details
```

### Collection
```bash
agent-hoppscotch collection list --team <id>   # List root collections
agent-hoppscotch collection list --parent <id> # List child collections
agent-hoppscotch collection find "<term>" --team <id>  # Search by title
agent-hoppscotch collection get <id>           # Get details
agent-hoppscotch collection create --team <id> --title "..."  # Create root
agent-hoppscotch collection create --parent <id> --title "..." # Create child
agent-hoppscotch collection delete <id>        # Delete
agent-hoppscotch collection export --team <id> # Export as JSON
```

### Request
```bash
agent-hoppscotch request list --collection <id>  # List requests
agent-hoppscotch request find "<term>" --team <id>  # Search by title
agent-hoppscotch request get <id>              # Get details
agent-hoppscotch request create \
  --collection <id> --team <id> \
  --title "..." --method POST --url "..." \
  [--headers '<json>'] [--body '<json>'] \
  [--auth-type bearer] [--auth-token "..."]
agent-hoppscotch request update <id> [--title "..."] [--method ...] [--url "..."]
agent-hoppscotch request delete <id>           # Delete
agent-hoppscotch request move <id> --to <collectionId>  # Move
```

### Environment
```bash
agent-hoppscotch env list --team <id>          # List environments
agent-hoppscotch env get <id> --team <id>      # Get details
agent-hoppscotch env create --team <id> --name "..." --variables '<json>'
agent-hoppscotch env update <id> --team <id> [--name "..."] [--variables '<json>']
agent-hoppscotch env delete <id>               # Delete
```

## Global Flags

| Flag | Description |
|------|-------------|
| `--json` | Output as JSON (for parsing) |
| `--verbose` | Show raw GraphQL queries/responses |
| `--cookie <str>` | Override stored cookie |
| `--endpoint <url>` | Override stored endpoint |

## Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Success |
| 1 | General error |
| 2 | Authentication error |
| 3 | Not found |
| 4 | Validation error (missing args) |

## Help

```bash
agent-hoppscotch --help
agent-hoppscotch <command> --help
agent-hoppscotch <command> <subcommand> --help
```

## Package Specification

See [PACKAGE_SPEC.md](PACKAGE_SPEC.md) for full implementation details.
