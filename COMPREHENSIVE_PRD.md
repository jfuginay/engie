# ENGIE v2.0 - Comprehensive Product Requirements Document

## Executive Summary

ENGIE is an AI-powered development assistant built on Electron that integrates Claude AI, MCP (Model Context Protocol) task management, and intelligent project analysis. This PRD outlines a complete rebuild emphasizing **incremental development, real data validation, and systematic testing** to avoid the synchronization and mock data issues encountered in v1.0.

## Development Philosophy

### 🎯 Core Principles
1. **No Mock Data Ever** - Every feature must work with real data from day one
2. **Incremental Development** - Build smallest possible working pieces first
3. **Test-Driven Validation** - Each component must have verifiable functionality
4. **Single Source of Truth** - One authoritative data source per domain
5. **Real-time Synchronization** - All UI components reflect actual system state

### 🚫 Anti-Patterns to Avoid
- Mock functions that create false confidence
- Building entire features before testing individual pieces
- Multiple data sources for the same information
- Background processes that spam APIs
- Conversation memory conflicts with live data
- Complex state management without validation

## Technical Architecture

### Core Stack
- **Frontend**: React + TypeScript (Electron Renderer)
- **Backend**: Node.js + TypeScript (Electron Main)
- **AI Integration**: Claude API + MCP Protocol
- **Task Management**: MCP TaskMaster Client with real-time sync
- **Knowledge Management**: Second Brain System with vector embeddings
- **Terminal**: Real macOS terminal integration (node-pty + xterm.js)
- **Data Storage**: SQLite for knowledge + in-memory with MCP sync
- **Communication**: Electron IPC with explicit contracts

### Data Flow Architecture
```
User Input → React Component → IPC Call → Main Process → External Service → Response Chain → UI Update
```

**Critical Rule**: Every step must be independently testable with real data.

## Feature Development Roadmap

### Phase 1: Foundation (hours 1-2)
**Motto: "Make one thing work perfectly before adding anything else"**

#### 1.1 Basic Electron Shell ✅
- [x] Electron app boots and shows window
- [x] IPC communication working
- [x] Basic React app renders

#### 1.2 API Key Management ✅
- [x] Secure storage of API keys
- [x] First-run setup flow
- [x] Settings management

#### 1.3 Single Task CRUD (Start Here for v2.0)
**Build Order:**
1. **Create one task** - Real task creation with MCP
   - Test: Task appears in MCP system
   - Test: Task has valid ID, title, status
2. **Display one task** - Read from MCP and show in UI
   - Test: UI shows exact MCP data
   - Test: Refresh shows updated data
3. **Update one task** - Status change functionality
   - Test: Status change persists in MCP
   - Test: UI reflects change immediately
4. **Delete one task** - Remove from MCP system
   - Test: Task disappears from MCP
   - Test: UI updates to empty state

**Success Criteria**: One task works perfectly across all operations with zero mock data.

### Phase 2: Task Management Core (hours 3-4)

#### 2.1 Multiple Task Display
**Build Order:**
1. **List 2-3 real tasks** - Expand display logic
   - Test: All tasks from MCP appear
   - Test: Task order is consistent
2. **Task filtering** - Status-based filtering
   - Test: Filter shows correct subset
   - Test: Filter state persists
3. **Task priority display** - Visual priority indicators
   - Test: Priority colors match data
   - Test: Priority sorting works

#### 2.2 Live Task Sidebar
**Build Order:**
1. **Real-time task display** - Sidebar shows current MCP tasks
   - Test: Sidebar updates immediately on task changes
   - Test: No manual refresh needed
   - Test: Task count is always accurate
2. **Live status updates** - Task status changes reflect instantly
   - Test: Status changes appear within 1 second
   - Test: Multiple UI components stay in sync
   - Test: External MCP changes update sidebar
3. **Auto-refresh mechanism** - Background sync without API spam
   - Test: Polling interval is reasonable (5-10 seconds)
   - Test: Only syncs when data actually changed
   - Test: No duplicate API calls

### Phase 3: AI Integration (hours 5-6)

#### 3.1 Claude Chat Basic
**Build Order:**
1. **Single message/response** - One Claude API call
   - Test: Message reaches Claude API
   - Test: Response appears in UI
   - Test: API errors handled gracefully
2. **Task context injection** - Claude sees current tasks
   - Test: Claude mentions actual task names
   - Test: Claude responses use real task data only
3. **Chat history** - Conversation persistence
   - Test: History survives page refresh
   - Test: History doesn't conflict with task data

#### 3.2 Task-Aware AI
**Build Order:**
1. **Task creation via chat** - "Create task X"
   - Test: Task appears in MCP system
   - Test: Task appears in UI immediately
2. **Task updates via chat** - "Mark task X as done"
   - Test: Status changes in MCP
   - Test: UI reflects change
3. **Task queries** - "What tasks do I have?"
   - Test: Claude lists exact MCP tasks
   - Test: No phantom tasks from memory

### Phase 4: Second Brain System (hours 7-8)

#### 4.1 Knowledge Capture
**Build Order:**
1. **Single note creation** - Create and store one note
   - Test: Note persists in SQLite database
   - Test: Note appears in UI immediately
   - Test: Note has unique ID and timestamp
2. **Note display** - Show stored notes
   - Test: UI shows exact database content
   - Test: Notes appear in chronological order
3. **Note search** - Basic text search
   - Test: Search finds exact text matches
   - Test: Search results are accurate
4. **Note tagging** - Basic categorization
   - Test: Tags persist with notes
   - Test: Tag filtering works correctly

#### 4.2 Knowledge Connections
**Build Order:**
1. **Note linking** - Connect related notes
   - Test: Links create bidirectional connections
   - Test: Linked notes display relationships
2. **Auto-suggestions** - AI suggests connections
   - Test: Suggestions based on content similarity
   - Test: User can accept/reject suggestions
3. **Knowledge graph** - Visual representation
   - Test: Graph shows actual note connections
   - Test: Graph updates with new connections

#### 4.3 AI-Enhanced Knowledge
**Build Order:**
1. **Content summarization** - AI summarizes long notes
   - Test: Summaries capture key points
   - Test: Original content preserved
2. **Question answering** - Ask questions about knowledge base
   - Test: Answers reference actual stored content
   - Test: Sources are cited accurately
3. **Knowledge insights** - AI identifies patterns
   - Test: Insights based on real data only
   - Test: Patterns are verifiable

### Phase 5: Advanced Features (hours 9-10)

#### 5.1 Project Intelligence
**Build Order:**
1. **File scanning** - Index project files
   - Test: Finds all code files
   - Test: Ignores node_modules correctly
2. **Code context** - Claude understands codebase
   - Test: Claude references actual files
   - Test: Code suggestions are relevant
3. **Smart task suggestions** - AI suggests relevant tasks
   - Test: Suggestions based on real code changes
   - Test: Suggestions can be accepted/rejected

#### 5.2 Real Terminal Integration
**Build Order:**
1. **Native macOS terminal** - Full terminal compatibility using node-pty
   - Test: All bash/zsh commands work exactly as in Terminal.app
   - Test: Environment variables are inherited correctly
   - Test: Path resolution matches system terminal
   - Test: Interactive commands (vim, nano, top) work properly
2. **Terminal state persistence** - Each terminal maintains full session
   - Test: Working directory persists between commands
   - Test: History is maintained per terminal
   - Test: Background processes continue running
   - Test: Terminal survives app minimize/restore
3. **Multiple terminal tabs** - iTerm-like tab management
   - Test: Each tab has independent session
   - Test: Tab switching preserves terminal state
   - Test: New tabs inherit current working directory
   - Test: Terminal processes continue in background tabs
4. **Chat-to-terminal workflow** - Seamless command execution
   - Test: Commands suggested by Claude can be sent to terminal
   - Test: User can edit commands before execution
   - Test: Terminal output is captured and can be referenced in chat
   - Test: Long-running commands don't block the UI

## Data Architecture

### Single Source of Truth Rules

#### Tasks (Live Sidebar)
- **Authoritative Source**: MCP TaskMaster system
- **Local Cache**: In-memory with sync timestamps and change detection
- **UI State**: Always derived from cache, never independent
- **Real-time Updates**: Sidebar polls MCP every 5 seconds for changes
- **Change Detection**: Only update UI when task data actually changed
- **Conflict Resolution**: MCP wins, local changes re-applied
- **Performance Rule**: Sidebar updates must not cause API spam

#### Knowledge Base (Second Brain)
- **Authoritative Source**: SQLite database per project
- **Vector Storage**: Local embeddings for semantic search
- **Backup Strategy**: Export to markdown files
- **Sync Rules**: SQLite writes are atomic and immediate

#### Chat History
- **Authoritative Source**: Local storage per project
- **Context Injection**: Real-time task + knowledge data
- **Memory Management**: Clear separation of persistent vs ephemeral

#### Project Context
- **Authoritative Source**: File system + git
- **Cache Strategy**: Incremental updates only
- **Invalidation**: File watcher triggers refresh

### API Rate Limiting
- **Claude API**: Maximum 1 request per 2 seconds
- **MCP Operations**: Batch when possible, max 1 sync per 5 seconds
- **Task Sidebar Sync**: Every 5 seconds, only if data changed
- **Embedding Generation**: Batch process, max 10/minute
- **Knowledge Search**: Local only, no API calls
- **Terminal Operations**: No rate limiting (local processes)
- **Background Tasks**: Disabled until explicitly needed
- **Retry Strategy**: Exponential backoff with circuit breaker

## Testing Strategy

### Component Testing
Every component must have these tests:
1. **Renders with real data** - No mock props
2. **Handles loading states** - Real API delays
3. **Handles error states** - Real API failures
4. **Updates on data changes** - Real data mutations

### Integration Testing
Every feature must have these tests:
1. **End-to-end happy path** - User action → data change → UI update
2. **Error recovery** - API failures, network issues, invalid data
3. **Data consistency** - Multiple components showing same data
4. **Performance** - Acceptable response times with real data

### System Testing
Every release must pass:
1. **Fresh install flow** - First-time user experience
2. **Data migration** - Upgrading preserves user data
3. **Multi-session** - Multiple app instances don't conflict
4. **Resource usage** - Memory and CPU within limits

## Development Workflow

### Daily Development Cycle
1. **Pick smallest possible feature**
2. **Write test for real data scenario**
3. **Implement minimal working version**
4. **Verify with real external services**
5. **Add error handling**
6. **Document the working piece**

### Definition of Done
For any feature to be considered complete:
- [ ] Works with real data from external services
- [ ] Has error handling for all failure modes
- [ ] UI updates reflect actual system state
- [ ] Performance is acceptable (< 2s response time)
- [ ] No mock data or functions remain
- [ ] Integration test passes
- [ ] Code is documented

### Git Strategy
- **Main branch**: Always deployable
- **Feature branches**: One small feature only
- **Commits**: Include test evidence in commit message
- **PRs**: Must include "tested with real data" proof

## Quality Gates

### Before Any New Feature
1. **Current functionality works perfectly** - No known bugs
2. **Test suite passes** - All existing tests green
3. **Performance baseline** - No regressions
4. **Documentation current** - README matches reality

### Before Release
1. **End-to-end scenarios work** - Real user workflows
2. **Error handling tested** - Intentionally cause failures
3. **Data integrity verified** - No data loss scenarios
4. **Resource usage acceptable** - Memory/CPU profiling

## Known Issues to Avoid (From v1.0)

### Background Processor Spam
- **Problem**: Job queue processing every 1 second calling Claude API
- **Solution**: Disable background processing until explicitly needed
- **Prevention**: All periodic tasks must have configurable intervals

### Task Data Synchronization
- **Problem**: Claude using conversation memory vs UI using live MCP data
- **Solution**: Explicit task context injection with live data only
- **Prevention**: Single source of truth for all task data

### Mock Data Confidence
- **Problem**: Features appeared to work with mock data but failed with real data
- **Solution**: No mock data allowed in any component
- **Prevention**: Every demo must use real external services

### Multiple Auto-Refresh
- **Problem**: Multiple timers refreshing data causing API spam
- **Solution**: Centralized data fetching with coordination
- **Prevention**: One refresh mechanism per data type

### Knowledge Base Pitfalls
- **Problem**: Vector embeddings that don't match actual content
- **Solution**: Always verify search results against source content
- **Prevention**: Test semantic search with real queries and validate results

### Memory vs Persistence Confusion
- **Problem**: Mixing conversation memory with persistent knowledge
- **Solution**: Clear separation between chat context and stored knowledge
- **Prevention**: Explicit data flow diagrams for each information type

### Terminal Integration Issues
- **Problem**: Limited terminal functionality that doesn't match native experience
- **Solution**: Use node-pty for full native terminal compatibility
- **Prevention**: Test all common terminal operations (vim, htop, git, etc.)

### Task Sidebar Staleness
- **Problem**: Task sidebar showing outdated information
- **Solution**: Real-time polling with change detection
- **Prevention**: Automated tests that verify sidebar updates within 5 seconds

## Success Metrics

### Technical Metrics
- **API Error Rate**: < 1% of requests fail
- **UI Response Time**: < 500ms for local operations
- **Data Consistency**: 100% UI/backend alignment
- **Memory Usage**: < 300MB baseline (including SQLite)
- **Test Coverage**: > 80% with real data tests
- **Search Accuracy**: > 90% relevant results for knowledge queries
- **Database Performance**: < 100ms for note operations
- **Task Sidebar Sync**: < 5 seconds for updates to appear
- **Terminal Compatibility**: 100% command compatibility with macOS Terminal.app

### User Experience Metrics
- **Task Creation**: < 5 seconds from chat to UI
- **Task Sidebar Updates**: < 5 seconds for changes to appear
- **Note Creation**: < 2 seconds from input to storage
- **Knowledge Search**: < 1 second for semantic search
- **Terminal Response**: < 100ms for command input
- **Chat-to-Terminal**: < 2 seconds to execute suggested commands
- **Sync Delay**: < 10 seconds for external changes
- **Error Recovery**: User can recover from any error state
- **Data Loss**: Zero user data loss scenarios

## Deployment Strategy

### Development Environment
- All external services must be accessible
- Test API keys for all integrations
- Local MCP server for development
- Error injection capabilities for testing

### Production Readiness
- Graceful degradation when services unavailable
- User feedback for all error conditions
- Automatic retry for transient failures
- Performance monitoring and alerting

## MCP TaskMaster Integration - Single Source of Truth

### Architecture Changes (Latest)
- **MCP is the single source of truth** for all task data
- **Removed local storage sync complexity** that was causing conflicts
- **Simplified task operations** to directly use claude-task-master MCP server
- **Added connection status monitoring** in the TaskSidebar

### Verification Steps

1. **Check MCP Connection Status**
   - Look for "TaskMaster MCP: Connected" indicator in the sidebar
   - Green dot = Connected, Red dot = Disconnected, Yellow dot = Checking

2. **Test Task Operations**
   ```bash
   # In your project directory, test claude-task-master CLI
   npx task-master-ai list
   npx task-master-ai add "Test task from CLI"
   ```

3. **Verify Single Source of Truth**
   - Tasks created via CLI should appear in ENGIE sidebar after refresh
   - Tasks created via ENGIE chat should appear in CLI
   - Task status updates should sync in both directions

4. **Troubleshoot Connection Issues**
   - Ensure Anthropic API key is configured in MCP settings
   - Check Cursor MCP configuration at `~/.cursor/mcp.json`
   - Verify claude-task-master MCP server is running

### Debug Console Logs
- `App: Retrieved X tasks from claude-task-master MCP` - Successful task fetch
- `MCP TaskMaster: Connected successfully` - MCP connection established
- `TaskSidebar: No tasks and MCP disconnected` - Connection problem detected

### Expected Behavior
- **Empty tasks**: If no tasks exist in claude-task-master, sidebar shows empty state
- **Connection issues**: Sidebar shows "MCP TaskMaster Disconnected" message
- **Auto-refresh**: Tasks update every 30 seconds automatically
- **Manual refresh**: Click refresh button for immediate update
- **Task updates**: Task title/description changes should reflect immediately in sidebar

### Task Update Functionality (NEW)

**Update Methods Supported:**
1. **Direct MCP Update**: Uses `edit_task` tool if available in claude-task-master
2. **Fallback Method**: Delete and recreate task with new information if direct edit not supported

**Supported Update Patterns:**
```bash
# In ENGIE chat:
"rename untitled task to 'shoot demo video'"
"change task name to 'Complete project'"
"call the task 'New Feature'"
"update task title to 'Bug Fix'"
```

**Verification Steps for Task Updates:**
1. Ask ENGIE to rename a task: "rename untitled task to 'test task'"
2. Check console for: `MCP TaskMaster: Updated task X - "New Title"`
3. TaskSidebar should refresh automatically within 1-2 seconds
4. Task should appear with new name in Priority Tasks section

### Debug Console Logs (Updated)
- `MCP TaskMaster: Retrieved X tasks from claude-task-master` - Successful task fetch
- `MCP TaskMaster: Connected successfully` - MCP connection established
- `TaskSidebar: No tasks and MCP disconnected` - Connection problem detected
- `✅ Successfully updated task X - "New Title"` - Successful task update
- `❌ Failed to update task X: error message` - Failed task update (now visible!)
- `🔄 Using fallback: delete and recreate task X` - Fallback method used

### Configuration Fix (NEW)

**Problem**: Constant warnings about "Configuration file not found" causing MCP operations to fail silently.

**Solution**: Created `.taskmaster/config.json` with basic project configuration:
```json
{
  "project": {
    "name": "ENGIE",
    "type": "nodejs", 
    "root": "/Users/jfuginay/Documents/dev/engie/engie"
  },
  "models": {
    "main": "anthropic/claude-3-sonnet-20240229",
    "research": "anthropic/claude-3-sonnet-20240229",
    "fallback": "anthropic/claude-3-haiku-20240307"
  }
}
```

### Error Handling Improvements (NEW)

1. **Visible Failures**: Task update failures now throw errors instead of silently returning null
2. **Multiple Update Methods**: Tries `set_task_title` → `edit_task` → `delete+recreate` fallback
3. **Better Logging**: Clear emoji-based console logs for debugging
4. **Force UI Refresh**: Immediate sidebar update after successful operations
5. **User Feedback**: Failed updates now show in chat with specific error messages

### Expected Behavior After Fix
- **No more configuration warnings**: Clean console output
- **Visible errors**: Failed operations show clear error messages
- **Immediate UI updates**: TaskSidebar refreshes within 1-2 seconds
- **Robust updates**: Multiple fallback methods ensure updates work even with limited MCP tools

## Conclusion

This PRD prioritizes **working software over comprehensive features**. Every line of code must demonstrate real value with real data. By building incrementally and testing continuously, we avoid the synchronization nightmares and mock data false confidence that plagued v1.0.

The goal is not to build everything quickly, but to build everything correctly the first time.

---

**Next Steps**: Start with Phase 1.3 (Single Task CRUD) and do not proceed to Phase 2 until one task works perfectly with zero issues.
