# ENGIE Project Brainlift Document
*A Comprehensive Knowledge Transfer & Project Overview*

---

## 🧠 What is ENGIE?

**ENGIE (Enhanced Neural Gateway for Intelligent Execution)** is an AI-powered desktop productivity application that transforms traditional task management into an intelligent, adaptive "second brain" system. It's built as an Electron desktop app that integrates Claude AI, real-time task management, and knowledge capture to create a living productivity partner.

### Core Philosophy
> *"Your AI second brain that learns from your patterns, anticipates your needs, and actively helps optimize your workflow through continuous AI collaboration."*

**Key Differentiator**: Unlike static task managers, ENGIE serves as an intelligent partner that:
- Thinks alongside you to break down complex projects
- Learns from your patterns to suggest better workflows
- Adapts continuously to your changing needs
- Proactively helps you stay organized and focused
- Remembers everything so you don't have to

---

## 🏗️ Technical Architecture Overview

### **Technology Stack**
- **Frontend**: React 19 + TypeScript + Tailwind CSS (Electron Renderer)
- **Backend**: Node.js + TypeScript (Electron Main Process)
- **AI Integration**: Claude API + MCP (Model Context Protocol)
- **Database**: SQLite (local tasks) + Vector embeddings (knowledge)
- **Task Management**: MCP TaskMaster protocol
- **Security**: macOS Keychain + Secure IPC

### **Core System Architecture**
```
┌─────────────────────────────────────────────────────────┐
│                    ENGIE Desktop App                    │
├─────────────────────────────────────────────────────────┤
│  React Frontend (Renderer Process)                     │
│  ├── ChatInterface.tsx (Natural Language UI)           │
│  ├── TaskDashboard.tsx (Intelligent Task Views)        │
│  ├── ENGIETerminal.tsx (AI-Enhanced Terminal)          │
│  └── Second Brain Components                           │
├─────────────────────────────────────────────────────────┤
│  Node.js Backend (Main Process)                        │
│  ├── ai-orchestrator.ts (Central AI Intelligence)     │
│  ├── claude-ai-service.ts (Claude API Integration)     │
│  ├── mcp-taskmaster-client.ts (Task Management)        │
│  ├── memory-system.ts (Persistent Learning)           │
│  ├── rag-system.ts (Knowledge Management)             │
│  └── git-monitor.ts (Project Change Detection)        │
├─────────────────────────────────────────────────────────┤
│  External Integrations                                 │
│  ├── Claude AI API (Anthropic)                        │
│  ├── MCP TaskMaster Server                            │
│  ├── Local Git Repositories                           │
│  └── File System Monitoring                           │
└─────────────────────────────────────────────────────────┘
```

---

## 🎯 Core Features & Capabilities

### **1. Natural Language Task Management**
- **Conversation-Driven**: Chat with Claude AI to manage your entire productivity system
- **Intelligent Breakdown**: Complex goals like "build a mobile app" automatically become organized phases and actionable subtasks
- **Smart Prioritization**: Tasks self-organize based on deadlines, importance, and energy patterns

**Example Interaction:**
```
You: "Help me plan this week"
AI: *Analyzes current tasks, deadlines, and work patterns*
    *Creates intelligent weekly schedule with energy-based prioritization*
    *Identifies potential conflicts and suggests optimizations*
```

### **2. Living Memory System**
- **Conversation Tracking**: Every interaction builds the AI's understanding of your work
- **Project Memory**: Develops deep knowledge of each project over time
- **Pattern Learning**: Detects optimal workflows and productivity patterns
- **Context Retrieval**: Provides relevant historical insights for better decisions

### **3. TaskMaster Integration (MCP Protocol)**
- **Single Source of Truth**: MCP TaskMaster serves as the authoritative task store
- **Real-time Sync**: Task sidebar updates automatically every 30 seconds
- **Intelligent Operations**: Create, update, delete, and organize tasks via natural language
- **Connection Status**: Visual indicators show MCP connection health

### **4. Second Brain Knowledge System**
- **Automatic Capture**: Extracts insights from completed tasks and project outcomes
- **Semantic Search**: Vector-based search across all captured knowledge
- **Template Generation**: Creates reusable templates from successful workflows
- **Knowledge Graphs**: Builds connections between related concepts and projects

### **5. AI-Enhanced Terminal**
- **Native Integration**: Full macOS terminal compatibility using node-pty
- **Natural Language Commands**: Process English commands like "show me tasks due today"
- **Context Awareness**: Terminal understands current project and task context
- **Live Task Display**: Real-time task updates in terminal sidebar

### **6. Git Intelligence**
- **Code Change Monitoring**: Automatically detects file changes and commits
- **Task Correlation**: Connects git commits to task completion
- **Auto-task Generation**: Creates follow-up tasks based on code changes
- **Project Context**: Maintains awareness of codebase evolution

---

## 📊 Current Development Status

### **Version History & Evolution**
- **v1.0**: Initial version with synchronization issues and mock data problems
- **v2.0**: Complete rebuild focusing on real data and incremental development
- **Current State**: Core task management working, MCP integration stable

### **What's Working (Verified)**
✅ **Basic Electron Shell**: App boots and displays correctly  
✅ **API Key Management**: Secure credential storage via macOS Keychain  
✅ **Claude AI Integration**: Chat interface with streaming responses  
✅ **MCP TaskMaster Connection**: Real-time task CRUD operations  
✅ **Task Sidebar**: Live task display with auto-refresh  
✅ **Configuration System**: Project-specific configuration files  
✅ **Terminal Integration**: Basic terminal functionality  

### **What's In Progress**
🔄 **Enhanced Task Updates**: Improved task editing and status changes  
🔄 **Knowledge Capture**: Second brain system integration  
🔄 **Git Monitoring**: Project change detection and auto-task creation  
🔄 **Advanced AI Features**: Better context understanding and suggestions  

### **What's Planned**
📋 **n8n Integration**: Automated daily task management workflows  
📋 **CLI Interface**: Natural language command-line mode  
📋 **Productivity Analytics**: Pattern analysis and optimization suggestions  
📋 **Enhanced Memory**: Deeper learning and adaptation capabilities  

---

## 🛠️ Key Technical Components

### **AI Orchestrator (`ai-orchestrator.ts`)**
- **Purpose**: Central AI intelligence hub that coordinates all AI operations
- **Key Functions**: Intent analysis, task breakdown, context injection, response generation
- **Integration**: Connects Claude AI with MCP TaskMaster and knowledge systems
- **Size**: 46KB, 1,243 lines - the brain of the application

### **MCP TaskMaster Client (`mcp-taskmaster-client.ts`)**
- **Purpose**: Interface to the Model Context Protocol task management system
- **Key Functions**: Task CRUD, real-time sync, connection management
- **Data Flow**: Single source of truth for all task data
- **Features**: Auto-refresh, connection status monitoring, batch operations

### **Memory System (`memory-system.ts`)**
- **Purpose**: Persistent learning and context management
- **Key Functions**: Pattern detection, conversation memory, project context
- **Storage**: Combines SQLite persistence with in-memory optimization
- **Learning**: Continuous adaptation to user patterns and preferences

### **RAG System (`rag-system.ts`)**
- **Purpose**: Knowledge management and semantic search
- **Key Functions**: Document indexing, vector search, insight extraction
- **Technology**: Vector embeddings for semantic similarity
- **Integration**: Feeds context to AI conversations and task suggestions

---

## 🎮 How to Use ENGIE

### **Getting Started**
1. **Installation**: `npm install` → `npm run dev`
2. **Setup**: Configure Claude AI API key on first run
3. **MCP Configuration**: Ensure TaskMaster MCP server is running
4. **Start Conversing**: Begin natural language task management immediately

### **Core Workflows**

#### **Natural Task Creation**
```
You: "I need to prepare for my job interview next week"

ENGIE: I'll help you prepare thoroughly. Let me break this down:

📋 Interview Preparation Plan:
├── Research Phase (2-3 days)
│   ├── Research the company and role
│   ├── Study common interview questions
│   └── Review your resume and achievements
├── Practice Phase (2-3 days)
│   ├── Mock interview practice
│   ├── Prepare STAR method examples
│   └── Practice technical questions
└── Final Preparation (1 day)
    ├── Choose and prepare your outfit
    ├── Plan your route and timing
    └── Review key talking points
```

#### **Project Management**
```
You: "This mobile app project is getting complex"

ENGIE: I can see the complexity growing. Let me reorganize this:

🚀 Mobile App Development:
├── Phase 1: Foundation (Week 1-2)
├── Phase 2: Core Development (Week 3-6)
└── Phase 3: Polish & Launch (Week 7-8)

I've scheduled development work during your peak energy hours (9-11 AM).
```

#### **Daily Management**
```
You: "Show me what's due this week"
ENGIE: You have 12 tasks due this week. 3 are high priority...

You: "I feel overwhelmed"
ENGIE: I've analyzed your workload. Here's my recommendation:
- Complete high-priority items first
- Moved 3 non-urgent tasks to next week
- Scheduled deep work during peak energy hours
```

---

## 🧪 Development Approach & Lessons Learned

### **Core Development Principles (v2.0)**
1. **No Mock Data Ever**: Every feature works with real data from day one
2. **Incremental Development**: Build smallest possible working pieces first
3. **Test-Driven Validation**: Each component has verifiable functionality
4. **Single Source of Truth**: One authoritative data source per domain
5. **Real-time Synchronization**: All UI components reflect actual system state

### **Critical Issues Avoided (From v1.0)**
❌ **Background Processor Spam**: Job queue calling Claude API every second  
❌ **Task Data Conflicts**: Claude memory vs. UI live data inconsistencies  
❌ **Mock Data Confidence**: Features working with fake data but failing with real data  
❌ **Multiple Auto-Refresh**: Competing timers causing API spam  
❌ **Synchronization Problems**: UI and backend showing different states  

### **Current Best Practices**
✅ **Real Data Only**: All demos use live external services  
✅ **Centralized State**: MCP TaskMaster as single source of truth  
✅ **Error Handling**: Graceful degradation when services unavailable  
✅ **Rate Limiting**: Controlled API usage with exponential backoff  
✅ **Connection Monitoring**: Visual feedback for system health  

---

## 🔧 Configuration & Setup

### **Required Dependencies**
```json
{
  "anthropic-ai/sdk": "Claude AI integration",
  "modelcontextprotocol/sdk": "MCP task management",
  "better-sqlite3": "Local data storage",
  "chromadb": "Vector embeddings",
  "node-pty": "Terminal integration",
  "keytar": "Secure credential storage"
}
```

### **Environment Setup**
```bash
# Required API Keys
ANTHROPIC_API_KEY=your_claude_api_key

# Optional Integrations
OPENAI_API_KEY=optional_for_enhanced_features
GOOGLE_AI_API_KEY=optional_for_enhanced_features
```

### **MCP Configuration**
- **Location**: `~/.cursor/mcp.json` or `.taskmaster/config.json`
- **Purpose**: Configures MCP TaskMaster server connection
- **Critical**: Required for task management functionality

---

## 🚀 Future Vision & Roadmap

### **Short-term Goals (Next 2-4 weeks)**
1. **Enhanced Task Management**: Robust task editing and bulk operations
2. **Knowledge Integration**: Full second brain system with semantic search
3. **CLI Interface**: Natural language command-line mode
4. **Git Intelligence**: Advanced project monitoring and auto-task generation

### **Medium-term Goals (1-3 months)**
1. **n8n Integration**: Automated daily task management workflows
2. **Productivity Analytics**: Pattern analysis and optimization insights
3. **Advanced Memory**: Deeper learning and user adaptation
4. **Mobile Companion**: Lightweight mobile app for task access

### **Long-term Vision (3-6 months)**
1. **Team Collaboration**: Multi-user task coordination
2. **Enterprise Features**: Organization-wide knowledge management
3. **API Platform**: Third-party integrations and extensions
4. **AI Agent Ecosystem**: Specialized AI agents for different domains

---

## 📈 Success Metrics & KPIs

### **Technical Performance**
- **API Error Rate**: < 1% of requests fail
- **UI Response Time**: < 500ms for local operations
- **Memory Usage**: < 300MB baseline
- **Task Sync Delay**: < 5 seconds for updates

### **User Experience**
- **Task Creation**: < 5 seconds from chat to UI
- **Knowledge Search**: < 1 second for semantic search
- **Terminal Response**: < 100ms for command input
- **Error Recovery**: 100% recoverable error states

### **Intelligence Metrics**
- **Desire-to-Task Conversion**: % of high-level goals successfully broken down
- **Task Completion Accuracy**: How often AI estimates match reality
- **Knowledge Relevance**: Quality of retrieved context and suggestions
- **Pattern Learning**: Improvement in recommendations over time

---

## 🎯 Key Takeaways for Developers

### **Architecture Strengths**
1. **Modular Design**: Clear separation between AI, task management, and UI layers
2. **Protocol Standards**: Uses MCP for future-proof AI agent communication
3. **Security First**: Proper credential management and secure IPC
4. **Real-time Focus**: Live data synchronization throughout the system

### **Development Best Practices**
1. **Start Small**: Build minimal working features before adding complexity
2. **Real Data Always**: Test with actual external services from day one
3. **Error Handling**: Plan for network failures and API limits
4. **User Feedback**: Provide clear status indicators and error messages

### **Integration Patterns**
1. **AI Services**: Use orchestrator pattern for multiple AI providers
2. **Data Sync**: Single source of truth with local caching
3. **Event-Driven**: IPC communication for loose coupling
4. **Progressive Enhancement**: Core features work without AI when needed

---

## 📚 Additional Resources

### **Key Documentation Files**
- `README.md`: Comprehensive project overview and setup instructions
- `COMPREHENSIVE_PRD.md`: Detailed product requirements and technical specs
- `ENGIE_TASK_FOCUSED_PRD.md`: Specific task management implementation approach
- `package.json`: Dependencies and build configuration

### **Critical Code Files**
- `src/main/ai-orchestrator.ts`: Central AI intelligence coordination
- `src/main/mcp-taskmaster-client.ts`: Task management integration
- `src/main/memory-system.ts`: Learning and adaptation system
- `src/main/rag-system.ts`: Knowledge management and search

### **External Dependencies**
- **Claude AI API**: Primary AI intelligence provider
- **MCP TaskMaster**: Task management protocol implementation
- **Electron**: Cross-platform desktop application framework
- **SQLite**: Local data persistence

---

**This brainlift document captures the essential knowledge about ENGIE as of the current development state. It serves as a comprehensive reference for understanding the project's purpose, architecture, current status, and future direction.**

---

*Generated: $(date)*  
*Project: ENGIE v2.0*  
*Status: Active Development*