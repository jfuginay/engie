import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { spawn, ChildProcess } from 'child_process';
import { ipcMain } from 'electron';
import { apiKeyManager } from './api-key-manager';
import type { TaskMasterTask } from '../shared/types';
import { N8nClient, N8nConfig } from './services/n8n-client';

export interface MCPTaskMasterConfig {
  command: string;
  args: string[];
  env?: Record<string, string>;
}

class MCPTaskMasterClient {
  private client: Client | null = null;
  private transport: StdioClientTransport | null = null;
  private serverProcess: ChildProcess | null = null;
  private isConnected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 3;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private n8nClient: N8nClient | null = null;

  async initialize(): Promise<boolean> {
    try {
      const anthropicKey = await apiKeyManager.retrieveKey('anthropic');
      if (!anthropicKey) {
        console.error('No Anthropic API key found for TaskMaster MCP');
        return false;
      }

      // Configuration for TaskMaster MCP server using task-master-ai (most actively maintained)
      const config: MCPTaskMasterConfig = {
        command: 'npx',
        args: ['-y', 'task-master-mcp'],
        env: {
          ...process.env,
          ANTHROPIC_API_KEY: anthropicKey,
        },
      };

      // Create the transport (it will spawn the server process)
      this.transport = new StdioClientTransport({
        command: config.command,
        args: config.args,
        env: config.env,
      });

      // Create the client
      this.client = new Client(
        {
          name: 'engie-taskmaster-client',
          version: '1.0.0',
        },
        {
          capabilities: {
            tools: {
              supported: true,
            },
          },
        }
      );

      // Connect to the server
      await this.client.connect(this.transport);
      
      // Wait for server to be ready
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Verify connection by listing available tools
      const tools = await this.client.listTools();
      console.log('TaskMaster MCP tools available:', tools.tools?.map(t => t.name));
      
      this.isConnected = true;
      console.log('TaskMaster MCP server connected successfully');
      
      // Sync any unsynced tasks
      await this.syncUnsyncedTasks();
      
      return true;
    } catch (error) {
      console.error('Failed to initialize TaskMaster MCP client:', error);
      // Cleanup on failure
      await this.disconnect();
      return false;
    }
  }

  async disconnect(): Promise<void> {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    
    if (this.client) {
      try {
        await this.client.close();
      } catch (error) {
        console.error('Error closing MCP client:', error);
      }
      this.client = null;
    }

    if (this.transport) {
      try {
        await this.transport.close();
      } catch (error) {
        console.error('Error closing transport:', error);
      }
      this.transport = null;
    }

    if (this.serverProcess) {
      this.serverProcess.kill();
      this.serverProcess = null;
    }

    this.isConnected = false;
  }
  
  private async reconnect(): Promise<boolean> {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      return false;
    }
    
    this.reconnectAttempts++;
    console.log(`Attempting to reconnect to TaskMaster MCP (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    
    await this.disconnect();
    await new Promise(resolve => setTimeout(resolve, 2000 * this.reconnectAttempts)); // Exponential backoff
    
    const connected = await this.initialize();
    if (connected) {
      this.reconnectAttempts = 0;
    }
    
    return connected;
  }
  
  private scheduleReconnect(): void {
    if (this.reconnectTimeout) return;
    
    this.reconnectTimeout = setTimeout(async () => {
      this.reconnectTimeout = null;
      await this.reconnect();
    }, 5000);
  }

  async callTool(name: string, arguments_: Record<string, any>, timeoutMs: number = 10000): Promise<any> {
    if (!this.client || !this.isConnected) {
      throw new Error('TaskMaster MCP client not connected');
    }

    try {
      // Add timeout to prevent hanging
      const result = await Promise.race([
        this.client.callTool({
          name,
          arguments: arguments_,
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error(`Tool ${name} timed out after ${timeoutMs}ms`)), timeoutMs)
        )
      ]);

      return result;
    } catch (error: any) {
      console.error(`Error calling tool ${name}:`, error);
      
      // Handle connection errors
      if (error.code === 'ECONNRESET' || error.code === 'EPIPE' || error.message?.includes('transport')) {
        this.isConnected = false;
        this.scheduleReconnect();
      }
      
      throw error;
    }
  }

  // TaskMaster-specific methods
  async getTasks(): Promise<TaskMasterTask[]> {
    if (!this.isConnected) {
      console.warn('TaskMaster MCP not connected, returning empty array');
      return [];
    }
    
    try {
      // Get tasks directly from MCP - single source of truth
      const result = await this.callTool('get_tasks', {
        projectRoot: process.cwd()
      });
      const mcpTasks = this.parseTasksResponse(result);
      
      console.log(`MCP TaskMaster: Retrieved ${mcpTasks.length} tasks from task-master-ai`);
      return mcpTasks;
    } catch (error) {
      console.error('Error getting tasks from MCP:', error);
      // Return empty array instead of fallback to avoid confusion about source of truth
      return [];
    }
  }

  async getTask(id: string): Promise<TaskMasterTask | null> {
    try {
      const result = await this.callTool('get_task', { 
        id: id,
        projectRoot: process.cwd()
      });
      return this.parseTaskResponse(result);
    } catch (error) {
      console.error('Error getting task:', error);
      return null;
    }
  }

  async createTask(description: string, priority: 'high' | 'medium' | 'low' = 'medium'): Promise<TaskMasterTask | null> {
    if (!this.isConnected) {
      console.warn('TaskMaster MCP not connected, cannot create task');
      return null;
    }
    
    try {
      // Create task directly in MCP - single source of truth
      const result = await this.callTool('add_task', { 
        description,
        priority,
        projectRoot: process.cwd()
      });
      const mcpTask = this.parseTaskResponse(result);
      
      if (mcpTask) {
        console.log(`MCP TaskMaster: Created task "${mcpTask.title}" with ID ${mcpTask.id}`);
        return mcpTask;
      }
      
      return null;
    } catch (error) {
      console.error('Error creating task in MCP:', error);
      return null;
    }
  }

  async updateTaskStatus(id: string, status: TaskMasterTask['status']): Promise<boolean> {
    if (!this.isConnected) {
      console.warn('TaskMaster MCP not connected, cannot update task status');
      return false;
    }
    
    try {
      // Update task directly in MCP - single source of truth
      await this.callTool('set_task_status', { 
        id: id, 
        status,
        projectRoot: process.cwd()
      });
      
      console.log(`MCP TaskMaster: Updated task ${id} status to ${status}`);
      return true;
    } catch (error) {
      console.error('Error updating task status in MCP:', error);
      return false;
    }
  }

  async updateTask(id: string, updates: { title?: string; description?: string; priority?: 'high' | 'medium' | 'low' }): Promise<TaskMasterTask | null> {
    if (!this.isConnected) {
      console.error('❌ TaskMaster MCP not connected, cannot update task');
      throw new Error('TaskMaster MCP not connected');
    }
    
    console.log(`🔄 Attempting to update task ${id} with:`, updates);
    
    try {
      // First try: Use set_task_title if available (most direct)
      if (updates.title) {
        try {
          const titleResult = await this.callTool('set_task_title', { 
            id: id,
            title: updates.title,
            projectRoot: process.cwd()
          });
          console.log(`✅ Successfully updated task ${id} title to "${updates.title}"`);
          
          // Get the updated task
          const updatedTask = await this.getTask(id);
          if (updatedTask) {
            return updatedTask;
          }
        } catch (titleError) {
          console.warn('⚠️ set_task_title not available, trying edit_task');
        }
      }
      
      // Second try: Use edit_task tool
      try {
        const result = await this.callTool('edit_task', { 
          id: id,
          title: updates.title,
          description: updates.description,
          priority: updates.priority,
          projectRoot: process.cwd()
        });
        const updatedTask = this.parseTaskResponse(result);
        
        if (updatedTask) {
          console.log(`✅ Successfully updated task ${id} via edit_task - "${updatedTask.title}"`);
          return updatedTask;
        }
      } catch (editError) {
        console.warn('⚠️ edit_task not available, using fallback delete+recreate');
      }
      
      // Fallback: Delete and recreate (this should work with any claude-task-master version)
      console.log(`🔄 Using fallback: delete and recreate task ${id}`);
      
      // Get current task first
      const currentTask = await this.getTask(id);
      if (!currentTask) {
        console.error(`❌ Cannot get current task ${id} for fallback update`);
        throw new Error(`Task ${id} not found for update`);
      }
      
      console.log(`📋 Current task: "${currentTask.title}" -> New title: "${updates.title || currentTask.title}"`);
      
      // Delete the old task
      const deleted = await this.deleteTask(id);
      if (!deleted) {
        console.error(`❌ Failed to delete task ${id} for fallback update`);
        throw new Error(`Failed to delete task ${id} for update`);
      }
      
      // Create new task with updated information
      const newTaskDescription = updates.title || updates.description || currentTask.description || currentTask.title;
      console.log(`🆕 Creating new task with: "${newTaskDescription}"`);
      
      const newTask = await this.createTask(newTaskDescription, updates.priority || currentTask.priority);
      
      if (newTask) {
        console.log(`✅ Fallback update successful - recreated task as "${newTask.title}" (new ID: ${newTask.id})`);
        return newTask;
      } else {
        console.error(`❌ Failed to create new task during fallback update`);
        throw new Error('Failed to create new task during update');
      }
      
    } catch (error) {
      console.error(`❌ All update methods failed for task ${id}:`, error);
      throw error;
    }
  }

  async expandTask(id: string): Promise<TaskMasterTask | null> {
    try {
      const result = await this.callTool('expand_task', { 
        id: id,
        projectRoot: process.cwd()
      });
      return this.parseTaskResponse(result);
    } catch (error) {
      console.error('Error expanding task:', error);
      return null;
    }
  }

  async analyzeProjectComplexity(): Promise<any> {
    try {
      const result = await this.callTool('analyze_project_complexity', {
        projectRoot: process.cwd()
      });
      return result;
    } catch (error) {
      console.error('Error analyzing project complexity:', error);
      return null;
    }
  }

  async research(query: string): Promise<string> {
    try {
      const result = await this.callTool('research', { 
        query,
        projectRoot: process.cwd()
      });
      return result.content || result.text || 'No research results found';
    } catch (error) {
      console.error('Error performing research:', error);
      return 'Research failed';
    }
  }

  async getNextTask(): Promise<TaskMasterTask | null> {
    try {
      const result = await this.callTool('next_task', {
        projectRoot: process.cwd()
      });
      return this.parseTaskResponse(result);
    } catch (error) {
      console.error('Error getting next task:', error);
      return null;
    }
  }

  async deleteTask(id: string): Promise<boolean> {
    if (!this.isConnected) {
      console.warn('TaskMaster MCP not connected, cannot delete task');
      return false;
    }
    
    try {
      // Delete task directly from MCP - single source of truth
      await this.callTool('remove_task', {
        id: id,
        projectRoot: process.cwd()
      });
      
      console.log(`MCP TaskMaster: Deleted task ${id}`);
      return true;
    } catch (error) {
      console.error('Error deleting task from MCP:', error);
      return false;
    }
  }

  private parseTasksResponse(result: any): TaskMasterTask[] {
    try {
      const tasks = result.content || result.tasks || [];
      return tasks.map((task: any) => this.normalizeTask(task));
    } catch (error) {
      console.error('Error parsing tasks response:', error);
      return [];
    }
  }

  private parseTaskResponse(result: any): TaskMasterTask | null {
    try {
      const task = result.content || result.task || result;
      return this.normalizeTask(task);
    } catch (error) {
      console.error('Error parsing task response:', error);
      return null;
    }
  }

  private normalizeTask(task: any): TaskMasterTask {
    return {
      id: task.id || task.task_id || Date.now().toString(),
      title: task.title || task.name || task.description || 'Untitled Task',
      description: task.description || task.details || task.title || '',
      status: task.status || 'pending',
      priority: task.priority || 'medium',
      dependencies: task.dependencies || [],
      subtasks: task.subtasks?.map((st: any) => this.normalizeTask(st)) || [],
      details: task.details || task.implementation_notes || '',
      testStrategy: task.test_strategy || task.testing || '',
      createdAt: task.created_at ? new Date(task.created_at) : new Date(),
      updatedAt: task.updated_at ? new Date(task.updated_at) : new Date(),
    };
  }

  private async syncUnsyncedTasks(): Promise<void> {
    // No longer needed - MCP is the single source of truth
    // This method has been simplified since we removed local storage sync
    console.log('MCP TaskMaster: Using MCP as single source of truth, no sync needed');
  }

  async debugMCPStatus(): Promise<any> {
    const debugInfo = {
      connection: {
        isConnected: this.isConnected,
        clientExists: !!this.client,
        transportExists: !!this.transport,
        processExists: !!this.serverProcess,
        reconnectAttempts: this.reconnectAttempts,
        hasApiKey: false,
      },
      tools: null as any,
      testOperations: {
        getTasks: null as any,
        createTask: null as any,
        listTools: null as any,
      },
      errors: [] as string[],
    };

    console.log('🔍 Starting MCP TaskMaster debug check...');

    try {
      // Check API key
      const anthropicKey = await apiKeyManager.retrieveKey('anthropic');
      debugInfo.connection.hasApiKey = !!anthropicKey;
      if (!anthropicKey) {
        debugInfo.errors.push('No Anthropic API key found');
      }

      // Test basic connection
      if (this.client && this.isConnected) {
        try {
          const tools = await this.client.listTools();
          debugInfo.tools = tools.tools?.map(t => t.name) || [];
          debugInfo.testOperations.listTools = 'SUCCESS';
          console.log('✅ MCP tools available:', debugInfo.tools);
        } catch (error) {
          debugInfo.testOperations.listTools = `FAILED: ${error}`;
          debugInfo.errors.push(`List tools failed: ${error}`);
        }

        // Test getTasks
        try {
          const tasks = await this.getTasks();
          debugInfo.testOperations.getTasks = {
            status: 'SUCCESS',
            taskCount: tasks.length,
            tasks: tasks.map(t => ({ id: t.id, title: t.title, status: t.status }))
          };
          console.log(`✅ Retrieved ${tasks.length} tasks from MCP`);
        } catch (error) {
          debugInfo.testOperations.getTasks = `FAILED: ${error}`;
          debugInfo.errors.push(`Get tasks failed: ${error}`);
        }

        // Test createTask
        try {
          const testTask = await this.createTask('DEBUG TEST TASK - DELETE ME', 'low');
          if (testTask) {
            debugInfo.testOperations.createTask = {
              status: 'SUCCESS',
              taskId: testTask.id,
              title: testTask.title
            };
            console.log(`✅ Created test task: ${testTask.title} (${testTask.id})`);
            
            // Clean up test task
            try {
              await this.deleteTask(testTask.id);
              console.log(`🗑️ Cleaned up test task ${testTask.id}`);
            } catch (cleanupError) {
              console.warn(`⚠️ Could not clean up test task: ${cleanupError}`);
            }
          } else {
            debugInfo.testOperations.createTask = 'FAILED: Returned null';
            debugInfo.errors.push('Create task returned null');
          }
        } catch (error) {
          debugInfo.testOperations.createTask = `FAILED: ${error}`;
          debugInfo.errors.push(`Create task failed: ${error}`);
        }
      } else {
        debugInfo.errors.push('MCP client not connected');
      }

    } catch (error) {
      debugInfo.errors.push(`Debug check failed: ${error}`);
    }

    console.log('🔍 MCP Debug Results:', JSON.stringify(debugInfo, null, 2));
    return debugInfo;
  }

  async initializeN8n(config: N8nConfig): Promise<boolean> {
    try {
      this.n8nClient = N8nClient.getInstance(config);
      
      // Listen for n8n events
      this.n8nClient.on('connected', () => {
        console.log('N8n webhook connected');
      });
      
      this.n8nClient.on('task-sent', (data) => {
        console.log('Task sent to GitHub via n8n:', data);
      });
      
      this.n8nClient.on('task-send-error', (data) => {
        console.error('Failed to send task to GitHub:', data.error);
      });
      
      return this.n8nClient.isAvailable();
    } catch (error) {
      console.error('Failed to initialize n8n client:', error);
      return false;
    }
  }

  async sendTaskToGitHub(taskId: string, metadata?: {
    repository?: string;
    labels?: string[];
    assignees?: string[];
    milestone?: string;
  }): Promise<{ success: boolean; issueUrl?: string; error?: string }> {
    if (!this.n8nClient || !this.n8nClient.isAvailable()) {
      return { success: false, error: 'N8n client not available' };
    }

    const task = await this.getTask(taskId);
    if (!task) {
      return { success: false, error: 'Task not found' };
    }

    const response = await this.n8nClient.sendTaskToGitHub(task, metadata);
    
    // If successful, update task with GitHub issue info
    if (response.success && response.issueNumber) {
      await this.updateTask(taskId, {
        description: task.description + `\n\nGitHub Issue: ${response.issueUrl}`
      });
    }

    return response;
  }

  async sendAllTasksToGitHub(metadata?: {
    repository?: string;
    labels?: string[];
  }): Promise<{ sent: number; failed: number; results: any[] }> {
    const tasks = await this.getTasks();
    const results = [];
    let sent = 0;
    let failed = 0;

    for (const task of tasks) {
      // Only send pending tasks
      if (task.status === 'pending' || task.status === 'in-progress') {
        const result = await this.sendTaskToGitHub(task.id, metadata);
        results.push({ taskId: task.id, ...result });
        
        if (result.success) {
          sent++;
        } else {
          failed++;
        }

        // Small delay to avoid overwhelming n8n
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    return { sent, failed, results };
  }

  registerIpcHandlers(): void {
    ipcMain.handle('taskMaster:getTasks', async () => {
      return await this.getTasks();
    });

    ipcMain.handle('taskMaster:getTask', async (_, id: string) => {
      return await this.getTask(id);
    });

    ipcMain.handle('taskMaster:createTask', async (_, description: string) => {
      return await this.createTask(description);
    });

    ipcMain.handle('taskMaster:updateStatus', async (_, id: string, status: string) => {
      return await this.updateTaskStatus(id, status as TaskMasterTask['status']);
    });

    ipcMain.handle('taskMaster:updateTask', async (_, id: string, updates: { title?: string; description?: string; priority?: 'high' | 'medium' | 'low' }) => {
      return await this.updateTask(id, updates);
    });

    ipcMain.handle('taskMaster:deleteTask', async (_, id: string) => {
      return await this.deleteTask(id);
    });

    ipcMain.handle('taskMaster:expandTask', async (_, id: string) => {
      return await this.expandTask(id);
    });

    ipcMain.handle('taskMaster:analyzeComplexity', async () => {
      return await this.analyzeProjectComplexity();
    });

    ipcMain.handle('taskMaster:research', async (_, query: string) => {
      return await this.research(query);
    });

    ipcMain.handle('taskMaster:getNextTask', async () => {
      return await this.getNextTask();
    });

    ipcMain.handle('taskMaster:isConnected', async () => {
      return this.isConnected;
    });

    ipcMain.handle('taskMaster:debugMCPStatus', async () => {
      return await this.debugMCPStatus();
    });

    // N8n GitHub integration handlers
    ipcMain.handle('taskMaster:initializeN8n', async (_, config: N8nConfig) => {
      return await this.initializeN8n(config);
    });

    ipcMain.handle('taskMaster:sendTaskToGitHub', async (_, taskId: string, metadata?: any) => {
      return await this.sendTaskToGitHub(taskId, metadata);
    });

    ipcMain.handle('taskMaster:sendAllTasksToGitHub', async (_, metadata?: any) => {
      return await this.sendAllTasksToGitHub(metadata);
    });

    ipcMain.handle('taskMaster:isN8nAvailable', async () => {
      return this.n8nClient?.isAvailable() || false;
    });
  }
}

export const mcpTaskMasterClient = new MCPTaskMasterClient();