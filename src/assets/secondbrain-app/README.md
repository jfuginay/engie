# SecondBrain - AI-Powered Todo Terminal

A living, breathing AI-powered second brain with self-adjusting todo list management, built as a macOS desktop terminal application.

## Installation

1. Open the `dist/SecondBrain-1.0.0-arm64.dmg` file
2. Drag SecondBrain to your Applications folder
3. Launch SecondBrain from Applications

## Features

### 🧠 Natural Language Processing
- **Smart Task Creation**: "add meeting with sarah tomorrow at 3pm"
- **Intelligent Queries**: "show me urgent tasks" or "what's due today"
- **Task Modification**: "make task 1 high priority"

### ⚡ Self-Adjusting Intelligence
- **Auto-Priority Escalation**: Overdue tasks automatically become high priority
- **Smart Scheduling**: High-energy tasks get escalated when due tomorrow
- **Pattern Learning**: Recognizes task types and suggests optimal scheduling

### 📊 Productivity Insights
- **Real-time Analysis**: Tracks completion rates and productivity patterns
- **Smart Suggestions**: Recommends task batching and focus strategies
- **Energy Management**: Considers task energy requirements for scheduling

### 💾 Persistent Storage
- **Local File Storage**: Tasks saved to `~/.secondbrain/`
- **Session Continuity**: All tasks persist between app launches
- **Data Privacy**: Everything stays on your machine

## Usage Examples

### Basic Commands
```bash
brain ❯ help                    # Show command help
brain ❯ list                    # Show all tasks
brain ❯ status                  # Show productivity insights
brain ❯ complete 1              # Mark task #1 as complete
brain ❯ clear                   # Clear terminal
```

### Natural Language Examples
```bash
brain ❯ add call mom tomorrow
brain ❯ schedule gym session for friday morning
brain ❯ urgent: finish presentation by tonight
brain ❯ show me work tasks
brain ❯ what's due today?
brain ❯ make the presentation task high priority
brain ❯ move gym to next week
```

### AI-Powered Features
- **Smart Categorization**: Tasks automatically get tagged (work, personal, health, etc.)
- **Duration Estimation**: AI estimates how long tasks will take
- **Energy Level Assessment**: Determines if tasks require high, medium, or low energy
- **Due Date Parsing**: Understands "tomorrow", "friday", "next week", etc.

## Technical Details

### Built With
- **Electron**: Cross-platform desktop framework
- **xterm.js**: Full-featured terminal emulator
- **OpenAI GPT**: Natural language processing (optional - falls back to local processing)
- **Node.js**: Backend processing and file management

### AI Integration
- If `OPENAI_API_KEY` environment variable is set, uses GPT for advanced NLP
- Falls back to sophisticated local processing if no API key provided
- All core functionality works without internet connection

### Data Storage
- Tasks stored in JSON format at `~/.secondbrain/todos.json`
- User patterns and preferences in `~/.secondbrain/patterns.json`
- No cloud sync - your data stays private

## Self-Adjusting Features

### Automatic Priority Management
- Overdue tasks escalate to high priority
- Tomorrow's high-energy tasks get promoted
- Workload balancing suggestions

### Smart Insights
- Productivity trend analysis
- Task completion rate tracking
- Optimal scheduling recommendations
- Overwhelm prevention alerts

## Architecture

```
SecondBrain/
├── main.js              # Electron main process
├── ai-processor.js      # AI/NLP processing engine
├── renderer/
│   ├── index.html      # Terminal interface
│   ├── terminal.js     # Terminal logic & UI
│   └── style.css       # Terminal styling
└── dist/
    └── SecondBrain-1.0.0-arm64.dmg  # Installable package
```

## Development

To run from source:
```bash
npm install
npm start
```

To build DMG:
```bash
npm run build-mac
```

## Demo Script for Instructor

1. **Launch App**: Open SecondBrain from Applications
2. **Add Tasks**: Try "add presentation due friday" and "call dentist tomorrow"
3. **Query Tasks**: Use "show me urgent tasks" or "list"
4. **Modify Tasks**: "make task 1 high priority"
5. **View Insights**: Use "status" command
6. **Natural Language**: Try complex requests like "move my gym session to next week"

The app demonstrates:
- ✅ Real terminal interface with authentic feel
- ✅ AI-powered natural language processing
- ✅ Self-adjusting priority management
- ✅ Persistent local storage
- ✅ macOS native DMG packaging
- ✅ Production-ready architecture

Built in one day for Week 3 Gauntlet Project 🚀