import { EventEmitter } from 'events';

export interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  skipSuccessfulRequests?: boolean; // Don't count successful requests
  skipFailedRequests?: boolean; // Don't count failed requests
  keyGenerator?: (context: any) => string; // Custom key generator
  onLimitReached?: (context: any) => void; // Callback when limit is reached
}

export interface RateLimitInfo {
  totalHits: number;
  totalRequests: number;
  remainingPoints: number;
  msBeforeNext: number;
  isLimited: boolean;
}

interface RequestRecord {
  count: number;
  resetTime: number;
  successful: number;
  failed: number;
}

class RateLimiter extends EventEmitter {
  private limits: Map<string, RateLimitConfig> = new Map();
  private records: Map<string, Map<string, RequestRecord>> = new Map();
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    super();
    
    // Clean up expired records every minute
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60000);
  }

  createLimiter(name: string, config: RateLimitConfig): void {
    this.limits.set(name, config);
    if (!this.records.has(name)) {
      this.records.set(name, new Map());
    }
  }

  async checkLimit(
    limiterName: string,
    context: any = {},
    isSuccess?: boolean
  ): Promise<RateLimitInfo> {
    const config = this.limits.get(limiterName);
    if (!config) {
      throw new Error(`Rate limiter '${limiterName}' not found`);
    }

    const key = config.keyGenerator ? config.keyGenerator(context) : 'default';
    const now = Date.now();
    const records = this.records.get(limiterName)!;
    
    let record = records.get(key);
    
    // Initialize or reset if window has passed
    if (!record || now >= record.resetTime) {
      record = {
        count: 0,
        resetTime: now + config.windowMs,
        successful: 0,
        failed: 0,
      };
      records.set(key, record);
    }

    // Check if we should count this request
    const shouldCount = this.shouldCountRequest(config, isSuccess);
    
    if (shouldCount) {
      record.count++;
      
      if (isSuccess === true) {
        record.successful++;
      } else if (isSuccess === false) {
        record.failed++;
      }
    }

    const remainingPoints = Math.max(0, config.maxRequests - record.count);
    const msBeforeNext = Math.max(0, record.resetTime - now);
    const isLimited = record.count >= config.maxRequests;

    const info: RateLimitInfo = {
      totalHits: record.count,
      totalRequests: record.successful + record.failed,
      remainingPoints,
      msBeforeNext,
      isLimited,
    };

    if (isLimited && config.onLimitReached) {
      config.onLimitReached(context);
    }

    this.emit('limit-check', {
      limiterName,
      key,
      info,
      context,
    });

    if (isLimited) {
      this.emit('limit-reached', {
        limiterName,
        key,
        info,
        context,
      });
    }

    return info;
  }

  async waitForAvailability(
    limiterName: string,
    context: any = {},
    timeoutMs: number = 60000
  ): Promise<boolean> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeoutMs) {
      const info = await this.checkLimit(limiterName, context);
      
      if (!info.isLimited) {
        return true;
      }
      
      const waitTime = Math.min(info.msBeforeNext, 1000); // Wait at most 1 second
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    return false;
  }

  // Decorator for rate limiting function calls
  rateLimit<T extends (...args: any[]) => any>(
    limiterName: string,
    fn: T,
    keyGenerator?: (...args: Parameters<T>) => string
  ): (...args: Parameters<T>) => Promise<ReturnType<T>> {
    return async (...args: Parameters<T>): Promise<ReturnType<T>> => {
      const context = keyGenerator ? { key: keyGenerator(...args) } : {};
      
      const info = await this.checkLimit(limiterName, context);
      
      if (info.isLimited) {
        throw new Error(`Rate limit exceeded. Try again in ${info.msBeforeNext}ms`);
      }
      
      try {
        const result = fn(...args);
        
        if (result instanceof Promise) {
          return result.then(
            (value) => {
              // Mark as successful
              this.checkLimit(limiterName, context, true);
              return value;
            },
            (error) => {
              // Mark as failed
              this.checkLimit(limiterName, context, false);
              throw error;
            }
          );
        } else {
          // Mark as successful for sync functions
          this.checkLimit(limiterName, context, true);
          return result;
        }
      } catch (error) {
        // Mark as failed
        this.checkLimit(limiterName, context, false);
        throw error;
      }
    };
  }

  // Async rate limiter with automatic retry
  async executeWithRateLimit<T>(
    limiterName: string,
    fn: () => Promise<T>,
    context: any = {},
    options: {
      maxRetries?: number;
      retryDelay?: number;
      backoffMultiplier?: number;
    } = {}
  ): Promise<T> {
    const { maxRetries = 3, retryDelay = 1000, backoffMultiplier = 2 } = options;
    
    let attempt = 0;
    let delay = retryDelay;
    
    while (attempt <= maxRetries) {
      const info = await this.checkLimit(limiterName, context);
      
      if (!info.isLimited) {
        try {
          const result = await fn();
          await this.checkLimit(limiterName, context, true);
          return result;
        } catch (error) {
          await this.checkLimit(limiterName, context, false);
          throw error;
        }
      }
      
      if (attempt === maxRetries) {
        throw new Error(`Rate limit exceeded after ${maxRetries} retries`);
      }
      
      // Wait for either the rate limit to reset or the delay
      const waitTime = Math.min(info.msBeforeNext, delay);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      
      attempt++;
      delay *= backoffMultiplier;
    }
    
    throw new Error('Unexpected error in rate limiter');
  }

  // Burst rate limiter (allows bursts but limits sustained rate)
  createBurstLimiter(
    name: string,
    burstSize: number,
    sustainedRate: number, // requests per second
    windowMs: number = 60000
  ): void {
    this.createLimiter(name, {
      windowMs,
      maxRequests: Math.max(burstSize, sustainedRate * (windowMs / 1000)),
      keyGenerator: (context) => context.key || 'default',
    });
  }

  // API-specific rate limiters
  createAPILimiter(
    name: string,
    requestsPerMinute: number,
    keyGenerator?: (context: any) => string
  ): void {
    this.createLimiter(name, {
      windowMs: 60000, // 1 minute
      maxRequests: requestsPerMinute,
      keyGenerator,
      skipSuccessfulRequests: false,
      skipFailedRequests: false,
    });
  }

  // Get current status for all limiters
  getStatus(): Record<string, Record<string, RateLimitInfo>> {
    const status: Record<string, Record<string, RateLimitInfo>> = {};
    
    for (const [limiterName, records] of this.records.entries()) {
      status[limiterName] = {};
      
      for (const [key, record] of records.entries()) {
        const config = this.limits.get(limiterName)!;
        const now = Date.now();
        
        status[limiterName][key] = {
          totalHits: record.count,
          totalRequests: record.successful + record.failed,
          remainingPoints: Math.max(0, config.maxRequests - record.count),
          msBeforeNext: Math.max(0, record.resetTime - now),
          isLimited: record.count >= config.maxRequests,
        };
      }
    }
    
    return status;
  }

  // Reset specific limiter
  reset(limiterName: string, key?: string): void {
    const records = this.records.get(limiterName);
    if (!records) return;
    
    if (key) {
      records.delete(key);
    } else {
      records.clear();
    }
  }

  // Reset all limiters
  resetAll(): void {
    for (const records of this.records.values()) {
      records.clear();
    }
  }

  private shouldCountRequest(config: RateLimitConfig, isSuccess?: boolean): boolean {
    if (isSuccess === true && config.skipSuccessfulRequests) {
      return false;
    }
    
    if (isSuccess === false && config.skipFailedRequests) {
      return false;
    }
    
    return true;
  }

  private cleanup(): void {
    const now = Date.now();
    
    for (const [limiterName, records] of this.records.entries()) {
      for (const [key, record] of records.entries()) {
        if (now >= record.resetTime) {
          records.delete(key);
        }
      }
    }
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.removeAllListeners();
    this.records.clear();
    this.limits.clear();
  }
}

export const rateLimiter = new RateLimiter();

// Create common rate limiters
rateLimiter.createAPILimiter('claude-api', 50); // 50 requests per minute for Claude API
rateLimiter.createAPILimiter('openai-api', 60); // 60 requests per minute for OpenAI API
rateLimiter.createAPILimiter('mcp-calls', 100); // 100 MCP calls per minute
rateLimiter.createBurstLimiter('file-indexing', 10, 2); // 10 burst, 2 per second sustained
rateLimiter.createBurstLimiter('search-queries', 20, 5); // 20 burst, 5 per second sustained