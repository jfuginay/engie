const { ipcRenderer } = require('electron');
const AIProcessor = require('../ai-processor');

class SecondBrainTerminal {
    constructor() {
        this.terminal = new window.Terminal({
            theme: {
                background: '#1e1e1e',
                foreground: '#ffffff',
                cursor: '#00ff00',
                cursorAccent: '#00ff00',
                selection: '#555555',
                black: '#2e3436',
                red: '#cc0000',
                green: '#4e9a06',
                yellow: '#c4a000',
                blue: '#3465a4',
                magenta: '#75507b',
                cyan: '#06989a',
                white: '#d3d7cf',
                brightBlack: '#555753',
                brightRed: '#ef2929',
                brightGreen: '#8ae234',
                brightYellow: '#fce94f',
                brightBlue: '#729fcf',
                brightMagenta: '#ad7fa8',
                brightCyan: '#34e2e2',
                brightWhite: '#eeeeec'
            },
            fontSize: 14,
            fontFamily: 'SF Mono, Monaco, Menlo, monospace',
            cursorBlink: true,
            convertEol: true
        });

        this.fitAddon = new window.FitAddon.FitAddon();
        this.webLinksAddon = new window.WebLinksAddon.WebLinksAddon();
        
        this.terminal.loadAddon(this.fitAddon);
        this.terminal.loadAddon(this.webLinksAddon);

        this.currentLine = '';
        this.commandHistory = [];
        this.historyIndex = -1;
        this.todos = [];
        this.patterns = {};
        this.ai = new AIProcessor();
        
        this.init();
    }

    async init() {
        const terminalElement = document.getElementById('terminal');
        this.terminal.open(terminalElement);
        this.fitAddon.fit();

        await this.loadData();
        this.showWelcome();
        this.prompt();

        this.terminal.onData(this.handleInput.bind(this));
        window.addEventListener('resize', () => {
            this.fitAddon.fit();
        });
    }

    async loadData() {
        const todos = await ipcRenderer.invoke('read-file', 'todos.json');
        const patterns = await ipcRenderer.invoke('read-file', 'patterns.json');
        
        if (todos) this.todos = todos;
        if (patterns) this.patterns = patterns;
    }

    async saveData() {
        await ipcRenderer.invoke('write-file', 'todos.json', this.todos);
        await ipcRenderer.invoke('write-file', 'patterns.json', this.patterns);
    }

    showWelcome() {
        this.terminal.writeln('\x1b[32m╔══════════════════════════════════════════════════════════════╗\x1b[0m');
        this.terminal.writeln('\x1b[32m║                     SecondBrain v1.0                         ║\x1b[0m');
        this.terminal.writeln('\x1b[32m║              AI-Powered Todo Management System               ║\x1b[0m');
        this.terminal.writeln('\x1b[32m╚══════════════════════════════════════════════════════════════╝\x1b[0m');
        this.terminal.writeln('');
        this.terminal.writeln('\x1b[36mType "help" for commands or just speak naturally:\x1b[0m');
        this.terminal.writeln('\x1b[37m• "add meeting with sarah tomorrow at 3pm"\x1b[0m');
        this.terminal.writeln('\x1b[37m• "show me my tasks for today"\x1b[0m');
        this.terminal.writeln('\x1b[37m• "make the presentation task urgent"\x1b[0m');
        this.terminal.writeln('');
    }

    prompt() {
        this.terminal.write('\x1b[33mbrain\x1b[0m \x1b[36m❯\x1b[0m ');
    }

    handleInput(data) {
        const code = data.charCodeAt(0);
        
        if (code === 13) { // Enter
            this.terminal.writeln('');
            this.processCommand(this.currentLine.trim());
            this.currentLine = '';
            this.prompt();
        } else if (code === 127) { // Backspace
            if (this.currentLine.length > 0) {
                this.currentLine = this.currentLine.slice(0, -1);
                this.terminal.write('\b \b');
            }
        } else if (code === 27) { // ESC sequences (arrows, etc.)
            // Handle arrow keys for command history
            return;
        } else if (code >= 32) { // Printable characters
            this.currentLine += data;
            this.terminal.write(data);
        }
    }

    async processCommand(input) {
        if (!input) return;

        this.commandHistory.unshift(input);
        if (this.commandHistory.length > 100) {
            this.commandHistory.pop();
        }

        const lowerInput = input.toLowerCase();

        if (lowerInput === 'help') {
            this.showHelp();
        } else if (lowerInput === 'list' || lowerInput === 'ls') {
            this.listTodos();
        } else if (lowerInput === 'clear') {
            this.terminal.clear();
        } else if (lowerInput === 'status') {
            this.showStatus();
        } else if (lowerInput.startsWith('complete ')) {
            const id = parseInt(lowerInput.split(' ')[1]);
            this.completeTodo(id);
        } else if (lowerInput.startsWith('delete ')) {
            const id = parseInt(lowerInput.split(' ')[1]);
            this.deleteTodo(id);
        } else {
            await this.processNaturalLanguage(input);
        }

        await this.saveData();
    }

    showHelp() {
        this.terminal.writeln('\x1b[36m╔═══════════════════ SecondBrain Commands ══════════════════════╗\x1b[0m');
        this.terminal.writeln('\x1b[36m║ help                 - Show this help menu                    ║\x1b[0m');
        this.terminal.writeln('\x1b[36m║ list / ls           - Show all todos                         ║\x1b[0m');
        this.terminal.writeln('\x1b[36m║ status              - Show productivity insights             ║\x1b[0m');
        this.terminal.writeln('\x1b[36m║ complete <id>       - Mark todo as complete                  ║\x1b[0m');
        this.terminal.writeln('\x1b[36m║ delete <id>         - Delete a todo                         ║\x1b[0m');
        this.terminal.writeln('\x1b[36m║ clear               - Clear terminal                         ║\x1b[0m');
        this.terminal.writeln('\x1b[36m╠══════════════════ Natural Language Examples ═════════════════╣\x1b[0m');
        this.terminal.writeln('\x1b[36m║ "add call mom tomorrow"                                       ║\x1b[0m');
        this.terminal.writeln('\x1b[36m║ "show me urgent tasks"                                        ║\x1b[0m');
        this.terminal.writeln('\x1b[36m║ "make task 1 high priority"                                   ║\x1b[0m');
        this.terminal.writeln('\x1b[36m║ "move gym to Friday"                                          ║\x1b[0m');
        this.terminal.writeln('\x1b[36m╚═══════════════════════════════════════════════════════════════╝\x1b[0m');
    }

    listTodos() {
        if (this.todos.length === 0) {
            this.terminal.writeln('\x1b[33mNo todos found. Add some with natural language!\x1b[0m');
            return;
        }

        this.terminal.writeln('\x1b[36m┌─────────────────────────────────────────────────────────────┐\x1b[0m');
        this.terminal.writeln('\x1b[36m│                        TODO LIST                            │\x1b[0m');
        this.terminal.writeln('\x1b[36m├─────────────────────────────────────────────────────────────┤\x1b[0m');

        this.todos.forEach((todo, index) => {
            const status = todo.completed ? '✓' : (todo.priority === 'high' ? '🔥' : todo.priority === 'medium' ? '⚡' : '📋');
            const priorityColor = todo.priority === 'high' ? '\x1b[31m' : todo.priority === 'medium' ? '\x1b[33m' : '\x1b[37m';
            const dateStr = todo.dueDate ? ` due: ${new Date(todo.dueDate).toLocaleDateString()}` : '';
            const line = `│ [${index + 1}] ${status} ${todo.text.padEnd(35)}${priorityColor}${dateStr}\x1b[0m │`;
            this.terminal.writeln(`\x1b[36m${line}\x1b[0m`);
        });

        this.terminal.writeln('\x1b[36m└─────────────────────────────────────────────────────────────┘\x1b[0m');
    }

    showStatus() {
        const total = this.todos.length;
        const completed = this.todos.filter(t => t.completed).length;
        const high = this.todos.filter(t => !t.completed && t.priority === 'high').length;
        const overdue = this.todos.filter(t => !t.completed && t.dueDate && new Date(t.dueDate) < new Date()).length;

        this.terminal.writeln('\x1b[36m📊 Your SecondBrain Status:\x1b[0m');
        this.terminal.writeln(`   Total tasks: ${total}`);
        this.terminal.writeln(`   Completed: ${completed} (${total ? Math.round(completed/total*100) : 0}%)`);
        this.terminal.writeln(`   High priority: \x1b[31m${high}\x1b[0m`);
        this.terminal.writeln(`   Overdue: \x1b[31m${overdue}\x1b[0m`);
        
        if (total > 0) {
            const productivity = Math.round(completed / total * 100);
            if (productivity >= 80) {
                this.terminal.writeln('\x1b[32m🚀 You\'re crushing it!\x1b[0m');
            } else if (productivity >= 60) {
                this.terminal.writeln('\x1b[33m⚡ Good momentum, keep it up!\x1b[0m');
            } else {
                this.terminal.writeln('\x1b[31m🎯 Time to focus up!\x1b[0m');
            }
        }
    }

    completeTodo(id) {
        const index = id - 1;
        if (index >= 0 && index < this.todos.length) {
            this.todos[index].completed = true;
            this.todos[index].completedAt = new Date().toISOString();
            this.terminal.writeln(`\x1b[32m✓ Completed: ${this.todos[index].text}\x1b[0m`);
        } else {
            this.terminal.writeln('\x1b[31mTodo not found\x1b[0m');
        }
    }

    deleteTodo(id) {
        const index = id - 1;
        if (index >= 0 && index < this.todos.length) {
            const deleted = this.todos.splice(index, 1)[0];
            this.terminal.writeln(`\x1b[33m🗑️  Deleted: ${deleted.text}\x1b[0m`);
        } else {
            this.terminal.writeln('\x1b[31mTodo not found\x1b[0m');
        }
    }

    async processNaturalLanguage(input) {
        this.terminal.writeln('\x1b[33m🧠 SecondBrain is thinking...\x1b[0m');
        
        try {
            const result = await this.ai.processNaturalLanguage(input, this.todos);
            
            switch (result.action) {
                case 'add':
                    await this.handleAddTodos(result.todos);
                    break;
                case 'query':
                    this.handleQuery(result.filter);
                    break;
                case 'modify':
                    this.handleModifyTodo(result.todo_id, result.changes);
                    break;
                case 'insight':
                    this.terminal.writeln(`\x1b[36m💡 ${result.message}\x1b[0m`);
                    break;
                default:
                    this.terminal.writeln('\x1b[33m🤔 I\'m still learning that command. Try "help" for examples.\x1b[0m');
            }
        } catch (error) {
            this.terminal.writeln('\x1b[31m❌ Error processing command. Try again.\x1b[0m');
            console.error('Processing error:', error);
        }
    }

    async handleAddTodos(newTodos) {
        for (let todoData of newTodos) {
            const todo = {
                id: Date.now() + Math.random(),
                text: todoData.text,
                priority: todoData.priority || 'medium',
                dueDate: todoData.dueDate,
                completed: false,
                createdAt: new Date().toISOString(),
                tags: todoData.tags || [],
                estimatedDuration: todoData.estimated_duration || '30 minutes',
                energyLevel: todoData.energy_level || 'medium'
            };
            
            this.todos.push(todo);
            this.terminal.writeln(`\x1b[32m✓ Added: ${todo.text}\x1b[0m`);
            
            if (todo.dueDate) {
                this.terminal.writeln(`   Due: ${new Date(todo.dueDate).toLocaleDateString()}`);
            }
            this.terminal.writeln(`   Priority: ${todo.priority} | Duration: ${todo.estimatedDuration}`);
            
            if (todo.tags.length > 0) {
                this.terminal.writeln(`   Tags: ${todo.tags.join(', ')}`);
            }
        }
        
        this.autoAdjustPriorities();
    }

    handleQuery(filter) {
        let filteredTodos = this.todos.filter(todo => !todo.completed);
        
        if (filter.priority) {
            filteredTodos = filteredTodos.filter(todo => todo.priority === filter.priority);
        }
        if (filter.tag) {
            filteredTodos = filteredTodos.filter(todo => todo.tags.includes(filter.tag));
        }
        if (filter.dueDate === 'today') {
            const today = new Date().toISOString().split('T')[0];
            filteredTodos = filteredTodos.filter(todo => todo.dueDate === today);
        }
        if (filter.overdue) {
            const today = new Date();
            filteredTodos = filteredTodos.filter(todo => todo.dueDate && new Date(todo.dueDate) < today);
        }
        
        this.displayFilteredTodos(filteredTodos);
    }

    handleModifyTodo(todoId, changes) {
        const todo = this.todos.find(t => t.id === todoId || this.todos.indexOf(t) === todoId - 1);
        if (todo) {
            Object.assign(todo, changes);
            this.terminal.writeln(`\x1b[32m✓ Updated: ${todo.text}\x1b[0m`);
            this.autoAdjustPriorities();
        } else {
            this.terminal.writeln('\x1b[31mTodo not found\x1b[0m');
        }
    }

    displayFilteredTodos(todos) {
        if (todos.length === 0) {
            this.terminal.writeln('\x1b[33mNo matching todos found.\x1b[0m');
            return;
        }

        this.terminal.writeln('\x1b[36m┌─────────────────────────────────────────────────────────────┐\x1b[0m');
        this.terminal.writeln('\x1b[36m│                     FILTERED TODOS                          │\x1b[0m');
        this.terminal.writeln('\x1b[36m├─────────────────────────────────────────────────────────────┤\x1b[0m');

        todos.forEach((todo, index) => {
            const status = todo.priority === 'high' ? '🔥' : todo.priority === 'medium' ? '⚡' : '📋';
            const priorityColor = todo.priority === 'high' ? '\x1b[31m' : todo.priority === 'medium' ? '\x1b[33m' : '\x1b[37m';
            const dateStr = todo.dueDate ? ` due: ${new Date(todo.dueDate).toLocaleDateString()}` : '';
            const line = `│ ${status} ${todo.text.padEnd(40)}${priorityColor}${dateStr}\x1b[0m │`;
            this.terminal.writeln(`\x1b[36m${line}\x1b[0m`);
        });

        this.terminal.writeln('\x1b[36m└─────────────────────────────────────────────────────────────┘\x1b[0m');
    }

    autoAdjustPriorities() {
        const now = new Date();
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        this.todos.forEach(todo => {
            if (todo.completed) return;
            
            // Auto-escalate overdue tasks
            if (todo.dueDate && new Date(todo.dueDate) < now && todo.priority !== 'high') {
                todo.priority = 'high';
                this.terminal.writeln(`\x1b[33m⚡ Auto-escalated overdue task: ${todo.text}\x1b[0m`);
            }
            
            // Auto-escalate due tomorrow if high energy
            if (todo.dueDate && new Date(todo.dueDate).toDateString() === tomorrow.toDateString() && 
                todo.energyLevel === 'high' && todo.priority === 'low') {
                todo.priority = 'medium';
                this.terminal.writeln(`\x1b[33m⚡ Auto-escalated tomorrow's high-energy task: ${todo.text}\x1b[0m`);
            }
        });
        
        this.generateSmartSuggestions();
    }

    generateSmartSuggestions() {
        const incompleteTodos = this.todos.filter(todo => !todo.completed);
        const highPriorityCount = incompleteTodos.filter(todo => todo.priority === 'high').length;
        const todayTodos = incompleteTodos.filter(todo => {
            const today = new Date().toISOString().split('T')[0];
            return todo.dueDate === today;
        });
        
        setTimeout(() => {
            if (highPriorityCount > 5) {
                this.terminal.writeln('\x1b[33m💡 Suggestion: You have many high-priority tasks. Consider focusing on 2-3 today.\x1b[0m');
            }
            
            if (todayTodos.length > 0) {
                this.terminal.writeln(`\x1b[36m📅 You have ${todayTodos.length} task(s) due today.\x1b[0m`);
            }

            const insight = this.ai.generateInsight(this.todos);
            if (insight) {
                this.terminal.writeln(`\x1b[36m${insight}\x1b[0m`);
            }
        }, 1000);
    }

}

new SecondBrainTerminal();