import type { TaskMasterTask } from '../shared/types';

export interface StoredTask extends TaskMasterTask {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  syncedWithMCP?: boolean;
  localOnly?: boolean;
}

class TaskStorage {
  private inMemoryTasks: Map<string, StoredTask> = new Map();
  private isInitialized = false;

  async initialize(): Promise<void> {
    try {
      console.log('TaskStorage initialized with in-memory storage');
      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize TaskStorage:', error);
      throw new Error('TaskStorage initialization failed');
    }
  }

  async close(): Promise<void> {
    this.inMemoryTasks.clear();
    this.isInitialized = false;
  }

  // CRUD Operations (In-Memory Implementation)
  async createTask(task: Omit<StoredTask, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): Promise<StoredTask> {
    if (!this.isInitialized) throw new Error('Storage not initialized');

    const id = task.id || Date.now().toString();
    const now = new Date();
    
    const storedTask: StoredTask = {
      id,
      title: task.title,
      description: task.description || '',
      status: task.status || 'pending',
      priority: task.priority || 'medium',
      dependencies: task.dependencies || [],
      subtasks: task.subtasks || [],
      details: task.details || '',
      testStrategy: task.testStrategy || '',
      createdAt: now,
      updatedAt: now,
      syncedWithMCP: task.syncedWithMCP || false,
      localOnly: task.localOnly || false,
    };

    this.inMemoryTasks.set(id, storedTask);
    return storedTask;
  }

  async getTask(id: string): Promise<StoredTask | null> {
    if (!this.isInitialized) throw new Error('Storage not initialized');
    return this.inMemoryTasks.get(id) || null;
  }

  async getTasks(filters?: {
    status?: string;
    priority?: string;
    syncedWithMCP?: boolean;
    localOnly?: boolean;
  }): Promise<StoredTask[]> {
    if (!this.isInitialized) throw new Error('Storage not initialized');

    let tasks = Array.from(this.inMemoryTasks.values());

    if (filters?.status) {
      tasks = tasks.filter(t => t.status === filters.status);
    }

    if (filters?.priority) {
      tasks = tasks.filter(t => t.priority === filters.priority);
    }

    if (filters?.syncedWithMCP !== undefined) {
      tasks = tasks.filter(t => t.syncedWithMCP === filters.syncedWithMCP);
    }

    if (filters?.localOnly !== undefined) {
      tasks = tasks.filter(t => t.localOnly === filters.localOnly);
    }

    return tasks.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async updateTask(id: string, updates: Partial<StoredTask>): Promise<StoredTask | null> {
    if (!this.isInitialized) throw new Error('Storage not initialized');

    const existingTask = this.inMemoryTasks.get(id);
    if (!existingTask) return null;

    const updatedTask: StoredTask = {
      ...existingTask,
      ...updates,
      id, // Ensure ID doesn't change
      updatedAt: new Date(),
    };

    this.inMemoryTasks.set(id, updatedTask);
    return updatedTask;
  }

  async deleteTask(id: string): Promise<boolean> {
    if (!this.isInitialized) throw new Error('Storage not initialized');
    return this.inMemoryTasks.delete(id);
  }

  // Bulk operations
  async markTasksAsSynced(ids: string[]): Promise<void> {
    for (const id of ids) {
      await this.updateTask(id, { syncedWithMCP: true });
    }
  }

  async getUnsyncedTasks(): Promise<StoredTask[]> {
    return this.getTasks({ syncedWithMCP: false, localOnly: false });
  }

  // Statistics
  async getTaskStats(): Promise<{
    total: number;
    byStatus: Record<string, number>;
    byPriority: Record<string, number>;
    synced: number;
    unsynced: number;
  }> {
    const tasks = await this.getTasks();
    
    const byStatus: Record<string, number> = {};
    const byPriority: Record<string, number> = {};
    
    for (const task of tasks) {
      byStatus[task.status] = (byStatus[task.status] || 0) + 1;
      byPriority[task.priority] = (byPriority[task.priority] || 0) + 1;
    }

    const synced = tasks.filter(t => t.syncedWithMCP).length;
    const unsynced = tasks.filter(t => !t.syncedWithMCP && !t.localOnly).length;

    return {
      total: tasks.length,
      byStatus,
      byPriority,
      synced,
      unsynced,
    };
  }
}

export const taskStorage = new TaskStorage();