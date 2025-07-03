import * as fs from 'fs/promises';
import * as path from 'path';
import { ipcMain } from 'electron';
import type { Message, TaskMasterTask } from '../shared/types';

export interface ConversationContext {
  id: string;
  projectPath?: string;
  startTime: Date;
  lastActivity: Date;
  messages: Message[];
  tasks: string[]; // Task IDs mentioned/created in this conversation
  codeReferences: CodeReference[];
  topics: string[];
  summary?: string;
  mood: 'positive' | 'neutral' | 'frustrated' | 'focused';
}

export interface CodeReference {
  filePath: string;
  lineStart?: number;
  lineEnd?: number;
  context: string;
  timestamp: Date;
}

export interface UserPattern {
  id: string;
  type: 'workflow' | 'preference' | 'skill' | 'goal';
  pattern: string;
  confidence: number;
  frequency: number;
  lastSeen: Date;
  examples: string[];
}

export interface ProjectMemory {
  projectPath: string;
  name: string;
  type: string;
  frameworks: string[];
  lastWorked: Date;
  totalTimeSpent: number; // in minutes
  conversationCount: number;
  taskCount: number;
  codeChanges: number;
  insights: string[];
  challenges: string[];
  achievements: string[];
}

class MemorySystem {
  private memoryStorage = path.join(process.cwd(), '.engie', 'memory');
  private conversationHistory: Map<string, ConversationContext> = new Map();
  private userPatterns: Map<string, UserPattern> = new Map();
  private projectMemories: Map<string, ProjectMemory> = new Map();
  private currentConversation: ConversationContext | null = null;

  async initialize(): Promise<boolean> {
    try {
      await this.ensureStorageDirectory();
      await this.loadConversationHistory();
      await this.loadUserPatterns();
      await this.loadProjectMemories();
      this.registerIpcHandlers();
      
      console.log('Memory system initialized');
      return true;
    } catch (error) {
      console.error('Failed to initialize memory system:', error);
      return false;
    }
  }

  private async ensureStorageDirectory(): Promise<void> {
    const dirs = [
      this.memoryStorage,
      path.join(this.memoryStorage, 'conversations'),
      path.join(this.memoryStorage, 'patterns'),
      path.join(this.memoryStorage, 'projects'),
    ];

    for (const dir of dirs) {
      await fs.mkdir(dir, { recursive: true });
    }
  }

  private async loadConversationHistory(): Promise<void> {
    try {
      const conversationsDir = path.join(this.memoryStorage, 'conversations');
      const files = await fs.readdir(conversationsDir);
      
      for (const file of files) {
        if (file.endsWith('.json')) {
          const filePath = path.join(conversationsDir, file);
          const content = await fs.readFile(filePath, 'utf-8');
          const conversation = JSON.parse(content) as ConversationContext;
          
          // Convert date strings back to Date objects
          conversation.startTime = new Date(conversation.startTime);
          conversation.lastActivity = new Date(conversation.lastActivity);
          conversation.messages.forEach(msg => {
            msg.timestamp = new Date(msg.timestamp);
          });
          
          this.conversationHistory.set(conversation.id, conversation);
        }
      }
      
      console.log(`Loaded ${this.conversationHistory.size} conversation contexts`);
    } catch (error) {
      console.error('Failed to load conversation history:', error);
    }
  }

  private async loadUserPatterns(): Promise<void> {
    try {
      const patternsFile = path.join(this.memoryStorage, 'patterns', 'user-patterns.json');
      const content = await fs.readFile(patternsFile, 'utf-8');
      const patterns = JSON.parse(content) as UserPattern[];
      
      patterns.forEach(pattern => {
        pattern.lastSeen = new Date(pattern.lastSeen);
        this.userPatterns.set(pattern.id, pattern);
      });
      
      console.log(`Loaded ${this.userPatterns.size} user patterns`);
    } catch (error) {
      // File doesn't exist yet, that's okay
    }
  }

  private async loadProjectMemories(): Promise<void> {
    try {
      const projectsDir = path.join(this.memoryStorage, 'projects');
      const files = await fs.readdir(projectsDir);
      
      for (const file of files) {
        if (file.endsWith('.json')) {
          const filePath = path.join(projectsDir, file);
          const content = await fs.readFile(filePath, 'utf-8');
          const project = JSON.parse(content) as ProjectMemory;
          
          project.lastWorked = new Date(project.lastWorked);
          this.projectMemories.set(project.projectPath, project);
        }
      }
      
      console.log(`Loaded ${this.projectMemories.size} project memories`);
    } catch (error) {
      console.error('Failed to load project memories:', error);
    }
  }

  async startConversation(projectPath?: string): Promise<string> {
    // If there's already an active conversation for the same project, continue it
    if (this.currentConversation && 
        (!projectPath || this.currentConversation.projectPath === projectPath)) {
      // Update last activity and return existing conversation
      this.currentConversation.lastActivity = new Date();
      return this.currentConversation.id;
    }

    // Create new conversation only if needed
    const conversationId = `conv-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const context: ConversationContext = {
      id: conversationId,
      projectPath,
      startTime: new Date(),
      lastActivity: new Date(),
      messages: [],
      tasks: [],
      codeReferences: [],
      topics: [],
      mood: 'neutral',
    };

    this.currentConversation = context;
    this.conversationHistory.set(conversationId, context);
    
    // Update project memory if applicable
    if (projectPath) {
      await this.updateProjectMemory(projectPath, { conversationCount: 1 });
    }

    return conversationId;
  }

  async addMessage(message: Message): Promise<void> {
    if (!this.currentConversation) {
      await this.startConversation();
    }

    if (this.currentConversation) {
      this.currentConversation.messages.push(message);
      this.currentConversation.lastActivity = new Date();
      
      // Analyze message for patterns and context
      await this.analyzeMessage(message);
      
      // Save conversation periodically
      if (this.currentConversation.messages.length % 10 === 0) {
        await this.saveConversation(this.currentConversation);
      }
    }
  }

  private async analyzeMessage(message: Message): Promise<void> {
    if (!this.currentConversation) return;

    // Extract topics
    const topics = this.extractTopics(message.text);
    this.currentConversation.topics.push(...topics);

    // Detect mood
    this.currentConversation.mood = this.detectMood(message.text);

    // Extract code references
    const codeRefs = this.extractCodeReferences(message.text);
    this.currentConversation.codeReferences.push(...codeRefs);

    // Learn user patterns
    await this.learnFromMessage(message);
  }

  private extractTopics(text: string): string[] {
    const topics: string[] = [];
    const techTerms = [
      'react', 'vue', 'angular', 'typescript', 'javascript', 'python', 'java',
      'api', 'database', 'testing', 'deployment', 'bug', 'feature', 'refactor',
      'performance', 'security', 'documentation', 'optimization'
    ];

    const words = text.toLowerCase().split(/\s+/);
    
    for (const term of techTerms) {
      if (words.includes(term)) {
        topics.push(term);
      }
    }

    return topics;
  }

  private detectMood(text: string): ConversationContext['mood'] {
    const frustrated = ['error', 'bug', 'broken', 'not working', 'frustrated', 'stuck'];
    const positive = ['great', 'awesome', 'perfect', 'thanks', 'excellent', 'works'];
    const focused = ['implement', 'create', 'build', 'develop', 'fix', 'optimize'];

    const words = text.toLowerCase();

    if (frustrated.some(word => words.includes(word))) return 'frustrated';
    if (positive.some(word => words.includes(word))) return 'positive';
    if (focused.some(word => words.includes(word))) return 'focused';
    
    return 'neutral';
  }

  private extractCodeReferences(text: string): CodeReference[] {
    const refs: CodeReference[] = [];
    
    // Look for file path patterns
    const filePathRegex = /([a-zA-Z0-9_-]+\/)*[a-zA-Z0-9_-]+\.[a-zA-Z0-9]+/g;
    const matches = text.match(filePathRegex);
    
    if (matches) {
      matches.forEach(filePath => {
        refs.push({
          filePath,
          context: text,
          timestamp: new Date(),
        });
      });
    }

    return refs;
  }

  private async learnFromMessage(message: Message): Promise<void> {
    // Detect workflow patterns
    if (message.type === 'user') {
      await this.detectWorkflowPattern(message.text);
      await this.detectPreferences(message.text);
    }
  }

  private async detectWorkflowPattern(text: string): Promise<void> {
    const workflowKeywords = [
      'first', 'then', 'next', 'after', 'before', 'finally',
      'start by', 'begin with', 'always', 'usually', 'typically'
    ];

    if (workflowKeywords.some(keyword => text.toLowerCase().includes(keyword))) {
      const patternId = `workflow-${Date.now()}`;
      const pattern: UserPattern = {
        id: patternId,
        type: 'workflow',
        pattern: text,
        confidence: 0.6,
        frequency: 1,
        lastSeen: new Date(),
        examples: [text],
      };

      this.userPatterns.set(patternId, pattern);
    }
  }

  private async detectPreferences(text: string): Promise<void> {
    const preferenceIndicators = [
      'prefer', 'like', 'always use', 'never use', 'avoid',
      'better', 'worse', 'favorite', 'best practice'
    ];

    if (preferenceIndicators.some(indicator => text.toLowerCase().includes(indicator))) {
      const patternId = `preference-${Date.now()}`;
      const pattern: UserPattern = {
        id: patternId,
        type: 'preference',
        pattern: text,
        confidence: 0.7,
        frequency: 1,
        lastSeen: new Date(),
        examples: [text],
      };

      this.userPatterns.set(patternId, pattern);
    }
  }

  async getConversationContext(conversationId?: string): Promise<ConversationContext | null> {
    if (conversationId) {
      return this.conversationHistory.get(conversationId) || null;
    }
    return this.currentConversation;
  }

  async getRelevantContext(query: string, projectPath?: string): Promise<{
    conversations: ConversationContext[];
    patterns: UserPattern[];
    insights: string[];
  }> {
    const relevantConversations: ConversationContext[] = [];
    const relevantPatterns: UserPattern[] = [];
    const insights: string[] = [];

    // Find relevant conversations
    for (const conversation of this.conversationHistory.values()) {
      if (projectPath && conversation.projectPath !== projectPath) continue;
      
      const relevance = this.calculateConversationRelevance(query, conversation);
      if (relevance > 0.3) {
        relevantConversations.push(conversation);
      }
    }

    // Find relevant patterns
    for (const pattern of this.userPatterns.values()) {
      const relevance = this.calculatePatternRelevance(query, pattern);
      if (relevance > 0.4) {
        relevantPatterns.push(pattern);
      }
    }

    // Generate insights
    if (projectPath) {
      const projectMemory = this.projectMemories.get(projectPath);
      if (projectMemory) {
        insights.push(...projectMemory.insights);
      }
    }

    return {
      conversations: relevantConversations.sort((a, b) => 
        b.lastActivity.getTime() - a.lastActivity.getTime()
      ).slice(0, 5),
      patterns: relevantPatterns.sort((a, b) => b.confidence - a.confidence).slice(0, 3),
      insights: insights.slice(0, 5),
    };
  }

  private calculateConversationRelevance(query: string, conversation: ConversationContext): number {
    const queryWords = query.toLowerCase().split(/\s+/);
    let score = 0;

    // Check topics
    for (const topic of conversation.topics) {
      if (queryWords.includes(topic.toLowerCase())) {
        score += 0.3;
      }
    }

    // Check recent messages
    const recentMessages = conversation.messages.slice(-5);
    for (const message of recentMessages) {
      const messageWords = message.text.toLowerCase().split(/\s+/);
      const commonWords = queryWords.filter(word => messageWords.includes(word));
      score += (commonWords.length / queryWords.length) * 0.2;
    }

    // Bonus for recent conversations
    const daysSinceLastActivity = (Date.now() - conversation.lastActivity.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceLastActivity < 7) {
      score += 0.1;
    }

    return Math.min(score, 1.0);
  }

  private calculatePatternRelevance(query: string, pattern: UserPattern): number {
    const queryWords = query.toLowerCase().split(/\s+/);
    const patternWords = pattern.pattern.toLowerCase().split(/\s+/);
    
    const commonWords = queryWords.filter(word => patternWords.includes(word));
    const relevance = (commonWords.length / queryWords.length) * pattern.confidence;
    
    return relevance;
  }

  async updateProjectMemory(projectPath: string, updates: Partial<ProjectMemory>): Promise<void> {
    let memory = this.projectMemories.get(projectPath);
    
    if (!memory) {
      memory = {
        projectPath,
        name: path.basename(projectPath),
        type: 'unknown',
        frameworks: [],
        lastWorked: new Date(),
        totalTimeSpent: 0,
        conversationCount: 0,
        taskCount: 0,
        codeChanges: 0,
        insights: [],
        challenges: [],
        achievements: [],
      };
    }

    // Apply updates
    Object.assign(memory, updates);
    memory.lastWorked = new Date();

    this.projectMemories.set(projectPath, memory);
    await this.saveProjectMemory(memory);
  }

  async addInsight(projectPath: string, insight: string): Promise<void> {
    const memory = this.projectMemories.get(projectPath);
    if (memory) {
      memory.insights.push(insight);
      if (memory.insights.length > 10) {
        memory.insights = memory.insights.slice(-10); // Keep last 10
      }
      await this.saveProjectMemory(memory);
    }
  }

  async recordTaskActivity(projectPath: string, taskId: string): Promise<void> {
    if (this.currentConversation) {
      this.currentConversation.tasks.push(taskId);
    }
    
    await this.updateProjectMemory(projectPath, { taskCount: 1 });
  }

  private async saveConversation(conversation: ConversationContext): Promise<void> {
    try {
      const filePath = path.join(this.memoryStorage, 'conversations', `${conversation.id}.json`);
      await fs.writeFile(filePath, JSON.stringify(conversation, null, 2));
    } catch (error) {
      console.error('Failed to save conversation:', error);
    }
  }

  private async saveUserPatterns(): Promise<void> {
    try {
      const filePath = path.join(this.memoryStorage, 'patterns', 'user-patterns.json');
      const patterns = Array.from(this.userPatterns.values());
      await fs.writeFile(filePath, JSON.stringify(patterns, null, 2));
    } catch (error) {
      console.error('Failed to save user patterns:', error);
    }
  }

  private async saveProjectMemory(memory: ProjectMemory): Promise<void> {
    try {
      const fileName = memory.projectPath.replace(/[/\\]/g, '_') + '.json';
      const filePath = path.join(this.memoryStorage, 'projects', fileName);
      await fs.writeFile(filePath, JSON.stringify(memory, null, 2));
    } catch (error) {
      console.error('Failed to save project memory:', error);
    }
  }

  async endConversation(): Promise<void> {
    if (this.currentConversation) {
      // Generate summary if conversation is long enough
      if (this.currentConversation.messages.length >= 5) {
        this.currentConversation.summary = await this.generateConversationSummary(this.currentConversation);
      }

      await this.saveConversation(this.currentConversation);
      await this.saveUserPatterns();
      
      this.currentConversation = null;
    }
  }

  async pauseConversation(): Promise<void> {
    // Save conversation but don't end it - for tab switching
    if (this.currentConversation) {
      await this.saveConversation(this.currentConversation);
    }
  }

  private async generateConversationSummary(conversation: ConversationContext): Promise<string> {
    try {
      const recentMessages = conversation.messages.slice(-10);
      const messageText = recentMessages.map(m => `${m.type}: ${m.text}`).join('\n');

      // Use Claude to generate summary (fallback to simple summary if not available)
      const summary = `Conversation about ${conversation.topics.join(', ')} in ${conversation.projectPath || 'general context'}. ${recentMessages.length} messages exchanged.`;
      
      return summary;
    } catch {
      return 'Conversation summary not available';
    }
  }

  registerIpcHandlers(): void {
    ipcMain.handle('memory:startConversation', async (_, projectPath?: string) => {
      return await this.startConversation(projectPath);
    });

    ipcMain.handle('memory:addMessage', async (_, message: Message) => {
      return await this.addMessage(message);
    });

    ipcMain.handle('memory:getContext', async (_, conversationId?: string) => {
      return await this.getConversationContext(conversationId);
    });

    ipcMain.handle('memory:getRelevantContext', async (_, query: string, projectPath?: string) => {
      return await this.getRelevantContext(query, projectPath);
    });

    ipcMain.handle('memory:updateProject', async (_, projectPath: string, updates: Partial<ProjectMemory>) => {
      return await this.updateProjectMemory(projectPath, updates);
    });

    ipcMain.handle('memory:addInsight', async (_, projectPath: string, insight: string) => {
      return await this.addInsight(projectPath, insight);
    });

    ipcMain.handle('memory:recordTask', async (_, projectPath: string, taskId: string) => {
      return await this.recordTaskActivity(projectPath, taskId);
    });

    ipcMain.handle('memory:endConversation', async () => {
      return await this.endConversation();
    });

    ipcMain.handle('memory:pauseConversation', async () => {
      return await this.pauseConversation();
    });
  }
}

export const memorySystem = new MemorySystem();