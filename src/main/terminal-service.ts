import { spawn, ChildProcess } from 'child_process';
import { ipcMain } from 'electron';
import * as os from 'os';
import * as path from 'path';
import { EventEmitter } from 'events';

interface TerminalSession {
  id: string;
  process: ChildProcess;
  cwd: string;
  isActive: boolean;
  isClaudeSession: boolean;
}

class TerminalService extends EventEmitter {
  private sessions: Map<string, TerminalSession> = new Map();
  private isInitialized = false;

  async initialize(): Promise<boolean> {
    try {
      this.registerIpcHandlers();
      
      // Check if Claude CLI is installed
      const claudeAvailable = await this.checkClaudeCliAvailable();
      if (claudeAvailable) {
        console.log('Claude CLI is available');
      } else {
        console.warn('Claude CLI not found - will install if needed');
      }
      
      this.isInitialized = true;
      console.log('Terminal service initialized');
      return true;
    } catch (error) {
      console.error('Failed to initialize terminal service:', error);
      return false;
    }
  }

  private async checkClaudeCliAvailable(): Promise<boolean> {
    return new Promise((resolve) => {
      const process = spawn('which', ['claude'], { stdio: 'pipe' });
      
      process.on('close', (code) => {
        resolve(code === 0);
      });
      
      process.on('error', () => {
        resolve(false);
      });
    });
  }

  private async installClaudeCli(): Promise<boolean> {
    console.log('Installing Claude CLI...');
    return new Promise((resolve) => {
      const process = spawn('npm', ['install', '-g', '@anthropic/claude-cli'], { 
        stdio: 'pipe',
        shell: true 
      });
      
      let output = '';
      
      process.stdout?.on('data', (data) => {
        output += data.toString();
      });
      
      process.stderr?.on('data', (data) => {
        output += data.toString();
      });
      
      process.on('close', (code) => {
        if (code === 0) {
          console.log('Claude CLI installed successfully');
          resolve(true);
        } else {
          console.error('Failed to install Claude CLI:', output);
          resolve(false);
        }
      });
    });
  }

  async createTerminalSession(
    sessionId: string, 
    options: {
      cwd?: string;
      useClaudeCli?: boolean;
      command?: string;
    } = {}
  ): Promise<boolean> {
    try {
      const { cwd = os.homedir(), useClaudeCli = false, command } = options;
      
      let shell: string;
      let args: string[] = [];
      
      if (process.platform === 'darwin') {
        // Use macOS default shell with interactive flag
        shell = process.env.SHELL || '/bin/zsh';
        args = ['-i']; // Interactive mode for proper shell environment
      } else {
        shell = '/bin/bash';
        args = ['-i']; // Interactive mode
      }

      // Set up environment with expanded PATH for Claude CLI
      const currentPath = process.env.PATH || '';
      const nvmPath = '/Users/jfuginay/.nvm/versions/node/v20.19.3/bin';
      const homebrewPath = '/opt/homebrew/bin';
      const localBinPath = '/usr/local/bin';
      
      const env = {
        ...process.env,
        TERM: 'xterm-256color',
        PATH: `${nvmPath}:${homebrewPath}:${localBinPath}:${currentPath}`,
        HOME: os.homedir(),
        USER: os.userInfo().username,
      };

      // Create the process
      const terminalProcess = spawn(shell, args, {
        cwd,
        env,
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      const session: TerminalSession = {
        id: sessionId,
        process: terminalProcess,
        cwd,
        isActive: true,
        isClaudeSession: useClaudeCli,
      };

      this.sessions.set(sessionId, session);

      // Set up data handlers
      terminalProcess.stdout?.on('data', (data) => {
        this.emit('terminal-output', {
          sessionId,
          data: data.toString(),
          type: 'stdout',
        });
      });

      terminalProcess.stderr?.on('data', (data) => {
        this.emit('terminal-output', {
          sessionId,
          data: data.toString(),
          type: 'stderr',
        });
      });

      terminalProcess.on('close', (code) => {
        session.isActive = false;
        this.emit('terminal-closed', { sessionId, code });
      });

      terminalProcess.on('error', (error) => {
        console.error(`Terminal session ${sessionId} error:`, error);
        this.emit('terminal-error', { sessionId, error: error.message });
      });

      // If using Claude CLI, start it automatically
      if (useClaudeCli) {
        await this.startClaudeCliInSession(sessionId);
      }

      // If a command was provided, execute it
      if (command) {
        await this.executeCommand(sessionId, command);
      }

      console.log(`Terminal session ${sessionId} created (Claude: ${useClaudeCli})`);
      return true;
    } catch (error) {
      console.error(`Failed to create terminal session ${sessionId}:`, error);
      return false;
    }
  }

  private async startClaudeCliInSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    // Check if Claude CLI is available, install if not
    const claudeAvailable = await this.checkClaudeCliAvailable();
    if (!claudeAvailable) {
      const installed = await this.installClaudeCli();
      if (!installed) {
        this.emit('terminal-output', {
          sessionId,
          data: '\r\n❌ Failed to install Claude CLI. Please install manually:\r\nnpm install -g @anthropic/claude-cli\r\n',
          type: 'stderr',
        });
        return;
      }
    }

    // Send welcome message
    this.emit('terminal-output', {
      sessionId,
      data: '\r\n🚀 ENGIE Terminal with Claude CLI\r\n',
      type: 'stdout',
    });

    this.emit('terminal-output', {
      sessionId,
      data: '💡 Type "claude" to start Claude CLI\r\n',
      type: 'stdout',
    });

    this.emit('terminal-output', {
      sessionId,
      data: '💡 Type "claude auth" to authenticate with your Anthropic account\r\n',
      type: 'stdout',
    });

    this.emit('terminal-output', {
      sessionId,
      data: '💡 Type "claude chat" to start a chat session\r\n\r\n',
      type: 'stdout',
    });
  }

  async executeCommand(sessionId: string, command: string): Promise<boolean> {
    const session = this.sessions.get(sessionId);
    if (!session || !session.isActive) {
      return false;
    }

    try {
      session.process.stdin?.write(command + '\n');
      return true;
    } catch (error) {
      console.error(`Failed to execute command in session ${sessionId}:`, error);
      return false;
    }
  }

  async closeSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    session.isActive = false;
    
    try {
      // Send Ctrl+C to gracefully exit
      session.process.stdin?.write('\x03');
      
      // Give it a moment to close gracefully
      setTimeout(() => {
        if (!session.process.killed) {
          session.process.kill('SIGTERM');
        }
      }, 1000);
    } catch (error) {
      console.error(`Error closing session ${sessionId}:`, error);
    }

    this.sessions.delete(sessionId);
  }

  getSessionInfo(sessionId: string) {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    return {
      id: session.id,
      cwd: session.cwd,
      isActive: session.isActive,
      isClaudeSession: session.isClaudeSession,
      pid: session.process.pid,
    };
  }

  getAllSessions() {
    return Array.from(this.sessions.keys()).map(id => this.getSessionInfo(id));
  }

  async sendInput(sessionId: string, input: string): Promise<boolean> {
    const session = this.sessions.get(sessionId);
    if (!session || !session.isActive) {
      return false;
    }

    try {
      session.process.stdin?.write(input);
      return true;
    } catch (error) {
      console.error(`Failed to send input to session ${sessionId}:`, error);
      return false;
    }
  }

  async resizeTerminal(sessionId: string, cols: number, rows: number): Promise<boolean> {
    const session = this.sessions.get(sessionId);
    if (!session || !session.isActive) {
      return false;
    }

    try {
      // Note: For full PTY support, we'd need to use node-pty
      // For now, we'll simulate resize
      return true;
    } catch (error) {
      console.error(`Failed to resize terminal ${sessionId}:`, error);
      return false;
    }
  }

  private registerIpcHandlers(): void {
    ipcMain.handle('terminal:create', async (_, sessionId: string, options: any) => {
      return await this.createTerminalSession(sessionId, options);
    });

    ipcMain.handle('terminal:execute', async (_, sessionId: string, command: string) => {
      return await this.executeCommand(sessionId, command);
    });

    ipcMain.handle('terminal:sendInput', async (_, sessionId: string, input: string) => {
      return await this.sendInput(sessionId, input);
    });

    ipcMain.handle('terminal:close', async (_, sessionId: string) => {
      await this.closeSession(sessionId);
      return true;
    });

    ipcMain.handle('terminal:getInfo', async (_, sessionId: string) => {
      return this.getSessionInfo(sessionId);
    });

    ipcMain.handle('terminal:getAllSessions', async () => {
      return this.getAllSessions();
    });

    ipcMain.handle('terminal:resize', async (_, sessionId: string, cols: number, rows: number) => {
      return await this.resizeTerminal(sessionId, cols, rows);
    });

    // Send terminal output to renderer
    this.on('terminal-output', (data) => {
      // We'll need to get the main window instance to send this
      // For now, we'll emit it and handle it in the main app
    });
  }

  // Helper method to start a Claude chat session directly
  async startClaudeChat(sessionId: string): Promise<boolean> {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    // Check authentication first
    await this.executeCommand(sessionId, 'claude auth status');
    
    // Small delay then start chat
    setTimeout(() => {
      this.executeCommand(sessionId, 'claude chat');
    }, 1000);

    return true;
  }

  // Helper to authenticate Claude CLI
  async authenticateClaude(sessionId: string): Promise<boolean> {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    await this.executeCommand(sessionId, 'claude auth');
    return true;
  }
}

export const terminalService = new TerminalService();