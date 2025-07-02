import keytar from 'keytar';
import { ipcMain } from 'electron';

const SERVICE_NAME = 'ENGIE-AI-Assistant';

export interface ApiKeyManager {
  storeKey(provider: string, key: string): Promise<boolean>;
  retrieveKey(provider: string): Promise<string | null>;
  deleteKey(provider: string): Promise<boolean>;
  listProviders(): Promise<string[]>;
  validateKey(provider: string, key: string): Promise<boolean>;
}

class ApiKeyManagerImpl implements ApiKeyManager {
  async storeKey(provider: string, key: string): Promise<boolean> {
    try {
      await keytar.setPassword(SERVICE_NAME, provider, key);
      return true;
    } catch (error) {
      console.error(`Failed to store API key for ${provider}:`, error);
      return false;
    }
  }

  async retrieveKey(provider: string): Promise<string | null> {
    try {
      // Priority: Keychain → Environment → null
      const keychainKey = await keytar.getPassword(SERVICE_NAME, provider);
      if (keychainKey) return keychainKey;

      // Fallback to environment variables
      const envKey = process.env[`${provider.toUpperCase()}_API_KEY`];
      if (envKey) return envKey;

      return null;
    } catch (error) {
      console.error(`Failed to retrieve API key for ${provider}:`, error);
      return null;
    }
  }

  async deleteKey(provider: string): Promise<boolean> {
    try {
      return await keytar.deletePassword(SERVICE_NAME, provider);
    } catch (error) {
      console.error(`Failed to delete API key for ${provider}:`, error);
      return false;
    }
  }

  async listProviders(): Promise<string[]> {
    try {
      const providers = new Set<string>();
      
      // Check keychain
      const credentials = await keytar.findCredentials(SERVICE_NAME);
      credentials.forEach(cred => providers.add(cred.account));
      
      // Check environment variables
      const envProviders = ['anthropic', 'openai', 'perplexity', 'google'];
      for (const provider of envProviders) {
        const envKey = process.env[`${provider.toUpperCase()}_API_KEY`];
        if (envKey && envKey.length > 10) {
          providers.add(provider);
        }
      }
      
      return Array.from(providers);
    } catch (error) {
      console.error('Failed to list API key providers:', error);
      return [];
    }
  }

  async validateKey(provider: string, key: string): Promise<boolean> {
    // Basic validation - could be extended with actual API calls
    if (!key || key.length < 10) return false;

    switch (provider.toLowerCase()) {
      case 'anthropic':
        return key.startsWith('sk-ant-');
      case 'openai':
        return key.startsWith('sk-');
      case 'perplexity':
        return key.length > 20;
      case 'google':
        return key.length === 39;
      default:
        return true;
    }
  }

  registerIpcHandlers() {
    ipcMain.handle('apiKey:store', async (_, provider: string, key: string) => {
      return await this.storeKey(provider, key);
    });

    ipcMain.handle('apiKey:retrieve', async (_, provider: string) => {
      return await this.retrieveKey(provider);
    });

    ipcMain.handle('apiKey:delete', async (_, provider: string) => {
      return await this.deleteKey(provider);
    });

    ipcMain.handle('apiKey:list', async () => {
      return await this.listProviders();
    });
  }
}

export const apiKeyManager = new ApiKeyManagerImpl();