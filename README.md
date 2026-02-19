# Engie

Persistent AI project manager running natively on macOS. Tracks projects, monitors Jira/GitHub, sends daily standups, and handles coding tasks with safety guardrails.

## Quick Start

```bash
# Install Bun (if not already installed)
brew install oven-sh/bun/bun

# Install the CLI globally
cd cli && bun install && bun link

# Run the setup wizard
engie init
```

The setup wizard handles everything: installing OpenClaw, configuring services, generating configs, and starting launchd services.

## Usage

```bash
# Interactive chat
engie

# One-shot query
engie "what's the status of PORT-9?"

# Service management
engie status          # health table
engie doctor          # diagnostics
engie doctor --fix    # auto-repair
engie start           # start all services
engie stop            # stop all services
```

## Architecture

Engie runs natively on macOS with three launchd services:

- **OpenClaw gateway** (port 18789) — always-on AI agent framework
- **Claude Code proxy** (port 18791) — wraps `claude` CLI for heavy-brain tasks
- **Ollama** (port 11434) — local LLM for quick tasks (llama3.2, llama3.1)

Clients connect to the gateway via WebSocket:
- **CLI TUI** — Ink-based terminal interface (`engie`)
- **Mobile app** — React Native/Expo (`engie-mobile/`)
- **Telegram** — bot integration for on-the-go
- **Slack** — workspace integration

## Project Structure

```
engie/
├── cli/                      # CLI + TUI (Bun, Ink, React)
│   ├── bin/engie.mjs         # Entry point + subcommand router
│   ├── commands/             # Subcommands (chat, init, status, doctor, start, stop)
│   ├── lib/                  # Core modules (paths, services, memory-db, profile)
│   ├── src/gateway.mjs       # WebSocket client for OpenClaw
│   └── tui/                  # Ink TUI components + hooks
├── engie-mobile/             # React Native app (Expo)
├── shared/                   # Shared constants, theme, types
├── mcp-bridge/               # Claude Code ↔ OpenClaw bridge
├── scripts/                  # Service scripts (gateway, proxy)
├── config/                   # OpenClaw config, identity, env
├── workspace/                # Skills and persistent data
├── memory/                   # Structured memory (SQLite + markdown)
└── cron/                     # Scheduled jobs
```

## Configuration

All paths resolve dynamically via `cli/lib/paths.js`. The canonical home directory is `~/.engie/` with a symlink `~/.openclaw → ~/.engie/config` for OpenClaw compatibility.

Override with `ENGIE_HOME` environment variable.

## MCP Integration

Engie bridges Claude Code with external tools via MCP:
- **Jira** — ticket tracking, sprint management
- **Slack** — channel messaging, thread replies
- **Figma** — design screenshots, metadata

## Guardrails

- Never pushes to main/master/prod
- Never deploys to production without approval
- Never modifies .env, terraform, or CI configs without approval
- Always notifies the operator of every action
- Max 5 PRs per day without explicit request
