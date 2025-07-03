import React, { useState, useRef, useEffect } from 'react';
import type { TaskMasterTask } from '../../shared/types';

interface CommandHistory {
  command: string;
  output: string;
  timestamp: Date;
}

interface HistoryEntry {
  content: string;
  type: 'user' | 'assistant' | 'system' | 'welcome';
  timestamp: Date;
}

interface AIProcessorResult {
  action: 'add' | 'query' | 'modify' | 'insight' | 'status';
  todos?: Array<{
    text: string;
    priority: 'low' | 'medium' | 'high';
    dueDate: string | null;
    tags: string[];
    estimated_duration: string;
    energy_level: 'low' | 'medium' | 'high';
  }>;
  filter?: {
    priority?: string;
    tag?: string;
    dueDate?: string;
    overdue?: boolean;
  };
  todo_id?: number;
  changes?: Record<string, any>;
  message?: string;
}

class ENGIEAIProcessor {
  async processNaturalLanguage(input: string, existingTasks: TaskMasterTask[] = []): Promise<AIProcessorResult> {
    const lower = input.toLowerCase();
    
    // Task creation patterns
    if (this.isTaskCreation(lower)) {
      return {
        action: "add",
        todos: [{
          text: this.extractTaskText(input),
          priority: this.extractPriority(lower),
          dueDate: this.extractDate(lower),
          tags: this.extractTags(lower),
          estimated_duration: this.estimateDuration(lower),
          energy_level: this.estimateEnergyLevel(lower)
        }]
      };
    }

    // Query patterns
    if (this.isQuery(lower)) {
      return {
        action: "query",
        filter: this.extractQueryFilter(lower)
      };
    }

    // Status patterns
    if (lower.includes('status') || lower.includes('stats') || lower.includes('progress')) {
      return {
        action: "status"
      };
    }

    // Modification patterns
    const modifyMatch = lower.match(/(?:make|change|update|move)\s+(?:task\s+)?(\d+)/);
    if (modifyMatch) {
      return {
        action: "modify",
        todo_id: parseInt(modifyMatch[1]),
        changes: this.extractChanges(lower)
      };
    }

    // Default to task creation
    return {
      action: "add",
      todos: [{
        text: input,
        priority: this.extractPriority(lower),
        dueDate: this.extractDate(lower),
        tags: this.extractTags(lower),
        estimated_duration: this.estimateDuration(lower),
        energy_level: this.estimateEnergyLevel(lower)
      }]
    };
  }

  private isTaskCreation(text: string): boolean {
    const addWords = ['add', 'create', 'new', 'schedule', 'remember', 'todo', 'task'];
    return addWords.some(word => text.includes(word)) || text.length > 10;
  }

  private isQuery(text: string): boolean {
    const queryWords = ['show', 'list', 'what', 'display', 'find', 'search'];
    return queryWords.some(word => text.includes(word));
  }

  private extractTaskText(input: string): string {
    return input.replace(/^(add |create |new |schedule |remember to |todo: |task: )/i, '').trim();
  }

  private extractPriority(text: string): 'low' | 'medium' | 'high' {
    if (text.includes('urgent') || text.includes('asap') || text.includes('critical') || 
        text.includes('important') || text.includes('high priority')) {
      return 'high';
    }
    if (text.includes('low priority') || text.includes('later') || text.includes('sometime')) {
      return 'low';
    }
    return 'medium';
  }

  private extractDate(text: string): string | null {
    const today = new Date();
    
    if (text.includes('today')) {
      return today.toISOString().split('T')[0];
    }
    
    if (text.includes('tomorrow')) {
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      return tomorrow.toISOString().split('T')[0];
    }

    if (text.includes('next week')) {
      const nextWeek = new Date(today);
      nextWeek.setDate(nextWeek.getDate() + 7);
      return nextWeek.toISOString().split('T')[0];
    }

    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    for (let day of days) {
      if (text.includes(day)) {
        return this.getNextWeekday(day);
      }
    }

    return null;
  }

  private extractTags(text: string): string[] {
    const tags = [];
    const tagMap = {
      'work': ['work', 'job', 'office', 'meeting', 'project', 'deadline'],
      'personal': ['personal', 'home', 'family', 'self'],
      'health': ['health', 'gym', 'workout', 'doctor', 'medical', 'exercise'],
      'shopping': ['buy', 'shop', 'purchase', 'store', 'groceries'],
      'communication': ['call', 'email', 'text', 'message', 'contact'],
      'learning': ['learn', 'study', 'read', 'course', 'tutorial'],
      'finance': ['pay', 'bill', 'bank', 'money', 'budget']
    };

    for (let [tag, keywords] of Object.entries(tagMap)) {
      if (keywords.some(keyword => text.includes(keyword))) {
        tags.push(tag);
      }
    }

    return tags;
  }

  private estimateDuration(text: string): string {
    if (text.includes('quick') || text.includes('brief') || text.includes('5 min')) {
      return '5 minutes';
    }
    if (text.includes('long') || text.includes('detailed') || text.includes('thorough')) {
      return '2 hours';
    }
    if (text.includes('call') || text.includes('meeting')) {
      return '30 minutes';
    }
    if (text.includes('workout') || text.includes('gym')) {
      return '1 hour';
    }
    return '30 minutes';
  }

  private estimateEnergyLevel(text: string): 'low' | 'medium' | 'high' {
    const highEnergyTasks = ['workout', 'gym', 'presentation', 'creative', 'brainstorm'];
    const lowEnergyTasks = ['email', 'admin', 'organize', 'file', 'schedule'];
    
    if (highEnergyTasks.some(task => text.includes(task))) {
      return 'high';
    }
    if (lowEnergyTasks.some(task => text.includes(task))) {
      return 'low';
    }
    return 'medium';
  }

  private extractQueryFilter(text: string): Record<string, any> {
    const filter: Record<string, any> = {};
    
    if (text.includes('urgent') || text.includes('high priority')) {
      filter.priority = 'high';
    }
    if (text.includes('today')) {
      filter.dueDate = 'today';
    }
    if (text.includes('work')) {
      filter.tag = 'work';
    }
    if (text.includes('overdue')) {
      filter.overdue = true;
    }
    
    return filter;
  }

  private extractChanges(text: string): Record<string, any> {
    const changes: Record<string, any> = {};
    
    if (text.includes('urgent') || text.includes('high priority')) {
      changes.priority = 'high';
    }
    if (text.includes('low priority')) {
      changes.priority = 'low';
    }
    if (text.includes('tomorrow')) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      changes.dueDate = tomorrow.toISOString().split('T')[0];
    }
    
    return changes;
  }

  private getNextWeekday(dayName: string): string {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const targetDay = days.indexOf(dayName.toLowerCase());
    const today = new Date();
    const currentDay = today.getDay();
    const daysUntilTarget = (targetDay - currentDay + 7) % 7 || 7;
    
    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() + daysUntilTarget);
    return targetDate.toISOString().split('T')[0];
  }

  generateInsight(tasks: TaskMasterTask[]): string {
    const total = tasks.length;
    if (total === 0) return "🎉 All caught up! Ready for new challenges.";

    const completed = tasks.filter(t => t.status === 'done').length;
    const high = tasks.filter(t => t.status !== 'done' && t.priority === 'high').length;
    const overdue = tasks.filter(t => t.status !== 'done' && t.createdAt && new Date(t.createdAt) < new Date()).length;

    if (overdue > 3) {
      return "⚠️ Multiple overdue tasks detected. Consider rescheduling or breaking into smaller pieces.";
    }
    
    if (high > 5) {
      return "🎯 High priority task load detected. Focus on 2-3 today to maintain momentum.";
    }
    
    const productivity = total > 0 ? Math.round(completed / total * 100) : 0;
    if (productivity > 80) {
      return "🚀 Outstanding productivity! You're crushing your objectives.";
    }
    
    return "💡 Pro tip: Batch similar tasks together for maximum efficiency.";
  }
}

export const ENGIETerminal: React.FC = () => {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [currentLine, setCurrentLine] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [tasks, setTasks] = useState<TaskMasterTask[]>([]);
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [naturalMode, setNaturalMode] = useState(true); // Start with natural mode enabled
  
  const terminalRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadTasks();
    showWelcome();
    
    // Focus input
    if (inputRef.current) {
      inputRef.current.focus();
    }

    // Auto-refresh tasks every 10 seconds
    const refreshInterval = setInterval(loadTasks, 10000);

    // Add keyboard shortcuts
    const handleKeyboard = (e: KeyboardEvent) => {
      if (e.metaKey && e.key === ',') {
        e.preventDefault();
        window.engieAPI.on('open-settings', () => {});
      }
    };

    window.addEventListener('keydown', handleKeyboard);
    
    return () => {
      clearInterval(refreshInterval);
      window.removeEventListener('keydown', handleKeyboard);
    };
  }, []);

  const loadTasks = async () => {
    try {
      const taskList = await window.engieAPI.taskMaster.getTasks();
      setTasks(taskList);
    } catch (error) {
      console.error('Failed to load tasks:', error);
    }
  };

  const showWelcome = () => {
    const welcome = `
╔══════════════════════════════════════════════════════════════╗
║                        ENGIE Terminal                         ║
║           AI-Powered Development Assistant                   ║
║                     TERMINAL INTERFACE                       ║
╚══════════════════════════════════════════════════════════════╝

🎉 Welcome to the new ENGIE Terminal UI!
🧠 Smart Task Management with Natural Language Processing

🔥 NATURAL MODE: ENABLED
┌─────────────────────────────────────────────────────────────┐
│ 🤖 All inputs are processed by Claude AI first             │
│ 💬 Ask anything: "help me plan my week"                    │
│ 📋 Create tasks: "I need to call mom tomorrow"             │
│ 🎯 Get insights: "what should I focus on today?"           │
│ ⚡ Click 🔥 button to toggle to direct command mode         │
└─────────────────────────────────────────────────────────────┘

⚙️ Settings: Cmd+, • 🔄 Auto-refresh: 10s • Type "help" for commands
`;
    setHistory([{ content: welcome, type: 'welcome', timestamp: new Date() }]);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && currentLine.trim()) {
      processCommand(currentLine.trim());
      setCommandHistory(prev => [currentLine.trim(), ...prev.slice(0, 9)]);
      setCurrentLine('');
      setHistoryIndex(-1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (commandHistory.length > 0 && historyIndex < commandHistory.length - 1) {
        const newIndex = historyIndex + 1;
        setHistoryIndex(newIndex);
        setCurrentLine(commandHistory[newIndex]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        setCurrentLine(commandHistory[newIndex]);
      } else if (historyIndex === 0) {
        setHistoryIndex(-1);
        setCurrentLine('');
      }
    }
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      if (terminalRef.current) {
        terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
      }
    }, 100);
  };

  const processCommand = async (command: string) => {
    setIsProcessing(true);
    setHistory(prev => [...prev, { content: command, type: 'user', timestamp: new Date() }]);
    scrollToBottom();

    try {
      const lowerCommand = command.toLowerCase();

      // Handle mode toggle command
      if (lowerCommand === 'natural' || lowerCommand === 'toggle') {
        setNaturalMode(prev => !prev);
        setHistory(prev => [...prev, { content: `🔥 Natural Mode ${!naturalMode ? 'ENABLED' : 'DISABLED'} - ${!naturalMode ? 'All inputs go through Claude AI first' : 'Direct command processing'}`, type: 'system', timestamp: new Date() }]);
        scrollToBottom();
        return;
      }

      // If natural mode is enabled, send to Claude first (except for basic commands)
      if (naturalMode && !['help', 'clear', 'settings', 'list', 'ls', 'status'].includes(lowerCommand)) {
        await processWithClaude(command);
        return;
      }

      // Direct command processing (natural mode disabled or basic commands)
      if (lowerCommand === 'help') {
        setHistory(prev => [...prev, { content: `
╔═════════════════════ Commands ═════════════════════╗
║ help                   - Show this help            ║
║ list / ls              - Show all tasks            ║
║ status                 - Show productivity status  ║
║ clear                  - Clear terminal            ║
║ settings               - Open settings             ║
║ natural / toggle       - Toggle natural mode       ║
║ complete <number>      - Complete task by number   ║
║ delete <number>        - Delete task by number     ║
╠═════════════════════ Natural Mode 🔥 ═══════════════╣
║ ${naturalMode ? '🤖 ENABLED' : '⚡ DISABLED'} - ${naturalMode ? 'Claude AI processes all inputs' : 'Direct command processing'}      ║
║ Click 🔥 button to toggle modes                    ║
║ Natural Mode: Everything goes through Claude first ║
║ Direct Mode: Traditional command-line interface    ║
╠═════════════════════ Natural Language ═════════════╣
║ "add call mom tomorrow"                             ║
║ "show urgent tasks"                                 ║
║ "I need to finish presentation tonight"            ║
║ "schedule gym Friday morning"                       ║
║ "what's due today?"                                 ║
║ "help me plan a vacation"                           ║
╠═════════════════════ Shortcuts ════════════════════╣
║ Cmd+, (Mac) / Ctrl+, (PC) - Settings               ║
║ ↑/↓ arrows - Command history                       ║
╚════════════════════════════════════════════════════╝
`, type: 'system', timestamp: new Date() }]);
        scrollToBottom();
      } else if (lowerCommand === 'list' || lowerCommand === 'ls') {
        await showTasks();
      } else if (lowerCommand === 'clear') {
        setHistory([]);
        showWelcome();
      } else if (lowerCommand === 'status') {
        await showStatus();
      } else if (lowerCommand === 'settings') {
        window.engieAPI.on('open-settings', () => {});
      } else if (lowerCommand.startsWith('complete ')) {
        const taskNumber = parseInt(lowerCommand.split(' ')[1]);
        await completeTask(taskNumber);
      } else if (lowerCommand.startsWith('delete ')) {
        const taskNumber = parseInt(lowerCommand.split(' ')[1]);
        await deleteTask(taskNumber);
      } else {
        // Natural language processing for task creation (direct mode)
        setHistory(prev => [...prev, { content: '⚡ Processing locally...', type: 'system', timestamp: new Date() }]);
        await createTaskFromNaturalLanguage(command);
      }
    } catch (error) {
      setHistory(prev => [...prev, { content: `❌ Error: ${error}`, type: 'system', timestamp: new Date() }]);
      scrollToBottom();
    } finally {
      setIsProcessing(false);
    }
  };

  const processWithClaude = async (input: string) => {
    try {
      setHistory(prev => [...prev, { content: '🤖 Processing with Claude AI...', type: 'system', timestamp: new Date() }]);
      scrollToBottom();
      
      // Call the AI orchestrator which includes Claude processing
      const context = {
        workingDirectory: undefined, // Let the main process determine this
        timestamp: new Date().toISOString(),
        currentTasks: tasks,
        interfaceMode: 'terminal',
      };
      
      const response = await window.engieAPI.ai.processMessage(input, context);
      
      // Display Claude's response with success indicator
      setHistory(prev => [...prev, { content: response.result, type: 'assistant', timestamp: new Date() }]);
      
      if (response.toolsUsed?.includes('TaskMaster') || response.toolsUsed?.includes('Task')) {
        // Refresh tasks if TaskMaster was used
        await loadTasks();
      }
      
      scrollToBottom();
    } catch (error) {
      console.error('Error processing with Claude:', error);
      setHistory(prev => [...prev, { content: `❌ Claude AI unavailable: ${error instanceof Error ? error.message : 'Connection error'}`, type: 'system', timestamp: new Date() }]);
      setHistory(prev => [...prev, { content: '🔄 Using local task processing instead...', type: 'system', timestamp: new Date() }]);
      scrollToBottom();
        // Fallback to local processing
        await createTaskFromNaturalLanguage(input);
    }
  };

  const createTaskFromNaturalLanguage = async (input: string) => {
    try {
      // Extract task description (remove common command prefixes)
      const taskDescription = input.replace(/^(add |create |new |todo |task |remember to |schedule )/i, '').trim();
      
      await window.engieAPI.taskMaster.createTask(taskDescription);
      setHistory(prev => [...prev, { content: `✅ Created task: ${taskDescription}`, type: 'system', timestamp: new Date() }]);
      
      // Check for priority keywords
      const lower = input.toLowerCase();
      if (lower.includes('urgent') || lower.includes('important') || lower.includes('asap')) {
        setHistory(prev => [...prev, { content: '🔥 Detected high priority - consider updating task priority', type: 'system', timestamp: new Date() }]);
      }
      
      // Check for time-sensitive keywords
      if (lower.includes('today') || lower.includes('tomorrow') || lower.includes('tonight')) {
        setHistory(prev => [...prev, { content: '⏰ Time-sensitive task detected', type: 'system', timestamp: new Date() }]);
      }
      
      scrollToBottom();
      
      await loadTasks();
    } catch (error) {
      setHistory(prev => [...prev, { content: `❌ Failed to create task: ${error}`, type: 'system', timestamp: new Date() }]);
      scrollToBottom();
    }
  };

  const completeTask = async (taskNumber: number) => {
    if (taskNumber < 1 || taskNumber > tasks.length) {
      setHistory(prev => [...prev, { content: '❌ Invalid task number', type: 'system', timestamp: new Date() }]);
      scrollToBottom();
      return;
    }

    const task = tasks[taskNumber - 1];
    try {
      await window.engieAPI.taskMaster.updateTaskStatus(task.id, 'done');
      setHistory(prev => [...prev, { content: `✅ Completed: ${task.title}`, type: 'system', timestamp: new Date() }]);
      scrollToBottom();
      await loadTasks();
    } catch (error) {
      setHistory(prev => [...prev, { content: `❌ Failed to complete task: ${error}`, type: 'system', timestamp: new Date() }]);
      scrollToBottom();
    }
  };

  const deleteTask = async (taskNumber: number) => {
    if (taskNumber < 1 || taskNumber > tasks.length) {
      setHistory(prev => [...prev, { content: '❌ Invalid task number', type: 'system', timestamp: new Date() }]);
      scrollToBottom();
      return;
    }

    const task = tasks[taskNumber - 1];
    try {
      await window.engieAPI.taskMaster.deleteTask(task.id);
      setHistory(prev => [...prev, { content: `🗑️ Deleted: ${task.title}`, type: 'system', timestamp: new Date() }]);
      scrollToBottom();
      await loadTasks();
    } catch (error) {
      setHistory(prev => [...prev, { content: `❌ Failed to delete task: ${error}`, type: 'system', timestamp: new Date() }]);
      scrollToBottom();
    }
  };

  const showTasks = async () => {
    if (tasks.length === 0) {
      setHistory(prev => [...prev, { content: '📋 No tasks found', type: 'system', timestamp: new Date() }]);
      scrollToBottom();
      return;
    }

    let output = '\n📋 TASKS:\n';
    tasks.forEach((task, index) => {
      const status = task.status === 'done' ? '✅' : 
                     task.priority === 'high' ? '🔥' : 
                     task.priority === 'medium' ? '⚡' : '📋';
      output += `  ${index + 1}. ${status} ${task.title}\n`;
    });
    
    setHistory(prev => [...prev, { content: output, type: 'system', timestamp: new Date() }]);
    scrollToBottom();
  };

  const showStatus = async () => {
    const total = tasks.length;
    const completed = tasks.filter(t => t.status === 'done').length;
    const active = total - completed;
    const high = tasks.filter(t => t.status !== 'done' && t.priority === 'high').length;
    
    const output = `
📊 ENGIE Status Report:
   Total tasks: ${total}
   Completed: ${completed} (${total ? Math.round(completed/total*100) : 0}%)
   Active: ${active}
   High priority: ${high}
   
${generateInsight()}

🚀 ${total > 0 ? `${Math.round(completed/total*100)}% completion rate` : 'Ready for new challenges!'}
`;
    setHistory(prev => [...prev, { content: output, type: 'system', timestamp: new Date() }]);
    scrollToBottom();
  };

  const generateInsight = () => {
    const total = tasks.length;
    if (total === 0) return "🎉 All systems ready! Start adding tasks to boost productivity.";

    const completed = tasks.filter(t => t.status === 'done').length;
    const high = tasks.filter(t => t.status !== 'done' && t.priority === 'high').length;

    if (high > 5) {
      return "⚠️ High priority task overload detected. Focus on 2-3 critical tasks today.";
    }
    
    const productivity = total > 0 ? Math.round(completed / total * 100) : 0;
    if (productivity > 80) {
      return "🚀 Outstanding productivity! You're crushing your objectives.";
    } else if (productivity > 50) {
      return "💪 Good momentum! Keep the streak going.";
    }
    
    return "💡 Pro tip: Break large tasks into smaller, manageable pieces for better progress.";
  };

  return (
    <div className="h-screen bg-dark-900 flex flex-col font-mono text-sm">
      {/* Terminal Output */}
      <div 
        ref={terminalRef}
        className="flex-1 overflow-y-auto p-4 text-gray-300"
      >
        {history.map((entry, index) => (
          <div key={index} className="mb-2 whitespace-pre-wrap">
            {entry.content}
          </div>
        ))}
        
        {/* Live Task Display */}
        <div className="border border-gray-600 rounded-lg p-4 mb-4 bg-dark-800">
          <div className="text-cyan-400 font-semibold mb-2">📋 ACTIVE TASKS</div>
          <TaskDisplay tasks={tasks} />
        </div>
      </div>

      {/* Input Line */}
      <div className="border-t border-gray-600 p-4 bg-dark-800">
        <div className="flex items-center gap-2">
          <span className="text-green-400">{naturalMode ? '🤖 engie' : 'engie'}</span>
          <span className="text-cyan-400">❯</span>
          <input
            ref={inputRef}
            type="text"
            value={currentLine}
            onChange={(e) => setCurrentLine(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent text-white outline-none"
            placeholder={naturalMode ? "Ask anything - Claude AI will process first..." : "Enter command or speak naturally..."}
            disabled={isProcessing}
          />
          <button
            onClick={() => {
              const newMode = !naturalMode;
              setNaturalMode(newMode);
              const modeText = newMode ? '🤖 ENABLED' : '⚡ DISABLED';
              const description = newMode 
                ? 'Claude AI will process all inputs for intelligent task management'
                : 'Direct command processing for faster responses';
              setHistory(prev => [...prev, `🔥 Natural Mode ${modeText} - ${description}`]);
              scrollToBottom();
            }}
            className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${
              naturalMode
                ? 'bg-orange-500 text-black hover:bg-orange-600'
                : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
            }`}
            title={naturalMode ? 'Natural Mode ON - Click to disable' : 'Natural Mode OFF - Click to enable'}
          >
            🔥
          </button>
          {isProcessing && (
            <span className="text-yellow-400 animate-pulse">●</span>
          )}
        </div>
        <div className="text-xs text-gray-500 mt-1 flex justify-between">
          <span>↑/↓ for history • {naturalMode ? 'Claude AI processing mode' : 'Direct command mode'}</span>
          <span className={naturalMode ? 'text-orange-400' : 'text-gray-600'}>
            {naturalMode ? '🤖 AI Mode' : '⚡ Direct Mode'}
          </span>
        </div>
      </div>
    </div>
  );
};

const TaskDisplay: React.FC<{ tasks: TaskMasterTask[] }> = ({ tasks }) => {
  const activeTasks = tasks.filter(task => task.status !== 'done');
  const completedTasks = tasks.filter(task => task.status === 'done');
  
  if (activeTasks.length === 0) {
    return <div className="text-yellow-400">🎉 All caught up! No active tasks.</div>;
  }

  // Group by priority
  const highPriority = activeTasks.filter(t => t.priority === 'high');
  const mediumPriority = activeTasks.filter(t => t.priority === 'medium');
  const lowPriority = activeTasks.filter(t => t.priority === 'low');

  return (
    <div className="space-y-2">
      {highPriority.length > 0 && (
        <div>
          <div className="text-red-400 font-semibold text-xs">🔥 HIGH PRIORITY:</div>
          {highPriority.map((task) => (
            <div key={task.id} className="ml-4 text-red-300 text-xs">
              [{tasks.indexOf(task) + 1}] {task.title.substring(0, 45)}
              {task.title.length > 45 && '...'}
            </div>
          ))}
        </div>
      )}
      
      {mediumPriority.length > 0 && (
        <div>
          <div className="text-yellow-400 font-semibold text-xs">⚡ MEDIUM PRIORITY:</div>
          {mediumPriority.slice(0, 3).map((task) => (
            <div key={task.id} className="ml-4 text-yellow-300 text-xs">
              [{tasks.indexOf(task) + 1}] {task.title.substring(0, 45)}
              {task.title.length > 45 && '...'}
            </div>
          ))}
          {mediumPriority.length > 3 && (
            <div className="ml-4 text-gray-500 text-xs">
              ... and {mediumPriority.length - 3} more medium priority
            </div>
          )}
        </div>
      )}
      
      {lowPriority.length > 0 && (
        <div>
          <div className="text-gray-400 font-semibold text-xs">📋 LOW PRIORITY:</div>
          {lowPriority.slice(0, 2).map((task) => (
            <div key={task.id} className="ml-4 text-gray-400 text-xs">
              [{tasks.indexOf(task) + 1}] {task.title.substring(0, 45)}
              {task.title.length > 45 && '...'}
            </div>
          ))}
          {lowPriority.length > 2 && (
            <div className="ml-4 text-gray-600 text-xs">
              ... and {lowPriority.length - 2} more low priority
            </div>
          )}
        </div>
      )}
      
      <div className="border-t border-gray-600 pt-2 text-xs text-gray-500">
        📊 Total: {tasks.length} | Active: {activeTasks.length} | Completed: {completedTasks.length}
      </div>
    </div>
  );
}; 