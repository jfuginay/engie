import Anthropic from '@anthropic-ai/sdk';
import { ipcMain } from 'electron';
import { apiKeyManager } from './api-key-manager';
import type { Message } from '../shared/types';

export interface ClaudeResponse {
  content: string;
  usage?: {
    input_tokens: number;
    output_tokens: number;
  };
  stop_reason?: string;
  model?: string;
}

export interface ClaudeStreamChunk {
  type: 'content_block_delta' | 'content_block_start' | 'content_block_stop' | 'message_start' | 'message_delta' | 'message_stop';
  delta?: {
    text?: string;
    type?: string;
  };
  content_block?: {
    type: string;
    text?: string;
  };
  message?: {
    id: string;
    type: string;
    role: string;
    content: any[];
    model: string;
    stop_reason: string | null;
    stop_sequence: string | null;
    usage: {
      input_tokens: number;
      output_tokens: number;
    };
  };
  usage?: {
    input_tokens: number;
    output_tokens: number;
  };
}

class ClaudeAIService {
  private anthropic: Anthropic | null = null;
  private conversationHistory: Message[] = [];

  async initialize(): Promise<boolean> {
    const apiKey = await apiKeyManager.retrieveKey('anthropic');
    if (!apiKey) {
      console.error('No Anthropic API key found');
      return false;
    }

    this.anthropic = new Anthropic({
      apiKey: apiKey,
    });

    return true;
  }

  async sendMessage(message: string, context?: any): Promise<ClaudeResponse> {
    if (!this.anthropic) {
      throw new Error('Claude AI service not initialized');
    }

    // Add user message to history
    const userMessage: Message = {
      id: Date.now(),
      text: message,
      type: 'user',
      timestamp: new Date(),
    };
    this.conversationHistory.push(userMessage);

    try {
      const response = await this.anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 4096,
        temperature: 0.7,
        system: this.buildSystemPrompt(context),
        messages: this.buildMessageHistory(),
      });

      const content = response.content[0];
      if (content.type !== 'text') {
        throw new Error('Unexpected response type from Claude');
      }

      const result: ClaudeResponse = {
        content: content.text,
        usage: response.usage,
        stop_reason: response.stop_reason || undefined,
        model: response.model,
      };

      // Add assistant response to history
      const assistantMessage: Message = {
        id: Date.now() + 1,
        text: content.text,
        type: 'assistant',
        timestamp: new Date(),
      };
      this.conversationHistory.push(assistantMessage);

      return result;
    } catch (error) {
      console.error('Claude API error:', error);
      throw error;
    }
  }

  async sendMessageStream(
    message: string, 
    context?: any,
    onChunk?: (chunk: ClaudeStreamChunk) => void
  ): Promise<ClaudeResponse> {
    if (!this.anthropic) {
      throw new Error('Claude AI service not initialized');
    }

    // Add user message to history
    const userMessage: Message = {
      id: Date.now(),
      text: message,
      type: 'user',
      timestamp: new Date(),
    };
    this.conversationHistory.push(userMessage);

    try {
      const stream = await this.anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 4096,
        temperature: 0.7,
        system: this.buildSystemPrompt(context),
        messages: this.buildMessageHistory(),
        stream: true,
      });

      let fullContent = '';
      let usage: any = null;
      let stopReason: string | null = null;

      for await (const chunk of stream) {
        if (onChunk) {
          onChunk(chunk as ClaudeStreamChunk);
        }

        if (chunk.type === 'content_block_delta' && chunk.delta && 'text' in chunk.delta) {
          fullContent += chunk.delta.text || '';
        } else if (chunk.type === 'message_delta' && chunk.usage) {
          usage = chunk.usage;
        } else if (chunk.type === 'message_stop') {
          // Stream ended
        }
      }

      const result: ClaudeResponse = {
        content: fullContent,
        usage: usage,
        stop_reason: stopReason || undefined,
        model: 'claude-3-5-sonnet-20241022',
      };

      // Add assistant response to history
      const assistantMessage: Message = {
        id: Date.now() + 1,
        text: fullContent,
        type: 'assistant',
        timestamp: new Date(),
      };
      this.conversationHistory.push(assistantMessage);

      return result;
    } catch (error) {
      console.error('Claude streaming error:', error);
      throw error;
    }
  }

  private buildSystemPrompt(context?: any): string {
    const basePrompt = `You are ENGIE, an Enhanced Neural Gateway for Intelligent Execution. You are a sophisticated AI assistant that helps developers manage complex projects through intelligent task management, code analysis, and proactive suggestions.

Key capabilities:
- Intelligent task creation and management
- Code analysis and pattern recognition  
- Git repository monitoring and insights
- Template generation and updates
- Contextual project understanding
- Proactive suggestions based on patterns

You have access to the following tools and context:
- TaskMaster MCP server for task management
- Git repository analysis
- Code indexing and RAG system
- Project templates and patterns
- Conversation history and learning

For task management, you can:
- View current tasks in the provided context
- Suggest task modifications, deletions, or additions
- When a user asks to delete specific tasks, identify them by their titles or IDs from the currentTasks context
- Provide clear instructions about which tasks should be deleted

Always be:
- Proactive in suggesting improvements
- Precise in task management recommendations
- Contextually aware of the current project
- Helpful in identifying patterns and optimizations
- Clear about which specific tasks you're referring to by ID or title

Current conversation context: You are integrated into a desktop application where users can chat with you, manage tasks, and get intelligent project assistance.`;

    if (context) {
      return basePrompt + `\n\nAdditional context: ${JSON.stringify(context, null, 2)}`;
    }

    return basePrompt;
  }

  private buildMessageHistory(): Array<{ role: 'user' | 'assistant'; content: string }> {
    // Keep last 10 messages for context, but not too much to avoid token limits
    const recentHistory = this.conversationHistory.slice(-10);
    
    return recentHistory.map(msg => ({
      role: msg.type === 'user' ? 'user' : 'assistant',
      content: msg.text,
    }));
  }

  getConversationHistory(): Message[] {
    return [...this.conversationHistory];
  }

  clearHistory(): void {
    this.conversationHistory = [];
  }

  registerIpcHandlers(): void {
    ipcMain.handle('claude:sendMessage', async (_, message: string, context?: any) => {
      return await this.sendMessage(message, context);
    });

    ipcMain.handle('claude:sendMessageStream', async (_, message: string, context?: any) => {
      // For streaming, we'll use a different approach with events
      return await this.sendMessage(message, context);
    });

    ipcMain.handle('claude:getHistory', async () => {
      return this.getConversationHistory();
    });

    ipcMain.handle('claude:clearHistory', async () => {
      this.clearHistory();
      return true;
    });

    ipcMain.handle('claude:initialize', async () => {
      return await this.initialize();
    });
  }
}

export const claudeAIService = new ClaudeAIService();