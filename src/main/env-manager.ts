import * as fs from 'fs-extra';
import * as path from 'path';
import { app } from 'electron';
import * as crypto from 'crypto';

export interface EnvConfig {
  // AI Services
  ANTHROPIC_API_KEY?: string;
  OPENAI_API_KEY?: string;
  
  // Vector Database
  CHROMA_URL?: string;
  PINECONE_API_KEY?: string;
  PINECONE_ENVIRONMENT?: string;
  
  // Redis/Queue
  REDIS_URL?: string;
  REDIS_HOST?: string;
  REDIS_PORT?: string;
  
  // Application
  NODE_ENV?: 'development' | 'production' | 'test';
  LOG_LEVEL?: 'debug' | 'info' | 'warn' | 'error';
  ENGIE_DATA_DIR?: string;
  
  // Security
  ENCRYPTION_KEY?: string;
  JWT_SECRET?: string;
  
  // Feature Flags
  ENABLE_TELEMETRY?: boolean;
  ENABLE_CRASH_REPORTING?: boolean;
  ENABLE_AUTO_UPDATE?: boolean;
  
  // Performance
  MAX_CONCURRENT_JOBS?: number;
  CACHE_TTL_SECONDS?: number;
  RATE_LIMIT_REQUESTS_PER_MINUTE?: number;
}

class EnvironmentManager {
  private config: EnvConfig = {};
  private configPath: string;
  private encryptionKey: string;
  private isInitialized = false;

  constructor() {
    this.configPath = path.join(app.getPath('userData'), 'engie.env');
    this.encryptionKey = this.getOrCreateEncryptionKey();
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    
    // Load from environment variables first
    this.loadFromProcess();
    
    // Load from encrypted config file
    await this.loadFromFile();
    
    // Apply defaults
    this.applyDefaults();
    
    // Validate required variables
    this.validate();
    
    this.isInitialized = true;
    console.log('Environment manager initialized');
  }

  private loadFromProcess(): void {
    // Load from process.env with type safety
    const envVars: Partial<EnvConfig> = {
      ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
      OPENAI_API_KEY: process.env.OPENAI_API_KEY,
      CHROMA_URL: process.env.CHROMA_URL,
      PINECONE_API_KEY: process.env.PINECONE_API_KEY,
      PINECONE_ENVIRONMENT: process.env.PINECONE_ENVIRONMENT,
      REDIS_URL: process.env.REDIS_URL,
      REDIS_HOST: process.env.REDIS_HOST,
      REDIS_PORT: process.env.REDIS_PORT,
      NODE_ENV: process.env.NODE_ENV as EnvConfig['NODE_ENV'],
      LOG_LEVEL: process.env.LOG_LEVEL as EnvConfig['LOG_LEVEL'],
      ENGIE_DATA_DIR: process.env.ENGIE_DATA_DIR,
      ENCRYPTION_KEY: process.env.ENCRYPTION_KEY,
      JWT_SECRET: process.env.JWT_SECRET,
      ENABLE_TELEMETRY: process.env.ENABLE_TELEMETRY === 'true',
      ENABLE_CRASH_REPORTING: process.env.ENABLE_CRASH_REPORTING === 'true',
      ENABLE_AUTO_UPDATE: process.env.ENABLE_AUTO_UPDATE === 'true',
      MAX_CONCURRENT_JOBS: process.env.MAX_CONCURRENT_JOBS ? parseInt(process.env.MAX_CONCURRENT_JOBS, 10) : undefined,
      CACHE_TTL_SECONDS: process.env.CACHE_TTL_SECONDS ? parseInt(process.env.CACHE_TTL_SECONDS, 10) : undefined,
      RATE_LIMIT_REQUESTS_PER_MINUTE: process.env.RATE_LIMIT_REQUESTS_PER_MINUTE ? parseInt(process.env.RATE_LIMIT_REQUESTS_PER_MINUTE, 10) : undefined,
    };

    // Only set defined values
    Object.entries(envVars).forEach(([key, value]) => {
      if (value !== undefined) {
        (this.config as any)[key] = value;
      }
    });
  }

  private async loadFromFile(): Promise<void> {
    try {
      if (await fs.pathExists(this.configPath)) {
        const encryptedData = await fs.readFile(this.configPath, 'utf8');
        const decryptedData = this.decrypt(encryptedData);
        const fileConfig = JSON.parse(decryptedData);
        
        // Merge file config with existing config (process.env takes precedence)
        Object.entries(fileConfig).forEach(([key, value]) => {
          if (this.config[key as keyof EnvConfig] === undefined) {
            (this.config as any)[key] = value;
          }
        });
      }
    } catch (error) {
      console.warn('Failed to load config from file:', error);
    }
  }

  private applyDefaults(): void {
    const defaults: Partial<EnvConfig> = {
      NODE_ENV: 'development',
      LOG_LEVEL: 'info',
      CHROMA_URL: 'http://localhost:8000',
      REDIS_HOST: 'localhost',
      REDIS_PORT: '6379',
      ENGIE_DATA_DIR: app.getPath('userData'),
      ENABLE_TELEMETRY: false,
      ENABLE_CRASH_REPORTING: false,
      ENABLE_AUTO_UPDATE: true,
      MAX_CONCURRENT_JOBS: 5,
      CACHE_TTL_SECONDS: 300,
      RATE_LIMIT_REQUESTS_PER_MINUTE: 60,
    };

    Object.entries(defaults).forEach(([key, value]) => {
      if (this.config[key as keyof EnvConfig] === undefined) {
        (this.config as any)[key] = value;
      }
    });
  }

  private validate(): void {
    const warnings: string[] = [];
    const errors: string[] = [];

    // Check for required API keys in production
    if (this.config.NODE_ENV === 'production') {
      if (!this.config.ANTHROPIC_API_KEY && !this.config.OPENAI_API_KEY) {
        errors.push('At least one AI API key (ANTHROPIC_API_KEY or OPENAI_API_KEY) is required in production');
      }
    }

    // Validate URLs
    if (this.config.CHROMA_URL && !this.isValidUrl(this.config.CHROMA_URL)) {
      warnings.push('CHROMA_URL is not a valid URL');
    }

    if (this.config.REDIS_URL && !this.isValidUrl(this.config.REDIS_URL)) {
      warnings.push('REDIS_URL is not a valid URL');
    }

    // Validate numbers
    if (this.config.MAX_CONCURRENT_JOBS && this.config.MAX_CONCURRENT_JOBS < 1) {
      warnings.push('MAX_CONCURRENT_JOBS should be at least 1');
    }

    if (this.config.RATE_LIMIT_REQUESTS_PER_MINUTE && this.config.RATE_LIMIT_REQUESTS_PER_MINUTE < 1) {
      warnings.push('RATE_LIMIT_REQUESTS_PER_MINUTE should be at least 1');
    }

    // Log warnings and errors
    warnings.forEach(warning => console.warn(`ENV WARNING: ${warning}`));
    errors.forEach(error => console.error(`ENV ERROR: ${error}`));

    if (errors.length > 0) {
      throw new Error(`Environment validation failed: ${errors.join(', ')}`);
    }
  }

  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  get<K extends keyof EnvConfig>(key: K): EnvConfig[K] {
    return this.config[key];
  }

  set<K extends keyof EnvConfig>(key: K, value: EnvConfig[K]): void {
    this.config[key] = value;
  }

  private getOrCreateEncryptionKey(): string {
    const keyPath = path.join(app.getPath('userData'), '.engie-key');
    
    try {
      if (fs.existsSync(keyPath)) {
        return fs.readFileSync(keyPath, 'utf8').trim();
      }
    } catch (error) {
      console.warn('Failed to read encryption key:', error);
    }
    
    // Generate new key
    const key = crypto.randomBytes(32).toString('hex');
    
    try {
      fs.writeFileSync(keyPath, key, { mode: 0o600 }); // Readable only by owner
    } catch (error) {
      console.error('Failed to save encryption key:', error);
    }
    
    return key;
  }

  private encrypt(text: string): string {
    try {
      const algorithm = 'aes-256-gcm';
      const key = Buffer.from(this.encryptionKey, 'hex');
      const iv = crypto.randomBytes(16);
      
      const cipher = crypto.createCipheriv(algorithm, key, iv);
      
      let encrypted = cipher.update(text, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      const authTag = cipher.getAuthTag();
      
      return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
    } catch (error) {
      console.error('Encryption failed:', error);
      throw new Error('Failed to encrypt data');
    }
  }

  private decrypt(encryptedData: string): string {
    try {
      const algorithm = 'aes-256-gcm';
      const key = Buffer.from(this.encryptionKey, 'hex');
      
      const [ivHex, authTagHex, encrypted] = encryptedData.split(':');
      const iv = Buffer.from(ivHex, 'hex');
      const authTag = Buffer.from(authTagHex, 'hex');
      
      const decipher = crypto.createDecipheriv(algorithm, key, iv);
      decipher.setAuthTag(authTag);
      
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      console.error('Decryption failed:', error);
      throw new Error('Failed to decrypt data');
    }
  }
}

export const envManager = new EnvironmentManager();