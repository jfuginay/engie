const { ipcRenderer } = require('electron');
const AIProcessor = require('../ai-processor');

class SimpleTerminal {
    constructor() {
        this.terminal = document.getElementById('terminal');
        this.ai = new AIProcessor();
        this.todos = [];
        this.commandHistory = [];
        this.historyIndex = -1;
        this.taskListElement = null;
        this.refreshInterval = null;
        
        this.init();
    }

    async init() {
        await this.loadData();
        this.showWelcome();
        this.createTaskVisualizer();
        this.createPrompt();
        this.startRefreshTimer();
    }

    async loadData() {
        const todos = await ipcRenderer.invoke('read-file', 'todos.json');
        if (todos) this.todos = todos;
    }

    async saveData() {
        await ipcRenderer.invoke('write-file', 'todos.json', this.todos);
        this.updateTaskVisualizer();
    }

    showWelcome() {
        this.writeln('<span class="success">╔══════════════════════════════════════════════════════════════╗</span>');
        this.writeln('<span class="success">║                     SecondBrain v1.0                         ║</span>');
        this.writeln('<span class="success">║              AI-Powered Todo Management System               ║</span>');
        this.writeln('<span class="success">╚══════════════════════════════════════════════════════════════╝</span>');
        this.writeln('');
        this.writeln('<span class="info">Type "help" for commands or just speak naturally:</span>');
        this.writeln('<span class="output">• "add meeting with sarah tomorrow at 3pm"</span>');
        this.writeln('<span class="output">• "show me my tasks for today"</span>');
        this.writeln('<span class="output">• "make the presentation task urgent"</span>');
        this.writeln('');
    }

    createTaskVisualizer() {
        const visualizerContainer = document.createElement('div');
        visualizerContainer.id = 'task-visualizer';
        visualizerContainer.style.cssText = `
            border: 1px solid #444;
            border-radius: 8px;
            margin: 10px 0;
            padding: 15px;
            background: #2a2a2a;
            min-height: 150px;
        `;
        
        this.taskListElement = document.createElement('div');
        this.taskListElement.id = 'task-list';
        
        const header = document.createElement('div');
        header.innerHTML = '<span class="info">📋 ACTIVE TASKS (auto-refreshing)</span>';
        header.style.marginBottom = '10px';
        
        visualizerContainer.appendChild(header);
        visualizerContainer.appendChild(this.taskListElement);
        this.terminal.appendChild(visualizerContainer);
        
        this.updateTaskVisualizer();
    }

    updateTaskVisualizer() {
        if (!this.taskListElement) return;
        
        const incompleteTodos = this.todos.filter(todo => !todo.completed);
        const completedTodos = this.todos.filter(todo => todo.completed);
        
        if (incompleteTodos.length === 0) {
            this.taskListElement.innerHTML = '<span class="warning">🎉 No active tasks! You\'re all caught up.</span>';
            return;
        }

        let html = '';
        
        // Group by priority
        const highPriority = incompleteTodos.filter(t => t.priority === 'high');
        const mediumPriority = incompleteTodos.filter(t => t.priority === 'medium');
        const lowPriority = incompleteTodos.filter(t => t.priority === 'low');
        
        if (highPriority.length > 0) {
            html += '<div style="margin-bottom: 8px;"><span class="error">🔥 HIGH PRIORITY:</span></div>';
            highPriority.forEach((todo, index) => {
                const dateStr = todo.dueDate ? ` <span class="warning">(due: ${new Date(todo.dueDate).toLocaleDateString()})</span>` : '';
                const realIndex = this.todos.indexOf(todo) + 1;
                html += `<div style="margin-left: 15px; margin-bottom: 3px;">
                    <span class="output">[${realIndex}]</span> <span class="error">${todo.text}</span>${dateStr}
                </div>`;
            });
        }
        
        if (mediumPriority.length > 0) {
            html += '<div style="margin-bottom: 8px; margin-top: 10px;"><span class="warning">⚡ MEDIUM PRIORITY:</span></div>';
            mediumPriority.forEach((todo, index) => {
                const dateStr = todo.dueDate ? ` <span class="info">(due: ${new Date(todo.dueDate).toLocaleDateString()})</span>` : '';
                const realIndex = this.todos.indexOf(todo) + 1;
                html += `<div style="margin-left: 15px; margin-bottom: 3px;">
                    <span class="output">[${realIndex}]</span> <span class="warning">${todo.text}</span>${dateStr}
                </div>`;
            });
        }
        
        if (lowPriority.length > 0) {
            html += '<div style="margin-bottom: 8px; margin-top: 10px;"><span class="output">📋 LOW PRIORITY:</span></div>';
            lowPriority.forEach((todo, index) => {
                const dateStr = todo.dueDate ? ` <span class="output">(due: ${new Date(todo.dueDate).toLocaleDateString()})</span>` : '';
                const realIndex = this.todos.indexOf(todo) + 1;
                html += `<div style="margin-left: 15px; margin-bottom: 3px;">
                    <span class="output">[${realIndex}]</span> ${todo.text}${dateStr}
                </div>`;
            });
        }
        
        // Show summary stats
        html += `<div style="margin-top: 15px; padding-top: 10px; border-top: 1px solid #444;">
            <span class="info">📊 Total: ${this.todos.length} | Active: ${incompleteTodos.length} | Completed: ${completedTodos.length}</span>
        </div>`;
        
        this.taskListElement.innerHTML = html;
        this.scrollToBottom();
    }

    startRefreshTimer() {
        // Auto-refresh every 5 seconds
        this.refreshInterval = setInterval(() => {
            this.updateTaskVisualizer();
        }, 5000);
    }

    stopRefreshTimer() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }
    }

    writeln(text) {
        const line = document.createElement('div');
        line.innerHTML = text;
        line.className = 'output';
        this.terminal.appendChild(line);
        this.scrollToBottom();
    }

    createPrompt() {
        const promptLine = document.createElement('div');
        promptLine.className = 'input-line';
        promptLine.innerHTML = '<span class="warning">brain</span> <span class="info">❯</span> ';
        
        const input = document.createElement('input');
        input.type = 'text';
        input.autocomplete = 'off';
        input.addEventListener('keydown', this.handleKeyDown.bind(this));
        
        promptLine.appendChild(input);
        this.terminal.appendChild(promptLine);
        input.focus();
        this.scrollToBottom();
    }

    handleKeyDown(event) {
        if (event.key === 'Enter') {
            const command = event.target.value.trim();
            if (command) {
                this.commandHistory.unshift(command);
                if (this.commandHistory.length > 100) {
                    this.commandHistory.pop();
                }
            }
            
            // Display the command
            this.writeln(`<span class="warning">brain</span> <span class="info">❯</span> <span class="command">${command}</span>`);
            
            // Process the command
            this.processCommand(command);
            
            // Remove current input line
            event.target.parentElement.remove();
            
            // Create new prompt
            setTimeout(() => this.createPrompt(), 100);
        } else if (event.key === 'ArrowUp') {
            event.preventDefault();
            if (this.historyIndex < this.commandHistory.length - 1) {
                this.historyIndex++;
                event.target.value = this.commandHistory[this.historyIndex] || '';
            }
        } else if (event.key === 'ArrowDown') {
            event.preventDefault();
            if (this.historyIndex > 0) {
                this.historyIndex--;
                event.target.value = this.commandHistory[this.historyIndex] || '';
            } else if (this.historyIndex === 0) {
                this.historyIndex = -1;
                event.target.value = '';
            }
        }
    }

    async processCommand(command) {
        if (!command) return;

        const lowerCommand = command.toLowerCase();

        if (lowerCommand === 'help') {
            this.showHelp();
        } else if (lowerCommand === 'list' || lowerCommand === 'ls') {
            this.listTodos();
            this.updateTaskVisualizer();
        } else if (lowerCommand === 'clear') {
            this.terminal.innerHTML = '';
            this.showWelcome();
            this.createTaskVisualizer();
        } else if (lowerCommand === 'status') {
            this.showStatus();
        } else if (lowerCommand.startsWith('complete ')) {
            const id = parseInt(lowerCommand.split(' ')[1]);
            this.completeTodo(id);
        } else if (lowerCommand.startsWith('delete ')) {
            const id = parseInt(lowerCommand.split(' ')[1]);
            this.deleteTodo(id);
        } else {
            await this.processNaturalLanguage(command);
        }

        await this.saveData();
    }

    showHelp() {
        this.writeln('<span class="info">╔═══════════════════ SecondBrain Commands ══════════════════════╗</span>');
        this.writeln('<span class="info">║ help                 - Show this help menu                    ║</span>');
        this.writeln('<span class="info">║ list / ls           - Show all todos                         ║</span>');
        this.writeln('<span class="info">║ status              - Show productivity insights             ║</span>');
        this.writeln('<span class="info">║ complete <id>       - Mark todo as complete                  ║</span>');
        this.writeln('<span class="info">║ delete <id>         - Delete a todo                         ║</span>');
        this.writeln('<span class="info">║ clear               - Clear terminal                         ║</span>');
        this.writeln('<span class="info">╠══════════════════ Natural Language Examples ═════════════════╣</span>');
        this.writeln('<span class="info">║ "add call mom tomorrow"                                       ║</span>');
        this.writeln('<span class="info">║ "show me urgent tasks"                                        ║</span>');
        this.writeln('<span class="info">║ "make task 1 high priority"                                   ║</span>');
        this.writeln('<span class="info">║ "move gym to Friday"                                          ║</span>');
        this.writeln('<span class="info">╚═══════════════════════════════════════════════════════════════╝</span>');
    }

    listTodos() {
        if (this.todos.length === 0) {
            this.writeln('<span class="warning">No todos found. Add some with natural language!</span>');
            return;
        }

        this.writeln('<span class="info">┌─────────────────────────────────────────────────────────────┐</span>');
        this.writeln('<span class="info">│                        TODO LIST                            │</span>');
        this.writeln('<span class="info">├─────────────────────────────────────────────────────────────┤</span>');

        this.todos.forEach((todo, index) => {
            const status = todo.completed ? '✓' : (todo.priority === 'high' ? '🔥' : todo.priority === 'medium' ? '⚡' : '📋');
            const priorityClass = todo.priority === 'high' ? 'error' : todo.priority === 'medium' ? 'warning' : 'output';
            const dateStr = todo.dueDate ? ` due: ${new Date(todo.dueDate).toLocaleDateString()}` : '';
            const line = `│ [${index + 1}] ${status} ${todo.text.padEnd(35)}<span class="${priorityClass}">${dateStr}</span> │`;
            this.writeln(`<span class="info">${line}</span>`);
        });

        this.writeln('<span class="info">└─────────────────────────────────────────────────────────────┘</span>');
    }

    showStatus() {
        const total = this.todos.length;
        const completed = this.todos.filter(t => t.completed).length;
        const high = this.todos.filter(t => !t.completed && t.priority === 'high').length;
        const overdue = this.todos.filter(t => !t.completed && t.dueDate && new Date(t.dueDate) < new Date()).length;

        this.writeln('<span class="info">📊 Your SecondBrain Status:</span>');
        this.writeln(`   Total tasks: ${total}`);
        this.writeln(`   Completed: ${completed} (${total ? Math.round(completed/total*100) : 0}%)`);
        this.writeln(`   <span class="error">High priority: ${high}</span>`);
        this.writeln(`   <span class="error">Overdue: ${overdue}</span>`);
        
        if (total > 0) {
            const productivity = Math.round(completed / total * 100);
            if (productivity >= 80) {
                this.writeln('<span class="success">🚀 You\'re crushing it!</span>');
            } else if (productivity >= 60) {
                this.writeln('<span class="warning">⚡ Good momentum, keep it up!</span>');
            } else {
                this.writeln('<span class="error">🎯 Time to focus up!</span>');
            }
        }
    }

    completeTodo(id) {
        const index = id - 1;
        if (index >= 0 && index < this.todos.length) {
            this.todos[index].completed = true;
            this.todos[index].completedAt = new Date().toISOString();
            this.writeln(`<span class="success">✓ Completed: ${this.todos[index].text}</span>`);
        } else {
            this.writeln('<span class="error">Todo not found</span>');
        }
    }

    deleteTodo(id) {
        const index = id - 1;
        if (index >= 0 && index < this.todos.length) {
            const deleted = this.todos.splice(index, 1)[0];
            this.writeln(`<span class="warning">🗑️  Deleted: ${deleted.text}</span>`);
        } else {
            this.writeln('<span class="error">Todo not found</span>');
        }
    }

    async processNaturalLanguage(input) {
        this.writeln('<span class="warning">🧠 SecondBrain is thinking...</span>');
        
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
                    this.writeln(`<span class="info">💡 ${result.message}</span>`);
                    break;
                default:
                    this.writeln('<span class="warning">🤔 I\'m still learning that command. Try "help" for examples.</span>');
            }
        } catch (error) {
            this.writeln('<span class="error">❌ Error processing command. Try again.</span>');
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
            this.writeln(`<span class="success">✓ Added: ${todo.text}</span>`);
            
            if (todo.dueDate) {
                this.writeln(`   Due: ${new Date(todo.dueDate).toLocaleDateString()}`);
            }
            this.writeln(`   Priority: ${todo.priority} | Duration: ${todo.estimatedDuration}`);
            
            if (todo.tags.length > 0) {
                this.writeln(`   Tags: ${todo.tags.join(', ')}`);
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
            this.writeln(`<span class="success">✓ Updated: ${todo.text}</span>`);
            this.autoAdjustPriorities();
        } else {
            this.writeln('<span class="error">Todo not found</span>');
        }
    }

    displayFilteredTodos(todos) {
        if (todos.length === 0) {
            this.writeln('<span class="warning">No matching todos found.</span>');
            return;
        }

        this.writeln('<span class="info">┌─────────────────────────────────────────────────────────────┐</span>');
        this.writeln('<span class="info">│                     FILTERED TODOS                          │</span>');
        this.writeln('<span class="info">├─────────────────────────────────────────────────────────────┤</span>');

        todos.forEach((todo, index) => {
            const status = todo.priority === 'high' ? '🔥' : todo.priority === 'medium' ? '⚡' : '📋';
            const priorityClass = todo.priority === 'high' ? 'error' : todo.priority === 'medium' ? 'warning' : 'output';
            const dateStr = todo.dueDate ? ` due: ${new Date(todo.dueDate).toLocaleDateString()}` : '';
            const line = `│ ${status} ${todo.text.padEnd(40)}<span class="${priorityClass}">${dateStr}</span> │`;
            this.writeln(`<span class="info">${line}</span>`);
        });

        this.writeln('<span class="info">└─────────────────────────────────────────────────────────────┘</span>');
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
                this.writeln(`<span class="warning">⚡ Auto-escalated overdue task: ${todo.text}</span>`);
            }
            
            // Auto-escalate due tomorrow if high energy
            if (todo.dueDate && new Date(todo.dueDate).toDateString() === tomorrow.toDateString() && 
                todo.energyLevel === 'high' && todo.priority === 'low') {
                todo.priority = 'medium';
                this.writeln(`<span class="warning">⚡ Auto-escalated tomorrow's high-energy task: ${todo.text}</span>`);
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
                this.writeln('<span class="warning">💡 Suggestion: You have many high-priority tasks. Consider focusing on 2-3 today.</span>');
            }
            
            if (todayTodos.length > 0) {
                this.writeln(`<span class="info">📅 You have ${todayTodos.length} task(s) due today.</span>`);
            }

            const insight = this.ai.generateInsight(this.todos);
            if (insight) {
                this.writeln(`<span class="info">${insight}</span>`);
            }
        }, 1000);
    }

    scrollToBottom() {
        this.terminal.scrollTop = this.terminal.scrollHeight;
    }
}

new SimpleTerminal();