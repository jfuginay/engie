const OpenAI = require('openai');

class AIProcessor {
    constructor() {
        this.client = null;
        this.isConfigured = false;
        this.setupAI();
    }

    setupAI() {
        try {
            const apiKey = process.env.OPENAI_API_KEY;
            if (apiKey) {
                this.client = new OpenAI({ apiKey });
                this.isConfigured = true;
            }
        } catch (error) {
            console.log('AI not configured, using local processing');
        }
    }

    async processNaturalLanguage(input, existingTodos = []) {
        if (this.isConfigured && this.client) {
            return await this.processWithAI(input, existingTodos);
        } else {
            return this.processLocally(input);
        }
    }

    async processWithAI(input, existingTodos) {
        try {
            const systemPrompt = `You are SecondBrain, an AI todo management assistant. Parse user input and respond with JSON only.

For todo creation, respond with:
{
  "action": "add",
  "todos": [{
    "text": "task description",
    "priority": "low|medium|high",
    "dueDate": "YYYY-MM-DD or null",
    "tags": ["tag1", "tag2"],
    "estimated_duration": "30 minutes",
    "energy_level": "low|medium|high"
  }]
}

For todo queries, respond with:
{
  "action": "query",
  "filter": {
    "priority": "high",
    "tag": "work",
    "dueDate": "today"
  }
}

For todo modifications, respond with:
{
  "action": "modify",
  "todo_id": 1,
  "changes": {
    "priority": "high",
    "dueDate": "2025-07-03"
  }
}

For insights, respond with:
{
  "action": "insight",
  "message": "productivity analysis or suggestion"
}

Current todos: ${JSON.stringify(existingTodos.slice(0, 10))}`;

            const response = await this.client.chat.completions.create({
                model: "gpt-3.5-turbo",
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: input }
                ],
                temperature: 0.3,
                max_tokens: 500
            });

            const result = JSON.parse(response.choices[0].message.content);
            return result;
        } catch (error) {
            console.error('AI processing failed:', error);
            return this.processLocally(input);
        }
    }

    processLocally(input) {
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

    isTaskCreation(text) {
        const addWords = ['add', 'create', 'new', 'schedule', 'remember', 'todo', 'task'];
        return addWords.some(word => text.includes(word)) || 
               text.length > 10; // Assume longer text is task description
    }

    isQuery(text) {
        const queryWords = ['show', 'list', 'what', 'display', 'find', 'search'];
        return queryWords.some(word => text.includes(word));
    }

    extractTaskText(input) {
        return input.replace(/^(add |create |new |schedule |remember to |todo: |task: )/i, '').trim();
    }

    extractPriority(text) {
        if (text.includes('urgent') || text.includes('asap') || text.includes('critical') || 
            text.includes('important') || text.includes('high priority')) {
            return 'high';
        }
        if (text.includes('low priority') || text.includes('later') || text.includes('sometime') ||
            text.includes('when i have time')) {
            return 'low';
        }
        return 'medium';
    }

    extractDate(text) {
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

        // Day names
        const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
        for (let day of days) {
            if (text.includes(day)) {
                return this.getNextWeekday(day);
            }
        }

        // Time patterns (3pm, 15:00, etc.)
        const timeMatch = text.match(/(\d{1,2}):?(\d{2})?\s*(am|pm)?/i);
        if (timeMatch) {
            return today.toISOString().split('T')[0]; // Same day if time specified
        }

        return null;
    }

    extractTags(text) {
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

    estimateDuration(text) {
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
        return '30 minutes'; // Default
    }

    estimateEnergyLevel(text) {
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

    extractQueryFilter(text) {
        const filter = {};
        
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

    extractChanges(text) {
        const changes = {};
        
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

    getNextWeekday(dayName) {
        const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const targetDay = days.indexOf(dayName.toLowerCase());
        const today = new Date();
        const currentDay = today.getDay();
        const daysUntilTarget = (targetDay - currentDay + 7) % 7 || 7;
        
        const targetDate = new Date(today);
        targetDate.setDate(today.getDate() + daysUntilTarget);
        return targetDate.toISOString().split('T')[0];
    }

    generateInsight(todos) {
        const total = todos.length;
        if (total === 0) return "You're all caught up! Add some tasks to get started.";

        const completed = todos.filter(t => t.completed).length;
        const high = todos.filter(t => !t.completed && t.priority === 'high').length;
        const overdue = todos.filter(t => !t.completed && t.dueDate && new Date(t.dueDate) < new Date()).length;

        if (overdue > 3) {
            return "⚠️ You have several overdue tasks. Consider rescheduling or breaking them into smaller pieces.";
        }
        
        if (high > 5) {
            return "🎯 You have many high-priority tasks. Focus on 2-3 today to avoid overwhelm.";
        }
        
        const productivity = total > 0 ? Math.round(completed / total * 100) : 0;
        if (productivity > 80) {
            return "🚀 Excellent productivity! You're crushing your goals.";
        }
        
        return "💡 Pro tip: Try batching similar tasks together for better focus.";
    }
}

module.exports = AIProcessor;