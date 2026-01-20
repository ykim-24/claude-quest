# Claude Quest

A desktop application for managing Claude CLI conversations with a quest-based interface.

## Features

- **Quest Management** - Organize conversations by working directory
- **Skills** - Customize Claude's behavior with reusable system prompts
- **Integrations** - Connect MCP servers or API keys per conversation
- **Custom Commands** - Create slash commands for frequent prompts
- **Terminal** - Built-in terminal for running CLI commands
- **Token Tracking** - Monitor usage per conversation and total

## Requirements

- [Claude CLI](https://docs.anthropic.com/en/docs/claude-code) installed and authenticated
- Node.js 18+
- Rust (for Tauri)

## Development

```bash
# Install dependencies
npm install

# Run in development mode
npm run tauri dev

# Build for production
npm run tauri build
```

## Tech Stack

- Tauri (Rust backend)
- React + TypeScript
- Zustand (state management)
- Tailwind CSS

## Notes

- API key integrations use Node.js fetch instead of curl due to Claude CLI permission restrictions
- Skills and integrations are equipped per conversation, not globally

## License

MIT
