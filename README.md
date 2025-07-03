# ENGIE - Enhanced Neural Gateway for Intelligent Execution

**A Living Task Manager Powered by Claude AI as Your Second Brain**

ENGIE is a revolutionary AI-powered desktop application that transforms traditional task management into an intelligent, adaptive productivity system. Unlike static task managers, ENGIE serves as a living, breathing second brain that learns from your patterns, anticipates your needs, and actively helps optimize your workflow through continuous AI collaboration.

## 🧠 What Makes ENGIE "Living"?

### **Continuous Learning & Adaptation**
- **Persistent Memory**: Remembers every conversation, project insight, and workflow pattern
- **Pattern Recognition**: Learns your work habits, preferences, and optimal productivity patterns
- **Contextual Awareness**: Monitors your Git repositories, file changes, and project evolution
- **Proactive Intelligence**: Suggests optimizations and identifies bottlenecks before they impact you

### **AI-Powered Task Intelligence**
- **Natural Language Processing**: Speak naturally - "I need to call mom tomorrow" becomes a properly scheduled task
- **Desire Breakdown**: Complex goals like "build a mobile app" are automatically broken into organized phases and actionable subtasks
- **Smart Orchestration**: AI determines which tools and approaches work best for each type of request
- **Dynamic Prioritization**: Tasks self-organize based on deadlines, importance, and your energy patterns

## 🎯 Core Philosophy: Your AI Productivity Partner

ENGIE isn't just software that stores tasks - it's an intelligent partner that:

1. **Thinks alongside you** to break down complex projects
2. **Learns from your patterns** to suggest better workflows  
3. **Adapts continuously** to your changing needs and priorities
4. **Proactively helps** you stay organized and focused
5. **Remembers everything** so you don't have to

## 🚀 Key Features

### **1. Intelligent Conversation Interface**
- Chat naturally with Claude AI to manage your entire productivity system
- Context-aware responses that understand your projects and history
- Streaming AI responses for real-time collaboration
- Persistent conversation memory across sessions

### **2. Living Task Management**
```
You: "Help me plan this week"
AI: *Analyzes your current tasks, deadlines, and work patterns*
    *Creates intelligent weekly schedule with energy-based prioritization*
    *Identifies potential conflicts and suggests optimizations*

You: "This project is getting overwhelming" 
AI: *Automatically breaks complex project into manageable phases*
    *Creates task hierarchy with dependencies and timelines*
    *Reschedules non-critical items to reduce cognitive load*
```

### **3. Advanced Memory System**
- **Conversation Tracking**: Every interaction builds your AI's understanding
- **Project Memory**: Builds deep knowledge of each project over time
- **Pattern Learning**: Detects your optimal workflows and productivity patterns
- **Context Retrieval**: Provides relevant historical insights for better decision-making

### **4. TaskMaster Integration (MCP Protocol)**
- Industry-standard Model Context Protocol for AI-agent communication
- Advanced task hierarchy and complexity analysis
- Research capabilities and intelligent task breakdown
- Seamless integration between AI conversation and task execution

### **5. AI-Enhanced Terminal**
- Full-featured terminal with intelligent command assistance
- Natural language command processing: "show me tasks due today"
- Live task display with real-time updates
- Dual-mode operation: AI conversation or direct commands

### **6. Proactive Intelligence Dashboard**
- Real-time productivity insights and pattern analysis
- Task completion metrics and optimization suggestions
- Energy level tracking and workload balancing
- Project complexity analysis and resource allocation

## 🛠️ Technical Architecture

### **Core Intelligence Layer**
```
src/main/
├── ai-orchestrator.ts           # Central AI intelligence hub
├── claude-ai-service.ts         # Direct Claude API integration
├── memory-system.ts             # Persistent learning and context
├── mcp-taskmaster-client.ts     # Advanced task management via MCP
└── simple-task-manager.ts       # Local fallback task system
```

### **User Interface Layer**
```
src/renderer/
├── components/
│   ├── ChatInterface.tsx        # Natural language conversation
│   ├── ENGIETerminal.tsx       # AI-enhanced terminal
│   └── TaskDashboard.tsx       # Intelligent task visualization
└── services/                   # Frontend AI integration
```

### **Integration & Monitoring**
```
src/main/
├── git-monitor.ts              # Project change detection
├── background-processor.ts     # Async AI operations
├── terminal-service.ts         # Terminal backend with AI
└── api-key-manager.ts          # Secure credential management
```

## 📋 Prerequisites

- **Node.js 18+** - JavaScript runtime
- **Anthropic API Key** - Required for Claude AI integration
- **macOS/Windows/Linux** - Cross-platform desktop support
- **Git** (optional) - For project monitoring features

## 🔧 Installation & Setup

### Quick Start
```bash
# Clone and install
git clone https://github.com/jfuginay/engie.git
cd engie
npm install

# Start development mode
npm run dev
```

### First Run Experience
1. **Launch ENGIE** - The application will guide you through setup
2. **Configure Claude AI** - Enter your Anthropic API key for full intelligence
3. **Optional APIs** - Add OpenAI, Perplexity, or Google AI for enhanced capabilities
4. **Start Conversing** - Begin talking to your AI second brain immediately

### Production Build
```bash
npm run build    # Build all components
npm run dist     # Create distributable for your platform
```

## 🎮 How to Use ENGIE

### **Getting Started with Your AI Second Brain**

#### **1. Natural Task Creation**
```
You: "I need to prepare for my job interview next week"

ENGIE: I'll help you prepare thoroughly for your interview. Let me break this down:

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

Would you like me to add specific deadlines and reminders for each phase?
```

#### **2. Intelligent Project Management**
```
You: "This mobile app project is getting complex"

ENGIE: I can see the complexity growing. Let me reorganize this into manageable phases:

🚀 Mobile App Development:
├── Phase 1: Foundation (Week 1-2)
│   ├── Define requirements and user stories
│   ├── Create wireframes and user flow
│   └── Set up development environment
├── Phase 2: Core Development (Week 3-6)
│   ├── Implement authentication system
│   ├── Build main app features
│   └── Create data persistence layer
└── Phase 3: Polish & Launch (Week 7-8)
    ├── UI/UX refinement
    ├── Testing and bug fixes
    └── App store submission

I've also identified that you work best on complex coding tasks in the morning, so I've scheduled the development work accordingly.
```

#### **3. Workflow Optimization**
```
You: "I feel overwhelmed with everything on my plate"

ENGIE: I've analyzed your current workload and patterns. Here's what I recommend:

⚡ Immediate Focus (Today):
- Complete the client presentation (high priority, due tomorrow)
- Review Sarah's code (15 min, unblocks her work)

🔄 This Week Optimization:
- I've moved 3 non-urgent tasks to next week
- Grouped similar tasks for better focus
- Scheduled your deep work during your peak energy hours (9-11 AM)

📊 Pattern Insight:
You're most productive when you have max 3 high-priority items per day. I've reorganized your tasks to match this pattern.

Would you like me to set up automatic workload balancing going forward?
```

### **Key Interaction Patterns**

#### **Natural Language Commands**
- "Show me what's due this week"
- "Help me plan tomorrow"
- "This task is taking longer than expected"
- "I'm feeling overwhelmed"
- "What should I focus on first?"

#### **Smart Terminal Integration**
```bash
# Natural language in terminal
$ help me with git commands for this project

# AI responds with contextual git workflow
# Live task updates appear in terminal sidebar
```

## 🔍 What Makes This Different from Other Task Managers?

### **Traditional Task Managers:**
- Static lists that require manual organization
- No understanding of context or priorities
- Manual project breakdown and planning
- Passive storage of information

### **ENGIE's Living Intelligence:**
- **Contextual Understanding**: Knows your projects, deadlines, and work patterns
- **Proactive Organization**: Automatically organizes and prioritizes based on your patterns
- **Intelligent Breakdown**: Complex goals become actionable plans automatically
- **Continuous Learning**: Gets better at helping you over time
- **Natural Interaction**: Conversation-based rather than form-based input

## 📊 Assignment Requirements Fulfilled

### **Core Technical Excellence**
- ✅ **Advanced Desktop Application** - Electron with modern React architecture
- ✅ **AI Integration** - Multiple AI providers with sophisticated orchestration
- ✅ **Database Systems** - SQLite for tasks, vector database for memory
- ✅ **Security Implementation** - Keychain credential storage, secure IPC
- ✅ **Real-time Processing** - Background jobs, live updates, streaming responses

### **Innovation & Advanced Features**
- ✅ **Model Context Protocol (MCP)** - Cutting-edge AI agent standard
- ✅ **Persistent AI Memory** - Learning system that improves over time
- ✅ **Natural Language Interface** - Conversation-driven task management
- ✅ **Intelligent Automation** - Proactive suggestions and optimization
- ✅ **Cross-Platform Desktop** - Native performance on all major platforms

## 🧪 Development

### **Available Commands**
```bash
npm run dev           # Development with hot reload
npm run build         # Production build
npm run dist          # Create distributable
npm run lint          # Code quality checks
npm run typecheck     # TypeScript validation
```

### **Project Architecture**
- **Frontend**: React 18 + TypeScript + Tailwind CSS
- **Backend**: Electron + Node.js + SQLite
- **AI Layer**: Claude API + MCP Protocol + Vector Memory
- **Security**: macOS Keychain + Secure IPC + CSP

## 🎓 Educational & Professional Value

This project demonstrates mastery of:

### **Advanced AI Integration**
- Multi-provider AI orchestration
- Persistent memory and learning systems
- Natural language processing workflows
- Emerging standards (MCP) implementation

### **Modern Software Architecture**
- Electron desktop application development
- React with TypeScript and modern patterns
- Secure inter-process communication
- Real-time data synchronization

### **User Experience Design**
- Conversational interface design
- Intelligent workflow optimization
- Proactive user assistance
- Accessibility and usability

### **Software Engineering Best Practices**
- TypeScript for type safety
- Modular architecture design
- Secure credential management
- Cross-platform compatibility

## 🚀 The Future of Productivity

ENGIE represents a paradigm shift from passive task storage to active productivity partnership. By combining advanced AI with intuitive design, it creates a truly intelligent second brain that:

- **Understands** your work patterns and preferences
- **Adapts** to your changing needs and priorities  
- **Learns** from every interaction to serve you better
- **Proactively** helps optimize your productivity
- **Remembers** everything so you can focus on what matters

This isn't just a better task manager - it's the beginning of truly intelligent productivity assistance that grows with you and becomes an indispensable part of your workflow.

---

**Ready to experience the future of productivity? Install ENGIE and discover what it's like to have an AI second brain that truly understands how you work.**