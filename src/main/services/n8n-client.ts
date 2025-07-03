import { EventEmitter } from 'events';
import axios, { AxiosInstance } from 'axios';
import { logger } from '../logger';
import { Task } from '../../shared/types';

export interface N8nConfig {
  webhookUrl: string;
  apiKey?: string;
  timeout?: number;
  retryAttempts?: number;
  retryDelay?: number;
}

export interface N8nTaskPayload {
  task: Task;
  action: 'create_issue' | 'update_issue' | 'sync_task';
  metadata?: {
    repository?: string;
    labels?: string[];
    assignees?: string[];
    milestone?: string;
  };
}

export interface N8nResponse {
  success: boolean;
  issueNumber?: number;
  issueUrl?: string;
  error?: string;
}

export class N8nClient extends EventEmitter {
  private static instance: N8nClient;
  private axiosInstance: AxiosInstance;
  private config: N8nConfig;
  private isConnected: boolean = false;

  private constructor(config: N8nConfig) {
    super();
    this.config = {
      timeout: 30000,
      retryAttempts: 3,
      retryDelay: 1000,
      ...config
    };

    this.axiosInstance = axios.create({
      timeout: this.config.timeout,
      headers: {
        'Content-Type': 'application/json',
        ...(this.config.apiKey && { 'Authorization': `Bearer ${this.config.apiKey}` })
      }
    });

    this.testConnection();
  }

  static getInstance(config?: N8nConfig): N8nClient {
    if (!N8nClient.instance && config) {
      N8nClient.instance = new N8nClient(config);
    }
    return N8nClient.instance;
  }

  private async testConnection(): Promise<void> {
    try {
      // Send a test payload to verify the webhook is accessible
      const response = await this.axiosInstance.post(this.config.webhookUrl, {
        test: true,
        timestamp: new Date().toISOString()
      });
      
      this.isConnected = true;
      logger.info('N8n webhook connection established');
      this.emit('connected');
    } catch (error) {
      this.isConnected = false;
      logger.error('Failed to connect to n8n webhook:', error);
      this.emit('connection-error', error);
    }
  }

  async sendTaskToGitHub(task: Task, metadata?: N8nTaskPayload['metadata']): Promise<N8nResponse> {
    const payload: N8nTaskPayload = {
      task,
      action: 'create_issue',
      metadata: {
        repository: metadata?.repository || process.env.GITHUB_REPOSITORY,
        labels: metadata?.labels || this.getLabelsFromTask(task),
        assignees: metadata?.assignees || [],
        milestone: metadata?.milestone
      }
    };

    return this.sendToN8n(payload);
  }

  async updateGitHubIssue(task: Task, issueNumber: number): Promise<N8nResponse> {
    const payload: N8nTaskPayload = {
      task,
      action: 'update_issue',
      metadata: {
        issueNumber
      }
    };

    return this.sendToN8n(payload);
  }

  private async sendToN8n(payload: N8nTaskPayload): Promise<N8nResponse> {
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= this.config.retryAttempts!; attempt++) {
      try {
        logger.info(`Sending task to n8n (attempt ${attempt}):`, {
          taskId: payload.task.id,
          action: payload.action
        });

        const response = await this.axiosInstance.post<N8nResponse>(
          this.config.webhookUrl,
          payload
        );

        logger.info('Successfully sent task to n8n:', response.data);
        this.emit('task-sent', { task: payload.task, response: response.data });
        
        return response.data;
      } catch (error) {
        lastError = error as Error;
        logger.error(`Failed to send task to n8n (attempt ${attempt}):`, error);
        
        if (attempt < this.config.retryAttempts!) {
          await this.delay(this.config.retryDelay! * attempt);
        }
      }
    }

    const errorResponse: N8nResponse = {
      success: false,
      error: lastError?.message || 'Failed to send task to n8n after all retry attempts'
    };

    this.emit('task-send-error', { task: payload.task, error: lastError });
    return errorResponse;
  }

  private getLabelsFromTask(task: Task): string[] {
    const labels: string[] = [];
    
    if (task.priority) {
      labels.push(`priority:${task.priority}`);
    }
    
    if (task.status) {
      labels.push(`status:${task.status}`);
    }
    
    if (task.tags) {
      labels.push(...task.tags);
    }

    // Add type label based on task complexity
    if (task.complexity) {
      if (task.complexity >= 8) {
        labels.push('type:epic');
      } else if (task.complexity >= 5) {
        labels.push('type:feature');
      } else if (task.complexity >= 3) {
        labels.push('type:task');
      } else {
        labels.push('type:subtask');
      }
    }

    return labels;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  updateConfig(config: Partial<N8nConfig>): void {
    this.config = { ...this.config, ...config };
    
    // Recreate axios instance with new config
    this.axiosInstance = axios.create({
      timeout: this.config.timeout,
      headers: {
        'Content-Type': 'application/json',
        ...(this.config.apiKey && { 'Authorization': `Bearer ${this.config.apiKey}` })
      }
    });

    // Test new connection
    this.testConnection();
  }

  isAvailable(): boolean {
    return this.isConnected;
  }

  disconnect(): void {
    this.isConnected = false;
    this.removeAllListeners();
    logger.info('N8n client disconnected');
  }
}