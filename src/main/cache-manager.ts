import NodeCache from 'node-cache';
import * as crypto from 'crypto';

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  maxKeys?: number; // Maximum number of keys to store
  checkPeriod?: number; // How often to check for expired keys (seconds)
}

export interface CacheStats {
  keys: number;
  hits: number;
  misses: number;
  hitRatio: number;
  size: number;
}

class CacheManager {
  private caches: Map<string, NodeCache> = new Map();
  private stats: Map<string, { hits: number; misses: number }> = new Map();

  createCache(name: string, options: CacheOptions = {}): NodeCache {
    const defaultOptions = {
      ttl: 300, // 5 minutes default
      maxKeys: 1000,
      checkPeriod: 60, // Check every minute
    };

    const cacheOptions = { ...defaultOptions, ...options };
    
    const cache = new NodeCache({
      stdTTL: cacheOptions.ttl,
      maxKeys: cacheOptions.maxKeys,
      checkperiod: cacheOptions.checkPeriod,
      useClones: false, // Better performance, but be careful with object mutation
    });

    this.caches.set(name, cache);
    this.stats.set(name, { hits: 0, misses: 0 });

    // Add event listeners for stats
    cache.on('hit', () => {
      const stat = this.stats.get(name)!;
      stat.hits++;
    });

    cache.on('miss', () => {
      const stat = this.stats.get(name)!;
      stat.misses++;
    });

    return cache;
  }

  getCache(name: string): NodeCache | null {
    return this.caches.get(name) || null;
  }

  async get<T>(cacheName: string, key: string): Promise<T | null> {
    const cache = this.getCache(cacheName);
    if (!cache) return null;

    const value = cache.get<T>(key);
    return value || null;
  }

  async set<T>(cacheName: string, key: string, value: T, ttl?: number): Promise<boolean> {
    const cache = this.getCache(cacheName);
    if (!cache) return false;

    return cache.set(key, value, ttl || 0);
  }

  async del(cacheName: string, key: string): Promise<boolean> {
    const cache = this.getCache(cacheName);
    if (!cache) return false;

    return cache.del(key) > 0;
  }

  async clear(cacheName: string): Promise<void> {
    const cache = this.getCache(cacheName);
    if (cache) {
      cache.flushAll();
    }
  }

  async clearAll(): Promise<void> {
    for (const cache of this.caches.values()) {
      cache.flushAll();
    }
  }

  generateKey(data: any): string {
    const stringified = typeof data === 'string' ? data : JSON.stringify(data);
    return crypto.createHash('md5').update(stringified).digest('hex');
  }

  getStats(cacheName: string): CacheStats | null {
    const cache = this.getCache(cacheName);
    const stats = this.stats.get(cacheName);
    
    if (!cache || !stats) return null;

    const keys = cache.keys().length;
    const total = stats.hits + stats.misses;
    
    return {
      keys,
      hits: stats.hits,
      misses: stats.misses,
      hitRatio: total > 0 ? stats.hits / total : 0,
      size: cache.getStats().keys,
    };
  }

  getAllStats(): Record<string, CacheStats> {
    const allStats: Record<string, CacheStats> = {};
    
    for (const cacheName of this.caches.keys()) {
      const stats = this.getStats(cacheName);
      if (stats) {
        allStats[cacheName] = stats;
      }
    }
    
    return allStats;
  }

  // Memoization decorator
  memoize<T extends (...args: any[]) => any>(
    cacheName: string,
    fn: T,
    keyGenerator?: (...args: Parameters<T>) => string,
    ttl: number = 0
  ): T {
    const cache = this.getCache(cacheName) || this.createCache(cacheName);
    
    return ((...args: Parameters<T>) => {
      const key = keyGenerator ? keyGenerator(...args) : this.generateKey(args);
      
      // Check cache first
      const cached = cache.get(key);
      if (cached !== undefined) {
        return cached;
      }
      
      // Call function and cache result
      const result = fn(...args);
      
      // Handle promises
      if (result instanceof Promise) {
        return result.then((resolvedResult) => {
          cache.set(key, resolvedResult, ttl);
          return resolvedResult;
        }).catch((error) => {
          // Don't cache errors
          throw error;
        });
      } else {
        cache.set(key, result, ttl);
        return result;
      }
    }) as T;
  }

  // Async memoization
  memoizeAsync<T extends (...args: any[]) => Promise<any>>(
    cacheName: string,
    fn: T,
    keyGenerator?: (...args: Parameters<T>) => string,
    ttl: number = 0
  ): T {
    const cache = this.getCache(cacheName) || this.createCache(cacheName);
    
    return (async (...args: Parameters<T>) => {
      const key = keyGenerator ? keyGenerator(...args) : this.generateKey(args);
      
      // Check cache first
      const cached = cache.get(key);
      if (cached !== undefined) {
        return cached;
      }
      
      try {
        const result = await fn(...args);
        cache.set(key, result, ttl);
        return result;
      } catch (error) {
        // Don't cache errors
        throw error;
      }
    }) as T;
  }

  // Cache with refresh-ahead pattern
  async getWithRefresh<T>(
    cacheName: string,
    key: string,
    fetchFunction: () => Promise<T>,
    ttl: number = 300,
    refreshThreshold: number = 0.8 // Refresh when 80% of TTL has passed
  ): Promise<T> {
    const cache = this.getCache(cacheName) || this.createCache(cacheName);
    
    const cached = cache.get<T>(key);
    if (cached !== undefined) {
      // Check if we should refresh in the background
      const remainingTtl = cache.getTtl(key);
      const originalTtl = ttl * 1000; // Convert to milliseconds
      
      if (remainingTtl !== undefined) {
        const elapsed = originalTtl - (remainingTtl - Date.now());
        const progress = elapsed / originalTtl;
        
        if (progress >= refreshThreshold) {
          // Refresh in background
          setImmediate(async () => {
            try {
              const freshValue = await fetchFunction();
              cache.set(key, freshValue, ttl);
            } catch (error) {
              console.error('Background refresh failed:', error);
            }
          });
        }
      }
      
      return cached;
    }
    
    // Not in cache, fetch and store
    const value = await fetchFunction();
    cache.set(key, value, ttl);
    return value;
  }

  // Cache invalidation patterns
  async invalidatePattern(cacheName: string, pattern: string): Promise<number> {
    const cache = this.getCache(cacheName);
    if (!cache) return 0;
    
    const keys = cache.keys();
    const regex = new RegExp(pattern);
    let deletedCount = 0;
    
    for (const key of keys) {
      if (regex.test(key)) {
        cache.del(key);
        deletedCount++;
      }
    }
    
    return deletedCount;
  }

  // Bulk operations
  async mget<T>(cacheName: string, keys: string[]): Promise<Record<string, T | undefined>> {
    const cache = this.getCache(cacheName);
    if (!cache) return {};
    
    const result: Record<string, T | undefined> = {};
    for (const key of keys) {
      result[key] = cache.get<T>(key);
    }
    
    return result;
  }

  async mset<T>(cacheName: string, keyValuePairs: Record<string, T>, ttl: number = 0): Promise<boolean> {
    const cache = this.getCache(cacheName);
    if (!cache) return false;
    
    for (const [key, value] of Object.entries(keyValuePairs)) {
      cache.set(key, value, ttl);
    }
    
    return true;
  }

  // Size-limited cache with LRU eviction
  createLRUCache(name: string, maxSize: number, ttl: number = 300): NodeCache {
    return this.createCache(name, {
      ttl,
      maxKeys: maxSize,
      checkPeriod: 60,
    });
  }

  // Warmup cache
  async warmup<T>(
    cacheName: string,
    keys: string[],
    fetchFunction: (key: string) => Promise<T>,
    ttl: number = 0,
    concurrency: number = 5
  ): Promise<void> {
    const cache = this.getCache(cacheName) || this.createCache(cacheName);
    
    // Process keys in batches to avoid overwhelming the system
    for (let i = 0; i < keys.length; i += concurrency) {
      const batch = keys.slice(i, i + concurrency);
      
      await Promise.allSettled(
        batch.map(async (key) => {
          try {
            const value = await fetchFunction(key);
            cache.set(key, value, ttl);
          } catch (error) {
            console.error(`Failed to warm up cache for key ${key}:`, error);
          }
        })
      );
    }
  }
}

export const cacheManager = new CacheManager();

// Create common caches
cacheManager.createCache('api-responses', { ttl: 300, maxKeys: 1000 });
cacheManager.createCache('embeddings', { ttl: 3600, maxKeys: 500 }); // 1 hour for embeddings
cacheManager.createCache('analysis-results', { ttl: 1800, maxKeys: 200 }); // 30 minutes
cacheManager.createCache('file-metadata', { ttl: 600, maxKeys: 2000 }); // 10 minutes
cacheManager.createCache('search-results', { ttl: 180, maxKeys: 100 }); // 3 minutes