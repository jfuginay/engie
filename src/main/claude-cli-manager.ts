import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import * as fs from 'fs/promises';
import { ipcMain } from 'electron';
import { apiKeyManager } from './api-key-manager';

const execAsync = promisify(exec);

export class ClaudeCliManager {
  private claudePath: string | null = null;
  private isInstalled: boolean = false;

  async initialize() {
    await this.checkInstallation();
    this.registerIpcHandlers();
  }

  async checkInstallation(): Promise<boolean> {
    try {
      // Check if Claude CLI is in PATH
      const { stdout } = await execAsync('which claude');
      this.claudePath = stdout.trim();
      this.isInstalled = true;
      
      // Verify it's working
      await execAsync('claude --version');
      
      return true;
    } catch (error) {
      // Check common installation locations
      const commonPaths = [
        '/usr/local/bin/claude',
        '/opt/homebrew/bin/claude',
        path.join(process.env.HOME || '', '.local/bin/claude'),
      ];

      for (const checkPath of commonPaths) {
        try {
          await fs.access(checkPath, fs.constants.X_OK);
          this.claudePath = checkPath;
          this.isInstalled = true;
          return true;
        } catch {
          // Continue checking other paths
        }
      }

      this.isInstalled = false;
      return false;
    }
  }

  async install(): Promise<boolean> {
    try {
      // Download and install Claude CLI
      const installScript = `
        curl -L https://github.com/anthropics/claude-cli/releases/latest/download/claude-cli-macos-arm64 -o /tmp/claude &&
        chmod +x /tmp/claude &&
        sudo mv /tmp/claude /usr/local/bin/claude
      `;

      await execAsync(installScript);
      await this.checkInstallation();
      
      if (this.isInstalled) {
        await this.configure();
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Failed to install Claude CLI:', error);
      return false;
    }
  }

  async configure(): Promise<void> {
    try {
      // Get API key from keychain
      const apiKey = await apiKeyManager.retrieveKey('anthropic');
      if (!apiKey) {
        throw new Error('No Anthropic API key found');
      }

      // Configure Claude CLI with API key
      const configPath = path.join(process.env.HOME || '', '.config/claude/config.json');
      const configDir = path.dirname(configPath);
      
      await fs.mkdir(configDir, { recursive: true });
      
      const config = {
        api_key: apiKey,
        model: 'claude-3-5-sonnet-20241022',
        mcp_servers: {
          taskmaster: {
            command: 'npx',
            args: ['-y', 'taskmaster-mcp'],
            env: {
              ANTHROPIC_API_KEY: apiKey
            }
          }
        }
      };

      await fs.writeFile(configPath, JSON.stringify(config, null, 2));
    } catch (error) {
      console.error('Failed to configure Claude CLI:', error);
    }
  }

  async execute(command: string): Promise<{ stdout: string; stderr: string }> {
    if (!this.isInstalled || !this.claudePath) {
      throw new Error('Claude CLI is not installed');
    }

    return new Promise((resolve, reject) => {
      const claudeProcess = spawn(this.claudePath!, command.split(' '), {
        env: { ...process.env }
      });

      let stdout = '';
      let stderr = '';

      claudeProcess.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      claudeProcess.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      claudeProcess.on('close', (code) => {
        if (code === 0) {
          resolve({ stdout, stderr });
        } else {
          reject(new Error(`Claude CLI exited with code ${code}: ${stderr}`));
        }
      });
    });
  }

  private registerIpcHandlers() {
    ipcMain.handle('claudeCLI:check', async () => {
      return await this.checkInstallation();
    });

    ipcMain.handle('claudeCLI:install', async () => {
      return await this.install();
    });

    ipcMain.handle('claudeCLI:execute', async (_, command: string) => {
      return await this.execute(command);
    });
  }
}

export const claudeCliManager = new ClaudeCliManager();