import { ipcMain } from 'electron';
import { claudeAIService } from './claude-ai-service';
import { simpleTaskManager } from './simple-task-manager';
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
      const taskMasterInitialized = await simpleTaskManager.initialize();

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
    try {
      // Add desire-level classification
      const isDesireLevel = this.classifyAsDesire(message);
      
      if (isDesireLevel) {
        return {
          primary_intent: 'desire_breakdown',
          required_tools: ['taskmaster', 'claude'],
          task_actions: ['create_task_hierarchy'],
          needs_project_context: true,
          follow_up_actions: ['schedule_automation'],
          desire_complexity: this.assessDesireComplexity(message),
          estimated_subtasks: this.estimateSubtaskCount(message)
        };
      }

      // Continue with existing analysis...
      return this.fallbackAnalysis(message);
    } catch (error) {
      console.warn('Message analysis failed, using fallback:', error);
      return this.fallbackAnalysis(message);
    }
  }

  private classifyAsDesire(message: string): boolean {
    const desirePatterns = [
      // High-level goal patterns
      /i want to (build|create|start|launch|develop)/i,
      /i'd like to (build|create|start|launch|develop)/i,
      /my goal is to/i,
      /i need to (build|create|start|launch|develop)/i,
      
      // Project/business patterns
      /start a (business|company|startup|project)/i,
      /launch a (product|service|app|website)/i,
      /build a (system|platform|tool|solution)/i,
      
      // Learning/skill patterns
      /learn (how to|about)/i,
      /master (the|my)/i,
      /become (a|an)/i,
      
      // Life/career patterns
      /get (better at|good at)/i,
      /improve my/i,
      /organize my/i
    ];

    return desirePatterns.some(pattern => pattern.test(message));
  }

  private assessDesireComplexity(message: string): 'simple' | 'medium' | 'complex' {
    const complexityIndicators = {
      simple: ['organize', 'clean', 'update', 'fix', 'review'],
      medium: ['learn', 'improve', 'build', 'create', 'develop'],
      complex: ['launch', 'start business', 'startup', 'company', 'master', 'become expert']
    };

    const lowerMessage = message.toLowerCase();
    
    if (complexityIndicators.complex.some(indicator => lowerMessage.includes(indicator))) {
      return 'complex';
    }
    if (complexityIndicators.medium.some(indicator => lowerMessage.includes(indicator))) {
      return 'medium';
    }
    return 'simple';
  }

  private estimateSubtaskCount(message: string): number {
    const complexity = this.assessDesireComplexity(message);
    
    switch (complexity) {
      case 'simple': return 3-8;
      case 'medium': return 8-20;
      case 'complex': return 20-50;
      default: return 10;
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
    if (lower.includes('task') || lower.includes('todo') || lower.includes('work on') || 
        lower.includes('today') || lower.includes('schedule') || lower.includes('agenda') ||
        lower.includes('priority') || lower.includes('deadline') || lower.includes('due')) {
      analysis.primary_intent = 'task_management';
      analysis.required_tools.push('taskmaster');
      
      if (lower.includes('create') || lower.includes('add') || lower.includes('new')) {
        analysis.task_actions.push('create_task');
      }
      if (lower.includes('status') || lower.includes('update') || lower.includes('done')) {
        analysis.task_actions.push('update_status');
      }
      if (lower.includes('rename') || lower.includes('change') || lower.includes('edit') || 
          lower.includes('title') || lower.includes('name') || lower.includes('call it') ||
          lower.includes('update') && (lower.includes('title') || lower.includes('name'))) {
        analysis.task_actions.push('update_task');
      }
      if (lower.includes('delete') || lower.includes('remove') || lower.includes('eliminate') ||
          lower.includes('clear') || lower.includes('trash')) {
        analysis.task_actions.push('delete_task');
      }
      if (lower.includes('list') || lower.includes('show') || lower.includes('what') ||
          lower.includes('today') || lower.includes('day') || lower.includes('my')) {
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
      // Handle desire breakdown workflow
      if (analysis.primary_intent === 'desire_breakdown') {
        return await this.processDesireBreakdown(message, analysis, context);
      }

      // Handle task management actions first (with timeout protection)
      if (analysis.task_actions?.length > 0) {
        for (const taskAction of analysis.task_actions) {
          try {
            switch (taskAction) {
              case 'create_task':
                thought += ' Creating a new task based on your request.';
                try {
                  console.log(`🆕 AI Orchestrator: Creating task with description: "${message}"`);
                  const newTask = await Promise.race([
                    simpleTaskManager.createTask(message),
                    new Promise((_, reject) => setTimeout(() => reject(new Error('Create task timeout')), 5000))
                  ]) as any;
                  if (newTask) {
                    action = `Created task: ${newTask.title || 'New Task'}`;
                    toolsUsed.push('TaskMaster');
                    console.log(`✅ AI Orchestrator: Successfully created task "${newTask.title}" (ID: ${newTask.id})`);
                    
                    // Force immediate UI refresh
                    try {
                      const { BrowserWindow } = await import('electron');
                      const mainWindow = BrowserWindow.getAllWindows()[0];
                      if (mainWindow) {
                        mainWindow.webContents.send('force-task-refresh');
                        console.log('📡 Sent force refresh signal to UI');
                      }
                    } catch (refreshError) {
                      console.warn('Could not send refresh signal:', refreshError);
                    }
                  } else {
                    console.error('❌ AI Orchestrator: Create task returned null');
                    action = 'Task creation failed - returned null';
                  }
                } catch (createError) {
                  console.error('❌ AI Orchestrator: Create task failed:', createError);
                  action = `Task creation failed: ${createError instanceof Error ? createError.message : 'Unknown error'}`;
                }
                break;
                
              case 'get_tasks':
                thought += ' Retrieving your current tasks.';
                const tasks = await Promise.race([
                  simpleTaskManager.getTasks(),
                  new Promise((_, reject) => setTimeout(() => reject(new Error('Get tasks timeout')), 5000))
                ]) as any[];
                action = `Found ${tasks.length} tasks`;
                toolsUsed.push('TaskMaster');
                break;
                
              case 'delete_task':
                thought += ' Processing task deletion request.';
                // For now, let Claude handle the specific task identification and deletion
                action = 'Task deletion request processed';
                toolsUsed.push('TaskMaster');
                break;
                
              case 'update_task':
                thought += ' Processing task update request.';
                // Let Claude handle the specific task identification and updates
                action = 'Task update request processed';
                toolsUsed.push('TaskMaster');
                break;
                
              case 'analyze_complexity':
                thought += ' Analyzing project complexity.';
                const complexity = await Promise.race([
                  simpleTaskManager.analyzeComplexity(),
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
            simpleTaskManager.research(message),
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
      
      // Add explicit instruction to use live task data only
      const taskInstruction = `\n\nIMPORTANT: Use ONLY the task data provided in currentTasks array (${enhancedContext.currentTasks?.length || 0} tasks from live MCP system). Ignore any task information from conversation memory. The currentTasks array represents the actual current state of the task system.`;
      const messageWithTaskContext = message + taskInstruction;
      const claudeResponse = await claudeAIService.sendMessage(messageWithTaskContext, enhancedContext);
      
      result = claudeResponse.content;
      toolsUsed.push('Claude');

      // Post-process Claude's response for task management actions
      if (analysis.task_actions?.includes('delete_task')) {
        const deletionResults = await this.processTaskDeletions(claudeResponse.content, enhancedContext.currentTasks);
        if (deletionResults.length > 0) {
          result += `\n\n✅ Deleted tasks: ${deletionResults.join(', ')}`;
          toolsUsed.push('Task Deletion');
          
          // Trigger immediate refresh after deletions
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
      
      if (analysis.task_actions?.includes('update_task')) {
        const updateResults = await this.processTaskUpdates(claudeResponse.content, enhancedContext.currentTasks, message);
        if (updateResults.length > 0) {
          result += `\n\n✅ Updated tasks: ${updateResults.join(', ')}`;
          toolsUsed.push('Task Update');
          
          // Trigger immediate refresh after updates
          await new Promise(resolve => setTimeout(resolve, 500)); // Longer delay for MCP operations
          
          // Force UI refresh by emitting event (if available)
          try {
            const { BrowserWindow } = await import('electron');
            const mainWindow = BrowserWindow.getAllWindows()[0];
            if (mainWindow) {
              mainWindow.webContents.send('force-task-refresh');
            }
          } catch (error) {
            console.warn('Could not send force refresh event:', error);
          }
        }
      }
      
      // Force task refresh if any task management actions occurred
      if (analysis.task_actions && analysis.task_actions.length > 0) {
        // Small delay to ensure MCP operations complete
        await new Promise(resolve => setTimeout(resolve, 200));
      }

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
      // Always include tasks for better context, especially for work-related queries
      try {
        enhancedContext.currentTasks = await Promise.race([
          simpleTaskManager.getTasks(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Context tasks timeout')), 3000))
        ]);
        
        // Debug: Log what tasks Claude will receive
        console.log('AI Orchestrator: Providing tasks to Claude:');
        enhancedContext.currentTasks.forEach((task: any, index: number) => {
          console.log(`  ${index + 1}. "${task.title}" (${task.status}, ${task.priority}) - ${task.description?.substring(0, 30)}...`);
        });
        
        // Override any cached task context with fresh MCP data
        enhancedContext.taskSource = 'live_mcp_data';
        enhancedContext.taskCount = enhancedContext.currentTasks.length;
      } catch (contextError) {
        console.warn('Could not get tasks for context:', contextError);
        enhancedContext.currentTasks = [];
      }

      // Add project analysis if needed (with timeout)
      if (analysis?.needs_project_context) {
        try {
          enhancedContext.projectComplexity = await Promise.race([
            simpleTaskManager.analyzeComplexity(),
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

  private async processTaskDeletions(claudeResponse: string, currentTasks: any[]): Promise<string[]> {
    const deletedTasks: string[] = [];
    
    if (!currentTasks || currentTasks.length === 0) {
      return deletedTasks;
    }

    try {
      // Look for task references in Claude's response
      const lowerResponse = claudeResponse.toLowerCase();
      
      for (const task of currentTasks) {
        const taskTitle = task.title?.toLowerCase() || '';
        const taskId = task.id;
        
        // Check if Claude mentioned this specific task for deletion
        if (taskTitle && (
          lowerResponse.includes(`delete "${taskTitle}"`) ||
          lowerResponse.includes(`remove "${taskTitle}"`) ||
          lowerResponse.includes(`"${taskTitle}" deleted`) ||
          lowerResponse.includes(`"${taskTitle}" removed`) ||
          (lowerResponse.includes('untitled') && taskTitle.includes('untitled')) ||
          (lowerResponse.includes('delete') && lowerResponse.includes(taskTitle))
        )) {
          try {
            const success = await simpleTaskManager.deleteTask(taskId);
            if (success) {
              deletedTasks.push(task.title || `Task ${taskId}`);
            }
          } catch (error) {
            console.error(`Failed to delete task ${taskId}:`, error);
          }
        }
      }
    } catch (error) {
      console.error('Error processing task deletions:', error);
    }

    return deletedTasks;
  }

  private async processTaskUpdates(claudeResponse: string, currentTasks: any[], message: string): Promise<string[]> {
    const updatedTasks: string[] = [];
    const failedUpdates: string[] = [];
    
    if (!currentTasks || currentTasks.length === 0) {
      console.warn('No current tasks available for update processing');
      return updatedTasks;
    }

    try {
      console.log('🔍 Processing task updates...');
      console.log('Available tasks:', currentTasks.map(t => `"${t.title}" (${t.id})`));
      
      // Look for task updates in Claude's response and original message
      const lowerResponse = claudeResponse.toLowerCase();
      const lowerMessage = message.toLowerCase();
      
      for (const task of currentTasks) {
        const taskTitle = task.title?.toLowerCase() || '';
        const taskId = task.id;
        
        // Check if this task was mentioned for update
        const isTargetTask = taskTitle && (
          lowerResponse.includes(`"${taskTitle}"`) ||
          (lowerResponse.includes('untitled') && taskTitle.includes('untitled')) ||
          (lowerResponse.includes('task') && lowerResponse.includes('updated')) ||
          (lowerMessage.includes('title') && taskTitle.includes('untitled'))
        );
        
        if (isTargetTask) {
          console.log(`🎯 Identified task for update: "${task.title}" (${taskId})`);
          
          try {
            // Extract new title from message or Claude's response
            let newTitle = this.extractNewTitle(message, claudeResponse, taskTitle);
            
            if (newTitle && newTitle !== task.title) {
              console.log(`📝 Updating "${task.title}" → "${newTitle}"`);
              
              const updates = { title: newTitle };
              const updatedTask = await simpleTaskManager.updateTask(taskId, updates);
              
              if (updatedTask) {
                updatedTasks.push(`"${task.title}" → "${updatedTask.title}"`);
                console.log(`✅ Successfully updated task: "${task.title}" → "${updatedTask.title}"`);
              } else {
                failedUpdates.push(`"${task.title}" (no result returned)`);
                console.error(`❌ Update returned null for task ${taskId}`);
              }
            } else if (!newTitle) {
              console.warn(`⚠️ Could not extract new title from message for task ${taskId}`);
              failedUpdates.push(`"${task.title}" (could not extract new title)`);
            } else {
              console.log(`ℹ️ No change needed for task "${task.title}" (same title)`);
            }
          } catch (error) {
            console.error(`❌ Failed to update task ${taskId}:`, error);
            failedUpdates.push(`"${task.title}" (${error instanceof Error ? error.message : 'unknown error'})`);
          }
        }
      }
      
      // Add failed updates to the result for user feedback
      if (failedUpdates.length > 0) {
        console.error(`❌ Failed to update ${failedUpdates.length} tasks:`, failedUpdates);
        updatedTasks.push(`❌ Failed: ${failedUpdates.join(', ')}`);
      }
      
    } catch (error) {
      console.error('❌ Error processing task updates:', error);
      updatedTasks.push(`❌ Update processing failed: ${error instanceof Error ? error.message : 'unknown error'}`);
    }

    console.log(`📊 Update summary: ${updatedTasks.length} results`);
    return updatedTasks;
  }

  private extractNewTitle(message: string, claudeResponse: string, currentTitle: string): string | null {
    const lowerMessage = message.toLowerCase();
    const lowerResponse = claudeResponse.toLowerCase();
    
    // Look for patterns like "rename to", "change to", "call it", etc.
    const patterns = [
      /(?:rename|change|call|name)(?:\s+(?:it|task))?\s+to[:\s]+"([^"]+)"/i,
      /(?:rename|change|call|name)(?:\s+(?:it|task))?\s+to[:\s]+(.+)/i,
      /"(.+)"/i  // Any quoted text
    ];
    
    for (const pattern of patterns) {
      const messageMatch = message.match(pattern);
      if (messageMatch && messageMatch[1] && messageMatch[1].trim() !== currentTitle) {
        return messageMatch[1].trim();
      }
      
      const responseMatch = claudeResponse.match(pattern);
      if (responseMatch && responseMatch[1] && responseMatch[1].trim() !== currentTitle) {
        return responseMatch[1].trim();
      }
    }
    
    return null;
  }

  async getIntelligentSuggestions(context?: OrchestrationContext): Promise<string[]> {
    try {
      const suggestions = [];

      // Get tasks with timeout
      let tasks: any[] = [];
      try {
        tasks = await Promise.race([
          simpleTaskManager.getTasks(),
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
          simpleTaskManager.getNextTask(),
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

  private async processDesireBreakdown(message: string, analysis: any, context?: OrchestrationContext): Promise<EngieResponse> {
    const toolsUsed: string[] = [];
    let thought = 'Analyzing your desire and breaking it down into actionable tasks...';
    let result = '';

    try {
      // Step 1: Use Claude to break down the desire into phases and tasks
      const breakdownPrompt = this.buildDesireBreakdownPrompt(message, analysis);
      const claudeResponse = await claudeAIService.sendMessage(breakdownPrompt);
      
      // Step 2: Parse Claude's response and extract task structure
      const taskStructure = this.parseTaskStructure(claudeResponse.content);
      
      // Step 3: Create tasks in MCP TaskMaster
      const createdTasks = await this.createTaskHierarchy(taskStructure);
      
      // Step 4: Generate summary and next steps
      result = this.generateDesireBreakdownSummary(message, taskStructure, createdTasks);
      
      toolsUsed.push('Claude', 'TaskMaster', 'Desire Analysis');
      thought += ` Generated ${createdTasks.length} tasks across ${taskStructure.phases?.length || 1} phases.`;

      // Step 5: Force UI refresh to show new tasks
      try {
        const { BrowserWindow } = await import('electron');
        const mainWindow = BrowserWindow.getAllWindows()[0];
        if (mainWindow) {
          mainWindow.webContents.send('force-task-refresh');
        }
      } catch (refreshError) {
        console.warn('Could not send refresh signal:', refreshError);
      }

    } catch (error) {
      console.error('Error in desire breakdown workflow:', error);
      result = "I encountered an issue breaking down your desire. Let me try a simpler approach and create a basic task to get started.";
      
      // Fallback: create a single task
      try {
        const fallbackTask = await simpleTaskManager.createTask(message);
        if (fallbackTask) {
          result += `\n\n✓ Created initial task: "${fallbackTask.title}" - I can help break this down further if needed.`;
          toolsUsed.push('TaskMaster (fallback)');
        }
      } catch (fallbackError) {
        result += "\n\nI'm having trouble with task creation. Please try again.";
      }
    }

    return {
      thought,
      action: 'Processed desire breakdown',
      result,
      toolsUsed,
    };
  }

  private buildDesireBreakdownPrompt(message: string, analysis: any): string {
    return `You are an expert project manager and productivity coach. A user has shared their desire/goal:

"${message}"

Complexity Level: ${analysis.desire_complexity}
Estimated Subtasks: ${analysis.estimated_subtasks}

Please break this down into a structured project plan with phases and specific, actionable tasks. Format your response as JSON:

{
  "phases": [
    {
      "name": "Phase Name",
      "description": "What this phase accomplishes",
      "timeline": "estimated duration",
      "tasks": [
        {
          "title": "Specific actionable task",
          "description": "Detailed description of what to do",
          "priority": "high|medium|low",
          "estimatedHours": number,
          "dependencies": ["other task titles if any"]
        }
      ]
    }
  ],
  "summary": "Brief overview of the complete plan",
  "firstSteps": ["First 3 tasks to start immediately"],
  "successMetrics": ["How to measure progress and success"]
}

Make tasks SMART (Specific, Measurable, Achievable, Relevant, Time-bound). Focus on actionable steps, not vague goals.`;
  }

  private parseTaskStructure(claudeResponse: string): any {
    try {
      // Extract JSON from Claude's response
      const jsonMatch = claudeResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      // Fallback: create simple structure
      return {
        phases: [{
          name: "Project Execution",
          description: "Main project tasks",
          timeline: "TBD",
          tasks: [{
            title: "Break down project into tasks",
            description: "Define specific tasks and timeline for the project",
            priority: "high",
            estimatedHours: 2,
            dependencies: []
          }]
        }],
        summary: "Project breakdown needed",
        firstSteps: ["Break down project into tasks"],
        successMetrics: ["Project completion"]
      };
    } catch (error) {
      console.error('Error parsing task structure:', error);
      return this.getFallbackTaskStructure();
    }
  }

  private async createTaskHierarchy(taskStructure: any): Promise<any[]> {
    const createdTasks: any[] = [];
    
    try {
      for (const phase of taskStructure.phases || []) {
        // Create a phase header task
        const phaseTask = await simpleTaskManager.createTask(
          `${phase.name}: ${phase.description}`,
          'medium'
        );
        if (phaseTask) {
          createdTasks.push(phaseTask);
        }

        // Create individual tasks for this phase
        for (const task of phase.tasks || []) {
          const taskDescription = `${task.title} - ${task.description}`;
          const priority = task.priority || 'medium';
          
          const createdTask = await simpleTaskManager.createTask(taskDescription, priority);
          if (createdTask) {
            createdTasks.push(createdTask);
          }

          // Small delay to avoid overwhelming MCP
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
    } catch (error) {
      console.error('Error creating task hierarchy:', error);
    }

    return createdTasks;
  }

  private generateDesireBreakdownSummary(originalDesire: string, taskStructure: any, createdTasks: any[]): string {
    const phaseCount = taskStructure.phases?.length || 1;
    const taskCount = createdTasks.length;
    
    let summary = `🎯 **Desire Breakdown Complete!**\n\n`;
    summary += `Your goal: "${originalDesire}"\n\n`;
    summary += `📋 **Project Plan:**\n`;
    summary += `• ${phaseCount} phases identified\n`;
    summary += `• ${taskCount} tasks created\n`;
    summary += `• Tasks now available in your sidebar\n\n`;
    
    if (taskStructure.firstSteps?.length > 0) {
      summary += `🚀 **Recommended First Steps:**\n`;
      taskStructure.firstSteps.forEach((step: string, index: number) => {
        summary += `${index + 1}. ${step}\n`;
      });
      summary += `\n`;
    }

    if (taskStructure.successMetrics?.length > 0) {
      summary += `📊 **Success Metrics:**\n`;
      taskStructure.successMetrics.forEach((metric: string) => {
        summary += `• ${metric}\n`;
      });
      summary += `\n`;
    }

    summary += `💡 **Next Steps:**\n`;
    summary += `• Review the tasks in your sidebar\n`;
    summary += `• Start with the first recommended task\n`;
    summary += `• Ask me to "expand" any task that needs more detail\n`;
    summary += `• I can set up daily automation to help you stay on track\n\n`;
    
    summary += `Ready to turn your desire into reality! 🚀`;

    return summary;
  }

  private getFallbackTaskStructure(): any {
    return {
      phases: [{
        name: "Project Planning",
        description: "Initial project setup and planning",
        timeline: "1 week",
        tasks: [{
          title: "Define project requirements",
          description: "Clearly outline what needs to be accomplished",
          priority: "high",
          estimatedHours: 3,
          dependencies: []
        }]
      }],
      summary: "Basic project structure created",
      firstSteps: ["Define project requirements"],
      successMetrics: ["Clear project plan exists"]
    };
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