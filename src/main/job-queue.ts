import Bull from 'bull';
import Redis from 'redis';
import { app } from 'electron';
import path from 'path';

export interface JobData {
  type: 'sync-tasks' | 'ai-analysis' | 'index-files' | 'git-analysis' | 'rag-index';
  payload: any;
}

export interface JobResult {
  success: boolean;
  data?: any;
  error?: string;
}

class JobQueueManager {
  private queues: Map<string, Bull.Queue<JobData>> = new Map();
  private redisClient: Redis.RedisClientType | null = null;
  private isRedisAvailable = false;

  async initialize(): Promise<void> {
    try {
      // Try to connect to Redis
      this.redisClient = Redis.createClient({
        url: process.env.REDIS_URL || 'redis://localhost:6379',
      });

      await this.redisClient.connect();
      this.isRedisAvailable = true;
      console.log('Connected to Redis for job queue management');
    } catch (error) {
      console.warn('Redis not available, using in-memory queue');
      this.isRedisAvailable = false;
    }

    // Initialize queues
    this.createQueue('background-jobs');
    this.createQueue('ai-analysis');
    this.createQueue('file-indexing');
  }

  private createQueue(name: string): Bull.Queue<JobData> {
    if (!this.isRedisAvailable) {
      console.log(`Redis unavailable, creating in-memory queue: ${name}`);
      return this.createInMemoryQueue(name);
    }

    const queueOptions: Bull.QueueOptions = {
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
      },
    };

    const queue = new Bull<JobData>(name, queueOptions);
    this.queues.set(name, queue);

    // Set up error handling
    queue.on('error', (error) => {
      console.error(`Queue ${name} error:`, error);
    });

    queue.on('failed', (job, err) => {
      console.error(`Job ${job.id} in queue ${name} failed:`, err);
    });

    return queue;
  }

  private createInMemoryQueue(name: string): Bull.Queue<JobData> {
    // Simple in-memory job processing without Bull queue
    const inMemoryJobs: Map<string, { id: string; data: JobData; status: 'pending' | 'processing' | 'completed' | 'failed' }> = new Map();
    
    const inMemoryQueue = {
      name,
      add: async (data: JobData, options?: Bull.JobOptions) => {
        const jobId = Date.now().toString();
        const job = { id: jobId, data, status: 'pending' as const };
        inMemoryJobs.set(jobId, job);
        console.log(`In-memory queue ${name}: Added job ${jobId}`, data);
        return { id: jobId, data } as any;
      },
      process: (processor: (job: any) => Promise<any>) => {
        console.log(`In-memory queue ${name}: Processor registered`);
        const processJobs = async () => {
          for (const [jobId, job] of inMemoryJobs.entries()) {
            if (job.status === 'pending') {
              job.status = 'processing';
              try {
                console.log(`Processing job ${jobId} in queue ${name}`);
                await processor({ id: jobId, data: job.data });
                job.status = 'completed';
                inMemoryJobs.delete(jobId);
                console.log(`Job ${jobId} completed successfully`);
              } catch (error) {
                console.error(`Job ${jobId} failed in queue ${name}:`, error);
                job.status = 'failed';
              }
            }
          }
        };
        
        const intervalId = setInterval(processJobs, 1000);
        return () => clearInterval(intervalId);
      },
      on: (event: string, handler: any) => {
        console.log(`In-memory queue ${name}: Event listener registered for ${event}`);
      },
      close: async () => {
        inMemoryJobs.clear();
        console.log(`In-memory queue ${name}: Closed`);
      },
      getJob: async (id: any) => {
        const job = inMemoryJobs.get(id);
        return job ? { id: job.id, data: job.data } : null;
      },
      getJobs: async () => Array.from(inMemoryJobs.values()).map(job => ({ id: job.id, data: job.data })),
      getJobCounts: async () => ({
        waiting: Array.from(inMemoryJobs.values()).filter(j => j.status === 'pending').length,
        active: Array.from(inMemoryJobs.values()).filter(j => j.status === 'processing').length,
        completed: 0,
        failed: Array.from(inMemoryJobs.values()).filter(j => j.status === 'failed').length,
        delayed: 0
      }),
      empty: async () => {
        inMemoryJobs.clear();
      },
      addBulk: async (jobs: Array<{ data: JobData; opts?: Bull.JobOptions }>) => {
        return Promise.all(jobs.map(job => inMemoryQueue.add(job.data, job.opts)));
      },
      getFailed: async () => Array.from(inMemoryJobs.values()).filter(j => j.status === 'failed').map(job => ({
        id: job.id,
        data: job.data,
        retry: async () => {
          job.status = 'pending';
        }
      }))
    } as any;

    this.queues.set(name, inMemoryQueue);
    return inMemoryQueue;
  }

  async addJob(
    queueName: string,
    data: JobData,
    options?: Bull.JobOptions
  ): Promise<Bull.Job<JobData>> {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    const defaultOptions: Bull.JobOptions = {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
      removeOnComplete: true,
      removeOnFail: false,
    };

    return await queue.add(data, { ...defaultOptions, ...options });
  }

  async processJobs(
    queueName: string,
    processor: (job: Bull.Job<JobData>) => Promise<JobResult>
  ): Promise<void> {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    queue.process(async (job) => {
      console.log(`Processing job ${job.id} of type ${job.data.type}`);
      try {
        const result = await processor(job);
        if (!result.success) {
          throw new Error(result.error || 'Job failed');
        }
        return result.data;
      } catch (error: any) {
        console.error(`Job ${job.id} failed:`, error);
        throw error;
      }
    });
  }

  async getJobCounts(queueName: string): Promise<{
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
  }> {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    return await queue.getJobCounts();
  }

  async clearQueue(queueName: string): Promise<void> {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    await queue.empty();
  }

  async close(): Promise<void> {
    // Close all queues
    for (const [name, queue] of this.queues.entries()) {
      await queue.close();
      console.log(`Closed queue: ${name}`);
    }

    // Close Redis connection
    if (this.redisClient && this.isRedisAvailable) {
      await this.redisClient.quit();
    }
  }

  // Schedule recurring jobs
  async scheduleRecurringJob(
    queueName: string,
    jobName: string,
    data: JobData,
    cronPattern: string
  ): Promise<void> {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    await queue.add(jobName, data, {
      repeat: {
        cron: cronPattern,
      },
      removeOnComplete: true,
    });
  }

  // Priority job support
  async addPriorityJob(
    queueName: string,
    data: JobData,
    priority: number
  ): Promise<Bull.Job<JobData>> {
    return await this.addJob(queueName, data, {
      priority,
      delay: 0,
    });
  }

  // Bulk job operations
  async addBulkJobs(
    queueName: string,
    jobs: Array<{ data: JobData; opts?: Bull.JobOptions }>
  ): Promise<Bull.Job<JobData>[]> {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    return await queue.addBulk(jobs);
  }

  // Job progress tracking
  async updateJobProgress(job: Bull.Job<JobData>, progress: number): Promise<void> {
    await job.progress(progress);
  }

  // Get specific job
  async getJob(queueName: string, jobId: string): Promise<Bull.Job<JobData> | null> {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    return await queue.getJob(jobId);
  }

  // Retry failed jobs
  async retryFailedJobs(queueName: string): Promise<void> {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    const failedJobs = await queue.getFailed();
    for (const job of failedJobs) {
      await job.retry();
    }
  }
}

export const jobQueueManager = new JobQueueManager();