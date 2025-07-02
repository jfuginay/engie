# ENGIE - Enhanced Neural Gateway for Intelligent Execution

An AI-powered second brain desktop application that transforms how developers manage complex projects through intelligent execution.

## 🚀 Features

- **AI-Powered Chat Interface** - Natural language interaction with Claude
- **TaskMaster Integration** - Intelligent task management with MCP protocol
- **Professional Terminal** - Full-featured terminal with AI assistance
- **Secure API Key Management** - macOS Keychain integration for credentials
- **Multi-Tab Interface** - Work with chat, terminal, and tasks simultaneously
- **Real-Time Intelligence Dashboard** - Track AI effectiveness and patterns

## 🛠️ Tech Stack

- **Frontend**: React 18 + TypeScript
- **Backend**: Electron + Node.js
- **Build System**: Vite + Electron Builder
- **Styling**: Tailwind CSS
- **AI Integration**: Claude CLI + MCP Protocol
- **Security**: macOS Keychain (keytar)

## 📋 Prerequisites

- Node.js 18+
- macOS (for Keychain integration)
- Anthropic API key (minimum requirement)

## 🔧 Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd engie
```

2. Install dependencies:
```bash
npm install
```

3. Run the development server:
```bash
npm run dev
```

## 🏗️ Building for Production

1. Build the application:
```bash
npm run build
```

2. Create distributable:
```bash
npm run dist
```

This will create a DMG installer in the `release` directory.

## 📂 Project Structure

```
src/
├── main/                      # Electron main process
│   ├── api-key-manager.ts    # Secure credential storage
│   ├── claude-cli-manager.ts # Claude CLI integration
│   ├── background-processor.ts # Background job queue
│   └── main.ts               # Main process entry
├── renderer/                  # React frontend
│   └── components/           # UI components
├── preload/                  # Electron preload scripts
└── shared/                   # Shared types and utilities
```

## 🔐 Security

- All API keys are stored in macOS Keychain
- Secure IPC communication between processes
- Content Security Policy enforced
- No plain text credential storage

## 🧪 Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run dist` - Create distributable
- `npm run lint` - Run ESLint
- `npm run typecheck` - TypeScript type checking

### First Run

On first launch, you'll be prompted to enter your API keys:
- **Anthropic** (required) - For Claude AI integration
- **OpenAI** (optional) - Alternative AI provider
- **Perplexity** (optional) - Research capabilities
- **Google** (optional) - Additional AI services

## 🎯 Keyboard Shortcuts

- `Cmd+,` - Open settings
- `Cmd+T` - New terminal tab
- `Cmd+W` - Close current tab
- `Cmd+1-8` - Switch between tabs
- `Enter` - Send message in chat
- `Shift+Enter` - New line in chat

## 📈 Performance Targets

- Startup Time: < 3 seconds
- Memory Usage: ~150MB
- UI Response: < 200ms
- AI Response: 0.5-2 seconds

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- Built with the Anthropic Claude API
- Uses the TaskMaster MCP server for task management
- Inspired by the need for AI-native development environments