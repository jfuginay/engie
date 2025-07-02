import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { spawn, ChildProcess } from 'child_process';
import { ipcMain } from 'electron';
import { apiKeyManager } from './api-key-manager';
import { taskStorage } from './task-storage-simple';
import type { TaskMasterTask } from '../shared/types';

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

  async initialize(): Promise<boolean> {
    try {
      const anthropicKey = await apiKeyManager.retrieveKey('anthropic');
      if (!anthropicKey) {
        console.error('No Anthropic API key found for TaskMaster MCP');
        return false;
      }

      // Configuration for TaskMaster MCP server using claude-task-master
      const config: MCPTaskMasterConfig = {
        command: 'npx',
        args: ['-y', 'task-master-ai'],
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
    // First, get tasks from local storage
    const localTasks = await taskStorage.getTasks();
    
    if (!this.isConnected) {
      console.warn('TaskMaster MCP not connected, using local storage');
      return localTasks;
    }
    
    try {
      // Get tasks from MCP
      const result = await this.callTool('get_tasks', {});
      const mcpTasks = this.parseTasksResponse(result);
      
      // Sync MCP tasks to local storage
      for (const mcpTask of mcpTasks) {
        const existingTask = await taskStorage.getTask(mcpTask.id);
        if (!existingTask) {
          await taskStorage.createTask({ ...mcpTask, syncedWithMCP: true });
        } else {
          await taskStorage.updateTask(mcpTask.id, { ...mcpTask, syncedWithMCP: true });
        }
      }
      
      // Mark local tasks that exist in MCP as synced
      const mcpTaskIds = new Set(mcpTasks.map(t => t.id));
      const tasksToSync = localTasks.filter(t => mcpTaskIds.has(t.id) && !t.syncedWithMCP);
      if (tasksToSync.length > 0) {
        await taskStorage.markTasksAsSynced(tasksToSync.map(t => t.id));
      }
      
      // Return merged list (MCP tasks + local-only tasks)
      const mergedTasks = await taskStorage.getTasks();
      return mergedTasks;
    } catch (error) {
      console.error('Error getting tasks from MCP:', error);
      // Fallback to local storage
      return localTasks;
    }
  }

  async getTask(id: string): Promise<TaskMasterTask | null> {
    try {
      const result = await this.callTool('get_task', { task_id: id });
      return this.parseTaskResponse(result);
    } catch (error) {
      console.error('Error getting task:', error);
      return null;
    }
  }

  async createTask(description: string, priority: 'high' | 'medium' | 'low' = 'medium'): Promise<TaskMasterTask | null> {
    // Create task locally first
    const localTask = await taskStorage.createTask({
      title: description,
      description,
      priority,
      status: 'pending',
      syncedWithMCP: false,
      localOnly: !this.isConnected,
    });
    
    if (!this.isConnected) {
      console.warn('TaskMaster MCP not connected, created local-only task');
      return localTask;
    }
    
    try {
      // Try to create in MCP
      const result = await this.callTool('add_task', { 
        description,
        priority 
      });
      const mcpTask = this.parseTaskResponse(result);
      
      if (mcpTask) {
        // Update local task with MCP data and mark as synced
        const updatedTask = await taskStorage.updateTask(localTask.id, {
          ...mcpTask,
          syncedWithMCP: true,
          localOnly: false,
        });
        return updatedTask;
      }
      
      return localTask;
    } catch (error) {
      console.error('Error creating task in MCP:', error);
      return localTask;
    }
  }

  async updateTaskStatus(id: string, status: TaskMasterTask['status']): Promise<boolean> {
    // Update locally first
    const updatedTask = await taskStorage.updateTask(id, { status });
    if (!updatedTask) return false;
    
    if (!this.isConnected || updatedTask.localOnly) {
      return true;
    }
    
    try {
      // Try to update in MCP
      await this.callTool('set_task_status', { 
        task_id: id, 
        status 
      });
      
      // Mark as synced
      await taskStorage.updateTask(id, { syncedWithMCP: true });
      return true;
    } catch (error) {
      console.error('Error updating task status in MCP:', error);
      // Mark as unsynced for later sync
      await taskStorage.updateTask(id, { syncedWithMCP: false });
      return true; // Still return true since local update succeeded
    }
  }

  async expandTask(id: string): Promise<TaskMasterTask | null> {
    try {
      const result = await this.callTool('expand_task', { task_id: id });
      return this.parseTaskResponse(result);
    } catch (error) {
      console.error('Error expanding task:', error);
      return null;
    }
  }

  async analyzeProjectComplexity(): Promise<any> {
    try {
      const result = await this.callTool('analyze_project_complexity', {});
      return result;
    } catch (error) {
      console.error('Error analyzing project complexity:', error);
      return null;
    }
  }

  async research(query: string): Promise<string> {
    try {
      const result = await this.callTool('research', { query });
      return result.content || result.text || 'No research results found';
    } catch (error) {
      console.error('Error performing research:', error);
      return 'Research failed';
    }
  }

  async getNextTask(): Promise<TaskMasterTask | null> {
    try {
      const result = await this.callTool('next_task', {});
      return this.parseTaskResponse(result);
    } catch (error) {
      console.error('Error getting next task:', error);
      return null;
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
    if (!this.isConnected) return;
    
    try {
      const unsyncedTasks = await taskStorage.getUnsyncedTasks();
      
      for (const task of unsyncedTasks) {
        try {
          // Create task in MCP
          const result = await this.callTool('add_task', {
            description: task.description || task.title,
            priority: task.priority,
          });
          
          const mcpTask = this.parseTaskResponse(result);
          if (mcpTask) {
            // Update local task with MCP ID
            await taskStorage.updateTask(task.id, {
              id: mcpTask.id,
              syncedWithMCP: true,
            });
            
            // Update status if different
            if (task.status !== 'pending' && task.status !== mcpTask.status) {
              await this.callTool('set_task_status', {
                task_id: mcpTask.id,
                status: task.status,
              });
            }
          }
        } catch (error) {
          console.error(`Failed to sync task ${task.id}:`, error);
        }
      }
    } catch (error) {
      console.error('Error syncing unsynced tasks:', error);
    }
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
  }
}

export const mcpTaskMasterClient = new MCPTaskMasterClient();