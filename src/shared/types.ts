// Core types used throughout the application

export interface Message {
  id: number;
  text: string;
  type: 'user' | 'assistant' | 'system';
  timestamp: Date;
  thought?: string;
  toolsUsed?: string[];
}

export interface EngieResponse {
  thought: string;
  action?: string;
  result: string;
  toolsUsed: string[];
  conversationId?: string;
  pendingTasks?: Array<{
    title: string;
    description?: string;
    priority?: 'low' | 'medium' | 'high';
    tags?: string[];
  }>;
  followUpExpected?: boolean;
}

export interface TaskMasterTask {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in-progress' | 'done' | 'blocked' | 'deferred' | 'cancelled' | 'review';
  priority: 'high' | 'medium' | 'low';
  dependencies?: string[];
  subtasks?: TaskMasterTask[];
  details?: string;
  testStrategy?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SystemInfo {
  platform: NodeJS.Platform;
  version: string;
  electronVersion: string;
  nodeVersion: string;
}

export interface ApiProvider {
  name: string;
  displayName: string;
  requiresKey: boolean;
}

export interface EngieSettings {
  theme: 'dark' | 'light' | 'auto';
  fontSize: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl';
  aiProvider: 'anthropic' | 'openai' | 'perplexity' | 'google';
  autoSave: boolean;
  notifications: boolean;
  telemetry: boolean;
  shortcuts: Record<string, string>;
}