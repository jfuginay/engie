import { ipcMain } from 'electron';
import type { TaskMasterTask } from '../shared/types';

interface SimpleTask extends TaskMasterTask {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in-progress' | 'done' | 'blocked' | 'deferred' | 'cancelled' | 'review';
  priority: 'high' | 'medium' | 'low';
  createdAt: Date;
  updatedAt: Date;
}

class SimpleTaskManager {
  private tasks: Map<string, SimpleTask> = new Map();
  private nextId = 1;

  constructor() {
    this.loadTasks();
  }

  async initialize(): Promise<boolean> {
    console.log('Simple Task Manager: Initializing...');
    this.loadTasks();
    console.log('Simple Task Manager: Initialized successfully');
    return true;
  }

  private generateId(): string {
    return `task-${Date.now()}-${this.nextId++}`;
  }

  private loadTasks(): void {
    // In a real app, this would load from a file or database
    // For now, we'll start with an empty list
    console.log('Simple Task Manager: Initialized with in-memory storage');
  }

  private saveTasks(): void {
    // In a real app, this would save to a file or database
    // For now, we'll just log
    console.log(`Simple Task Manager: ${this.tasks.size} tasks in memory`);
  }

  async getTasks(): Promise<SimpleTask[]> {
    const taskList = Array.from(this.tasks.values()).sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
    );
    console.log(`Simple Task Manager: Retrieved ${taskList.length} tasks`);
    return taskList;
  }

  async getTask(id: string): Promise<SimpleTask | null> {
    return this.tasks.get(id) || null;
  }

  async createTask(
    description: string, 
    priority: 'high' | 'medium' | 'low' = 'medium'
  ): Promise<SimpleTask> {
    const id = this.generateId();
    const now = new Date();
    
    const task: SimpleTask = {
      id,
      title: description.length > 60 ? description.substring(0, 60) + '...' : description,
      description,
      status: 'pending',
      priority,
      dependencies: [],
      subtasks: [],
      details: '',
      testStrategy: '',
      createdAt: now,
      updatedAt: now,
    };

    this.tasks.set(id, task);
    this.saveTasks();
    
    console.log(`Simple Task Manager: Created task "${task.title}" with ID ${task.id}`);
    return task;
  }

  async updateTask(
    id: string, 
    updates: { 
      title?: string; 
      description?: string; 
      priority?: 'high' | 'medium' | 'low';
      status?: 'pending' | 'in-progress' | 'done' | 'blocked' | 'deferred' | 'cancelled' | 'review';
    }
  ): Promise<SimpleTask | null> {
    const task = this.tasks.get(id);
    if (!task) {
      console.warn(`Simple Task Manager: Task ${id} not found for update`);
      return null;
    }

    if (updates.title) task.title = updates.title;
    if (updates.description) task.description = updates.description;
    if (updates.priority) task.priority = updates.priority;
    if (updates.status) task.status = updates.status;
    task.updatedAt = new Date();

    this.tasks.set(id, task);
    this.saveTasks();
    
    console.log(`Simple Task Manager: Updated task ${id}: "${task.title}"`);
    return task;
  }

  async updateTaskStatus(id: string, status: SimpleTask['status']): Promise<boolean> {
    const task = this.tasks.get(id);
    if (!task) {
      console.warn(`Simple Task Manager: Task ${id} not found for status update`);
      return false;
    }

    task.status = status;
    task.updatedAt = new Date();
    this.tasks.set(id, task);
    this.saveTasks();
    
    console.log(`Simple Task Manager: Updated task ${id} status to ${status}`);
    return true;
  }

  async deleteTask(id: string): Promise<boolean> {
    const deleted = this.tasks.delete(id);
    if (deleted) {
      this.saveTasks();
      console.log(`Simple Task Manager: Deleted task ${id}`);
    } else {
      console.warn(`Simple Task Manager: Task ${id} not found for deletion`);
    }
    return deleted;
  }

  async getNextTask(): Promise<SimpleTask | null> {
    const pendingTasks = Array.from(this.tasks.values())
      .filter(task => task.status === 'pending')
      .sort((a, b) => {
        // Sort by priority (high -> medium -> low), then by creation date
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
        if (priorityDiff !== 0) return priorityDiff;
        return a.createdAt.getTime() - b.createdAt.getTime();
      });

    return pendingTasks[0] || null;
  }

  async expandTask(id: string): Promise<SimpleTask | null> {
    // For now, just return the task as-is
    // In a full implementation, this would break down the task into subtasks
    const task = this.tasks.get(id);
    if (task) {
      console.log(`Simple Task Manager: Expanded task ${id} (placeholder implementation)`);
    }
    return task || null;
  }

  async analyzeComplexity(): Promise<any> {
    const tasks = await this.getTasks();
    const byStatus = tasks.reduce((acc, task) => {
      acc[task.status] = (acc[task.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const byPriority = tasks.reduce((acc, task) => {
      acc[task.priority] = (acc[task.priority] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalTasks: tasks.length,
      byStatus,
      byPriority,
      averageTaskAge: tasks.length > 0 
        ? tasks.reduce((sum, task) => sum + (Date.now() - task.createdAt.getTime()), 0) / tasks.length / (1000 * 60 * 60 * 24)
        : 0
    };
  }

  async research(query: string): Promise<string> {
    // Simple implementation - in a real app this would do actual research
    return `Research results for "${query}": This is a placeholder implementation.`;
  }

  isConnected(): boolean {
    return true; // Always connected since it's local
  }

  async debugStatus(): Promise<any> {
    const tasks = await this.getTasks();
    return {
      connection: {
        isConnected: true,
        type: 'local',
        tasksInMemory: this.tasks.size,
      },
      tasks: tasks.map(t => ({ id: t.id, title: t.title, status: t.status })),
      summary: {
        total: tasks.length,
        byStatus: tasks.reduce((acc, task) => {
          acc[task.status] = (acc[task.status] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
      }
    };
  }

  registerIpcHandlers(): void {
    console.log('Simple Task Manager: Registering IPC handlers...');

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
      return await this.updateTaskStatus(id, status as SimpleTask['status']);
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
      return await this.analyzeComplexity();
    });

    ipcMain.handle('taskMaster:research', async (_, query: string) => {
      return await this.research(query);
    });

    ipcMain.handle('taskMaster:getNextTask', async () => {
      return await this.getNextTask();
    });

    ipcMain.handle('taskMaster:isConnected', async () => {
      return this.isConnected();
    });

    ipcMain.handle('taskMaster:debugMCPStatus', async () => {
      return await this.debugStatus();
    });

    console.log('✅ Simple Task Manager: IPC handlers registered');
  }
}

export const simpleTaskManager = new SimpleTaskManager(); 