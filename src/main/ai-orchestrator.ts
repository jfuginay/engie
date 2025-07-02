import { ipcMain } from 'electron';
import { claudeAIService } from './claude-ai-service';
import { mcpTaskMasterClient } from './mcp-taskmaster-client';
import type { Message, EngieResponse } from '../shared/types';

export interface OrchestrationContext {
  currentProject?: string;
  recentCommits?: any[];
  openFiles?: string[];
  workingDirectory?: string;
  gitStatus?: any;
  projectAnalysis?: any;
}

class AIOrchestrator {
  private initialized = false;

  async initialize(): Promise<boolean> {
    try {
      // Initialize all AI services
      const claudeInitialized = await claudeAIService.initialize();
      const taskMasterInitialized = await mcpTaskMasterClient.initialize();

      this.initialized = claudeInitialized;
      
      if (!claudeInitialized) {
        console.error('Failed to initialize Claude AI service');
      }

      if (!taskMasterInitialized) {
        console.warn('TaskMaster MCP not available, using fallback');
      }

      return this.initialized;
    } catch (error) {
      console.error('Failed to initialize AI orchestrator:', error);
      return false;
    }
  }

  async processMessage(message: string, context?: OrchestrationContext): Promise<EngieResponse> {
    if (!this.initialized) {
      throw new Error('AI orchestrator not initialized');
    }

    try {
      // Analyze the message to determine intent and required tools
      const analysis = await this.analyzeMessage(message, context);
      
      // Execute the appropriate workflow
      const result = await this.executeWorkflow(analysis, message, context);
      
      return result;
    } catch (error) {
      console.error('Error processing message:', error);
      throw error;
    }
  }

  private async analyzeMessage(message: string, context?: OrchestrationContext): Promise<any> {
    // Use Claude to analyze the user's intent and determine what tools to use
    const analysisPrompt = `Analyze this user message and determine what actions should be taken. Consider the context provided.

User message: "${message}"

Context: ${context ? JSON.stringify(context, null, 2) : 'No additional context'}

Determine:
1. Primary intent (chat, task_management, code_analysis, research, project_help)
2. Required tools (taskmaster, git, code_indexer, templates)
3. Task-related actions (create_task, update_status, get_tasks, analyze_complexity)
4. Whether this requires project context or code analysis
5. Suggested follow-up actions

Respond in JSON format with your analysis.`;

    try {
      const response = await claudeAIService.sendMessage(analysisPrompt);
      
      // Try to parse JSON response, fallback to text analysis
      try {
        return JSON.parse(response.content);
      } catch {
        return this.fallbackAnalysis(message);
      }
    } catch (error) {
      console.error('Error analyzing message:', error);
      return this.fallbackAnalysis(message);
    }
  }

  private fallbackAnalysis(message: string): any {
    const lower = message.toLowerCase();
    
    const analysis = {
      primary_intent: 'chat',
      required_tools: [] as string[],
      task_actions: [] as string[],
      needs_project_context: false,
      follow_up_actions: [] as string[],
    };

    // Simple keyword-based analysis
    if (lower.includes('task') || lower.includes('todo') || lower.includes('work on')) {
      analysis.primary_intent = 'task_management';
      analysis.required_tools.push('taskmaster');
      
      if (lower.includes('create') || lower.includes('add') || lower.includes('new')) {
        analysis.task_actions.push('create_task');
      }
      if (lower.includes('status') || lower.includes('update') || lower.includes('done')) {
        analysis.task_actions.push('update_status');
      }
      if (lower.includes('list') || lower.includes('show') || lower.includes('what')) {
        analysis.task_actions.push('get_tasks');
      }
    }

    if (lower.includes('code') || lower.includes('file') || lower.includes('project')) {
      analysis.needs_project_context = true;
      analysis.required_tools.push('code_indexer');
    }

    if (lower.includes('research') || lower.includes('search') || lower.includes('find out')) {
      analysis.required_tools.push('research');
    }

    return analysis;
  }

  private async executeWorkflow(analysis: any, message: string, context?: OrchestrationContext): Promise<EngieResponse> {
    const toolsUsed: string[] = [];
    let thought = 'Analyzing your request...';
    let action = '';
    let result = '';

    try {
      // Handle task management actions first (with timeout protection)
      if (analysis.task_actions?.length > 0) {
        for (const taskAction of analysis.task_actions) {
          try {
            switch (taskAction) {
              case 'create_task':
                thought += ' Creating a new task based on your request.';
                const newTask = await Promise.race([
                  mcpTaskMasterClient.createTask(message),
                  new Promise((_, reject) => setTimeout(() => reject(new Error('Create task timeout')), 5000))
                ]) as any;
                if (newTask) {
                  action = `Created task: ${newTask.title || 'New Task'}`;
                  toolsUsed.push('TaskMaster');
                }
                break;
                
              case 'get_tasks':
                thought += ' Retrieving your current tasks.';
                const tasks = await Promise.race([
                  mcpTaskMasterClient.getTasks(),
                  new Promise((_, reject) => setTimeout(() => reject(new Error('Get tasks timeout')), 5000))
                ]) as any[];
                action = `Found ${tasks.length} tasks`;
                toolsUsed.push('TaskMaster');
                break;
                
              case 'analyze_complexity':
                thought += ' Analyzing project complexity.';
                const complexity = await Promise.race([
                  mcpTaskMasterClient.analyzeProjectComplexity(),
                  new Promise((_, reject) => setTimeout(() => reject(new Error('Complexity analysis timeout')), 5000))
                ]);
                if (complexity) {
                  action = 'Analyzed project complexity';
                  toolsUsed.push('TaskMaster', 'Project Analysis');
                }
                break;
            }
          } catch (taskError) {
            console.warn(`Task action ${taskAction} failed or timed out:`, taskError);
            thought += ` (Note: ${taskAction} service temporarily unavailable)`;
          }
        }
      }

      // Handle research requests (with timeout)
      if (analysis.required_tools?.includes('research')) {
        try {
          thought += ' Performing research to answer your question.';
          const researchResult = await Promise.race([
            mcpTaskMasterClient.research(message),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Research timeout')), 8000))
          ]);
          if (researchResult) {
            action = 'Completed research';
            toolsUsed.push('Research');
          }
        } catch (researchError) {
          console.warn('Research failed or timed out:', researchError);
          thought += ' (Note: research service temporarily unavailable)';
        }
      }

      // Get enhanced context for Claude (with safer context building)
      const enhancedContext = await this.buildEnhancedContext(context, analysis);

      // Get Claude's response with full context
      thought += ' Generating intelligent response with full context.';
      const claudeResponse = await claudeAIService.sendMessage(message, enhancedContext);
      
      result = claudeResponse.content;
      toolsUsed.push('Claude');

      // Post-process the response for any additional actions
      if (analysis.follow_up_actions?.length > 0) {
        thought += ' Planning follow-up actions.';
        // Handle follow-up actions
      }

    } catch (error) {
      console.error('Error in workflow execution:', error);
      result = "I encountered an error while processing your request. Let me try a different approach.";
      
      // Fallback to basic Claude response
      try {
        const fallbackResponse = await claudeAIService.sendMessage(message);
        result = fallbackResponse.content;
        toolsUsed.push('Claude (fallback)');
      } catch (fallbackError) {
        result = "I'm experiencing technical difficulties. Please try again.";
      }
    }

    return {
      thought,
      action,
      result,
      toolsUsed,
    };
  }

  private async buildEnhancedContext(context?: OrchestrationContext, analysis?: any): Promise<any> {
    const enhancedContext: any = {
      ...context,
      analysis,
      timestamp: new Date().toISOString(),
    };

    try {
      // Add current tasks for context (with timeout)
      if (analysis?.required_tools?.includes('taskmaster')) {
        try {
          enhancedContext.currentTasks = await Promise.race([
            mcpTaskMasterClient.getTasks(),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Context tasks timeout')), 3000))
          ]);
        } catch (contextError) {
          console.warn('Could not get tasks for context:', contextError);
          enhancedContext.currentTasks = [];
        }
      }

      // Add project analysis if needed (with timeout)
      if (analysis?.needs_project_context) {
        try {
          enhancedContext.projectComplexity = await Promise.race([
            mcpTaskMasterClient.analyzeProjectComplexity(),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Context complexity timeout')), 3000))
          ]);
        } catch (contextError) {
          console.warn('Could not get project complexity for context:', contextError);
          enhancedContext.projectComplexity = null;
        }
      }

    } catch (error) {
      console.error('Error building enhanced context:', error);
    }

    return enhancedContext;
  }

  async getIntelligentSuggestions(context?: OrchestrationContext): Promise<string[]> {
    try {
      const suggestions = [];

      // Get tasks with timeout
      let tasks: any[] = [];
      try {
        tasks = await Promise.race([
          mcpTaskMasterClient.getTasks(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Suggestions tasks timeout')), 2000))
        ]) as any[];
      } catch (error) {
        console.warn('Could not get tasks for suggestions:', error);
        return ['Focus on current tasks', 'Check your project status'];
      }

      // Get next task with timeout
      let nextTask = null;
      try {
        nextTask = await Promise.race([
          mcpTaskMasterClient.getNextTask(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Next task timeout')), 2000))
        ]) as any;
      } catch (error) {
        console.warn('Could not get next task for suggestions:', error);
      }
      
      if (nextTask) {
        suggestions.push(`Focus on: ${nextTask.title || 'Next task'}`);
      }

      const pendingTasks = tasks.filter(t => t.status === 'pending');
      if (pendingTasks.length > 3) {
        suggestions.push('Consider breaking down large tasks');
      }

      const highPriorityTasks = tasks.filter(t => t.priority === 'high' && t.status !== 'done');
      if (highPriorityTasks.length > 0) {
        suggestions.push('High priority tasks need attention');
      }

      if (suggestions.length === 0) {
        suggestions.push('All tasks are up to date!', 'Consider adding new goals');
      }

      return suggestions;
    } catch (error) {
      console.error('Error getting suggestions:', error);
      return ['Review your current progress', 'Plan your next steps'];
    }
  }

  registerIpcHandlers(): void {
    ipcMain.handle('ai:processMessage', async (_, message: string, context?: OrchestrationContext) => {
      return await this.processMessage(message, context);
    });

    ipcMain.handle('ai:getSuggestions', async (_, context?: OrchestrationContext) => {
      return await this.getIntelligentSuggestions(context);
    });

    ipcMain.handle('ai:initialize', async () => {
      return await this.initialize();
    });

    ipcMain.handle('ai:isInitialized', async () => {
      return this.initialized;
    });
  }
}

export const aiOrchestrator = new AIOrchestrator();