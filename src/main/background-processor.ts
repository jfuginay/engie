import { EventEmitter } from 'events';
import { jobQueueManager, type JobData, type JobResult } from './job-queue';
import { taskStorage } from './task-storage-simple';
import { claudeAIService } from './claude-ai-service';
import { ragSystem } from './rag-system';
import * as fs from 'fs-extra';
import * as path from 'path';
import { glob } from 'glob';
import Bull from 'bull';

export class BackgroundProcessor extends EventEmitter {
  private isRunning = false;

  async start() {
    if (this.isRunning) return;
    
    this.isRunning = true;
    
    // Initialize job queue
    await jobQueueManager.initialize();
    
    // Set up job processors
    this.setupJobProcessors();
    
    // Schedule recurring jobs
    await this.scheduleRecurringJobs();
    
    console.log('Background processor started with real job queue');
  }

  async stop() {
    this.isRunning = false;
    await jobQueueManager.close();
  }

  private setupJobProcessors() {
    // Process background jobs
    jobQueueManager.processJobs('background-jobs', async (job) => {
      return await this.processBackgroundJob(job);
    });

    // Process AI analysis jobs
    jobQueueManager.processJobs('ai-analysis', async (job) => {
      return await this.processAIAnalysisJob(job);
    });

    // Process file indexing jobs
    jobQueueManager.processJobs('file-indexing', async (job) => {
      return await this.processFileIndexingJob(job);
    });
  }

  private async processBackgroundJob(job: Bull.Job<JobData>): Promise<JobResult> {
    const { type, payload } = job.data;
    
    try {
      switch (type) {
        case 'sync-tasks':
          return await this.syncTasks(payload);
        case 'git-analysis':
          return await this.analyzeGitChanges(payload);
        default:
          throw new Error(`Unknown job type: ${type}`);
      }
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  private async processAIAnalysisJob(job: Bull.Job<JobData>): Promise<JobResult> {
    const { type, payload } = job.data;
    
    try {
      switch (type) {
        case 'ai-analysis':
          return await this.performAiAnalysis(payload);
        default:
          throw new Error(`Unknown AI analysis type: ${type}`);
      }
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  private async processFileIndexingJob(job: Bull.Job<JobData>): Promise<JobResult> {
    const { type, payload } = job.data;
    
    try {
      switch (type) {
        case 'index-files':
          return await this.indexFiles(payload, job);
        case 'rag-index':
          return await this.updateRAGIndex(payload);
        default:
          throw new Error(`Unknown file indexing type: ${type}`);
      }
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  private async syncTasks(payload: any): Promise<JobResult> {
    // No longer needed - MCP TaskMaster is the single source of truth
    // Background sync is not needed since all operations go directly to MCP
    console.log('Background task sync disabled - using MCP as single source of truth');
    return { 
      success: true, 
      data: { 
        message: 'Task sync not needed - MCP is single source of truth',
        synced: 0,
        total: 0 
      } 
    };
  }

  private async performAiAnalysis(payload: any): Promise<JobResult> {
    try {
      const { content, type, context } = payload;
      
      // Perform real AI analysis using Claude
      const prompt = this.buildAnalysisPrompt(type, content, context);
      const response = await claudeAIService.sendMessage(prompt);
      
      // Parse insights from response
      const insights = this.parseInsights(response.content);
      
      // Store analysis results
      const analysisResult = {
        analyzed: true,
        insights,
        timestamp: new Date(),
        type,
      };
      
      this.emit('analysis:completed', analysisResult);
      
      return { success: true, data: analysisResult };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  private buildAnalysisPrompt(type: string, content: string, context: any): string {
    switch (type) {
      case 'code-review':
        return `Analyze the following code for potential improvements, bugs, and optimization opportunities:\n\n${content}\n\nContext: ${JSON.stringify(context)}`;
      case 'architecture':
        return `Analyze the project architecture and suggest improvements:\n\n${content}\n\nProject structure: ${JSON.stringify(context)}`;
      case 'performance':
        return `Analyze the following code for performance bottlenecks and optimization opportunities:\n\n${content}`;
      default:
        return `Analyze the following content and provide insights:\n\n${content}`;
    }
  }

  private parseInsights(response: any): string[] {
    try {
      // Extract bullet points or numbered lists from response
      const content = typeof response === 'string' ? response : response.toString();
      const insights: string[] = [];
      
      // Match bullet points or numbered items
      const bulletMatches = content.match(/^[\s]*[-*•]\s+(.+)$/gm) || [];
      const numberedMatches = content.match(/^[\s]*\d+\.\s+(.+)$/gm) || [];
      
      bulletMatches.forEach((match: string) => {
        insights.push(match.replace(/^[\s]*[-*•]\s+/, '').trim());
      });
      
      numberedMatches.forEach((match: string) => {
        insights.push(match.replace(/^[\s]*\d+\.\s+/, '').trim());
      });
      
      // If no structured insights found, split by sentences
      if (insights.length === 0) {
        const sentences = content.split(/[.!?]+/).filter((s: string) => s.trim().length > 10);
        insights.push(...sentences.slice(0, 5).map((s: string) => s.trim()));
      }
      
      return insights;
    } catch (error) {
      console.error('Error parsing insights:', error);
      return ['Analysis completed'];
    }
  }

  private async indexFiles(payload: any, job?: Bull.Job<JobData>): Promise<JobResult> {
    try {
      const { directory, patterns = ['**/*.{js,ts,jsx,tsx,py,java,go,rb,php}'], ignore = ['node_modules/**', 'dist/**', 'build/**'] } = payload;
      
      // Find files matching patterns
      const files = await new Promise<string[]>((resolve, reject) => {
        glob(patterns.join(','), {
          cwd: directory,
          ignore,
          absolute: true,
        }, (err, matches) => {
          if (err) reject(err);
          else resolve(matches);
        });
      });
      
      let indexedCount = 0;
      const errors: string[] = [];
      
      // Index each file
      for (const filePath of files) {
        try {
          const stats = await fs.stat(filePath);
          if (stats.size > 1024 * 1024 * 10) { // Skip files > 10MB
            continue;
          }
          
          const content = await fs.readFile(filePath, 'utf-8');
          const relativePath = path.relative(directory, filePath);
          
          // Store file metadata
          await this.storeFileMetadata({
            path: filePath,
            relativePath,
            size: stats.size,
            modified: stats.mtime,
            indexed: new Date(),
          });
          
          // Update progress
          if (job) {
            await jobQueueManager.updateJobProgress(
              job,
              Math.floor((indexedCount / files.length) * 100)
            );
          }
          
          indexedCount++;
        } catch (error: any) {
          errors.push(`Failed to index ${filePath}: ${error.message}`);
        }
      }
      
      return {
        success: true,
        data: {
          indexed: indexedCount,
          total: files.length,
          errors: errors.length > 0 ? errors : undefined,
        },
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  private async updateRAGIndex(payload: any): Promise<JobResult> {
    try {
      const { files, projectPath } = payload;
      
      // Update RAG system with new file embeddings
      for (const file of files) {
        await ragSystem.indexFile(file, projectPath);
      }
      
      return {
        success: true,
        data: {
          indexed: files.length,
        },
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  private async analyzeGitChanges(payload: any): Promise<JobResult> {
    try {
      const { changes, branch } = payload;
      
      // Analyze git changes using AI
      const analysisPrompt = `Analyze these git changes and suggest tasks:\n\nBranch: ${branch}\nChanges:\n${JSON.stringify(changes, null, 2)}`;
      
      const response = await claudeAIService.sendMessage(analysisPrompt);
      const suggestedTasks = this.parseTaskSuggestions(response.content);
      
      // Create tasks for suggestions
      for (const suggestion of suggestedTasks) {
        await taskStorage.createTask({
          title: suggestion.title,
          description: suggestion.description,
          priority: suggestion.priority || 'medium',
          status: 'pending',
          localOnly: false,
        });
      }
      
      return {
        success: true,
        data: {
          analyzed: true,
          tasksCreated: suggestedTasks.length,
        },
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  private parseTaskSuggestions(response: any): Array<{title: string, description: string, priority?: 'high' | 'medium' | 'low'}> {
    // Parse task suggestions from AI response
    // This is a simplified implementation
    const suggestions: Array<{title: string, description: string, priority?: 'high' | 'medium' | 'low'}> = [];
    
    try {
      const content = typeof response === 'string' ? response : response.toString();
      // Look for task patterns in the response
      const taskMatches = content.match(/(?:task|todo|action):\s*(.+)/gi) || [];
      
      taskMatches.forEach((match: string) => {
        const title = match.replace(/(?:task|todo|action):\s*/i, '').trim();
        suggestions.push({
          title,
          description: title,
          priority: 'medium',
        });
      });
    } catch (error) {
      console.error('Error parsing task suggestions:', error);
    }
    
    return suggestions;
  }

  private async storeFileMetadata(metadata: any): Promise<void> {
    // Store file metadata for later use
    // This could be in a database or index
    this.emit('file:indexed', metadata);
  }

  private async scheduleRecurringJobs() {
    // Schedule task sync every 5 minutes
    await jobQueueManager.scheduleRecurringJob(
      'background-jobs',
      'sync-tasks',
      { type: 'sync-tasks', payload: {} },
      '*/5 * * * *'
    );
    
    // Schedule file indexing every hour
    await jobQueueManager.scheduleRecurringJob(
      'file-indexing',
      'index-project',
      { 
        type: 'index-files', 
        payload: { 
          directory: process.cwd(),
          patterns: ['**/*.{js,ts,jsx,tsx}']
        } 
      },
      '0 * * * *'
    );
  }

  // Public API for adding jobs
  async addJob(type: string, data: any, priority: number = 0): Promise<string> {
    const queueName = this.getQueueForJobType(type);
    const job = await jobQueueManager.addPriorityJob(
      queueName,
      { type: type as any, payload: data },
      priority
    );
    
    this.emit('job:added', { id: job.id, type, priority });
    return job.id.toString();
  }

  private getQueueForJobType(type: string): string {
    switch (type) {
      case 'ai-analysis':
        return 'ai-analysis';
      case 'index-files':
      case 'rag-index':
        return 'file-indexing';
      case 'sync-tasks':
      case 'git-analysis':
        return 'background-jobs';
      default:
        return 'background-jobs';
    }
  }

  async getStatus() {
    const queues = ['background-jobs', 'ai-analysis', 'file-indexing'];
    const status: any = {
      isRunning: this.isRunning,
      queues: {},
    };
    
    for (const queueName of queues) {
      try {
        status.queues[queueName] = await jobQueueManager.getJobCounts(queueName);
      } catch (error) {
        status.queues[queueName] = { error: 'Unable to get queue status' };
      }
    }
    
    return status;
  }
}

export const backgroundProcessor = new BackgroundProcessor();