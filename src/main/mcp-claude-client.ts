import { ipcMain } from 'electron';
import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';

interface MCPMessage {
  jsonrpc: string;
  id?: number | string;
  method?: string;
  params?: any;
  result?: any;
  error?: any;
}

interface MCPTool {
  name: string;
  description: string;
  inputSchema: any;
}

interface MCPResource {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
}

class MCPClaudeClient extends EventEmitter {
  private process: ChildProcess | null = null;
  private connected = false;
  private messageId = 1;
  private pendingRequests = new Map<number, { resolve: Function; reject: Function }>();
  private tools: MCPTool[] = [];
  private resources: MCPResource[] = [];

  async initialize(): Promise<boolean> {
    try {
      console.log('🔗 Initializing MCP Claude Code client...');
      
      // Start Claude Code in MCP server mode
      this.process = spawn('claude', ['mcp', 'serve'], {
        stdio: ['pipe', 'pipe', 'pipe'],
        shell: true
      });

      if (!this.process.stdin || !this.process.stdout || !this.process.stderr) {
        throw new Error('Failed to establish stdio pipes with Claude MCP server');
      }

      // Handle process events
      this.process.on('error', (error) => {
        console.error('❌ MCP Claude process error:', error);
        this.connected = false;
        this.emit('disconnected', error);
      });

      this.process.on('exit', (code, signal) => {
        console.log(`🔚 MCP Claude process exited with code ${code}, signal ${signal}`);
        this.connected = false;
        this.emit('disconnected', { code, signal });
      });

      // Handle stderr for debugging
      this.process.stderr.on('data', (data) => {
        console.warn('MCP Claude stderr:', data.toString());
      });

      // Setup message handling
      let buffer = '';
      this.process.stdout.on('data', (data) => {
        buffer += data.toString();
        
        // Process complete JSON messages
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer
        
        for (const line of lines) {
          if (line.trim()) {
            try {
              const message = JSON.parse(line) as MCPMessage;
              this.handleMessage(message);
            } catch (error) {
              console.error('Failed to parse MCP message:', line, error);
            }
          }
        }
      });

      // Initialize MCP session
      await this.initializeMCPSession();
      
      console.log('✅ MCP Claude Code client initialized successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize MCP Claude client:', error);
      return false;
    }
  }

  private async initializeMCPSession(): Promise<void> {
    // Send initialize request
    const initResponse = await this.sendRequest('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {
        tools: {},
        resources: {}
      },
      clientInfo: {
        name: 'ENGIE',
        version: '1.0.0'
      }
    });

    if (initResponse.error) {
      throw new Error(`MCP initialization failed: ${initResponse.error.message}`);
    }

    console.log('🤝 MCP session initialized:', initResponse.result);

    // Send initialized notification
    this.sendNotification('notifications/initialized', {});

    // Discover available tools and resources
    await this.discoverCapabilities();
    
    this.connected = true;
    this.emit('connected');
  }

  private async discoverCapabilities(): Promise<void> {
    try {
      // Get available tools
      const toolsResponse = await this.sendRequest('tools/list', {});
      if (toolsResponse.result?.tools) {
        this.tools = toolsResponse.result.tools;
        console.log(`📋 Discovered ${this.tools.length} MCP tools:`, this.tools.map(t => t.name));
      }

      // Get available resources
      const resourcesResponse = await this.sendRequest('resources/list', {});
      if (resourcesResponse.result?.resources) {
        this.resources = resourcesResponse.result.resources;
        console.log(`📁 Discovered ${this.resources.length} MCP resources`);
      }
    } catch (error) {
      console.warn('⚠️ Failed to discover some MCP capabilities:', error);
    }
  }

  private handleMessage(message: MCPMessage): void {
    if (message.id && this.pendingRequests.has(Number(message.id))) {
      // Handle response to our request
      const pending = this.pendingRequests.get(Number(message.id))!;
      this.pendingRequests.delete(Number(message.id));
      
      if (message.error) {
        pending.reject(new Error(message.error.message || 'MCP request failed'));
      } else {
        pending.resolve(message);
      }
    } else if (message.method) {
      // Handle notifications or requests from server
      this.emit('mcpMessage', message);
    }
  }

  private sendMessage(message: MCPMessage): void {
    if (!this.process?.stdin) {
      throw new Error('MCP Claude process not available');
    }

    const messageStr = JSON.stringify(message) + '\n';
    this.process.stdin.write(messageStr);
  }

  private sendRequest(method: string, params: any): Promise<MCPMessage> {
    return new Promise((resolve, reject) => {
      const id = this.messageId++;
      
      this.pendingRequests.set(id, { resolve, reject });
      
      this.sendMessage({
        jsonrpc: '2.0',
        id,
        method,
        params
      });

      // Set timeout for request
      setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          reject(new Error('MCP request timeout'));
        }
      }, 30000); // 30 second timeout
    });
  }

  private sendNotification(method: string, params: any): void {
    this.sendMessage({
      jsonrpc: '2.0',
      method,
      params
    });
  }

  // Public API methods

  async callTool(toolName: string, arguments_: any): Promise<any> {
    if (!this.connected) {
      throw new Error('MCP Claude client not connected');
    }

    const tool = this.tools.find(t => t.name === toolName);
    if (!tool) {
      throw new Error(`Tool '${toolName}' not available`);
    }

    console.log(`🔧 Calling MCP tool: ${toolName}`, arguments_);
    
    const response = await this.sendRequest('tools/call', {
      name: toolName,
      arguments: arguments_
    });

    if (response.error) {
      throw new Error(`Tool call failed: ${response.error.message}`);
    }

    return response.result;
  }

  async readResource(uri: string): Promise<any> {
    if (!this.connected) {
      throw new Error('MCP Claude client not connected');
    }

    console.log(`📖 Reading MCP resource: ${uri}`);
    
    const response = await this.sendRequest('resources/read', {
      uri
    });

    if (response.error) {
      throw new Error(`Resource read failed: ${response.error.message}`);
    }

    return response.result;
  }

  async listFiles(path?: string): Promise<any> {
    return await this.callTool('LS', { path: path || '.' });
  }

  async readFile(filePath: string): Promise<any> {
    return await this.callTool('Read', { file_path: filePath });
  }

  async editFile(filePath: string, oldString: string, newString: string): Promise<any> {
    return await this.callTool('Edit', {
      file_path: filePath,
      old_string: oldString,
      new_string: newString
    });
  }

  async writeFile(filePath: string, content: string): Promise<any> {
    return await this.callTool('Write', {
      file_path: filePath,
      content
    });
  }

  async viewFile(filePath: string, viewType?: string): Promise<any> {
    return await this.callTool('View', {
      path: filePath,
      view_type: viewType
    });
  }

  async searchFiles(pattern: string, filePattern?: string): Promise<any> {
    return await this.callTool('Grep', {
      pattern,
      file_pattern: filePattern
    });
  }

  async runBash(command: string): Promise<any> {
    return await this.callTool('Bash', {
      command
    });
  }

  getAvailableTools(): MCPTool[] {
    return [...this.tools];
  }

  getAvailableResources(): MCPResource[] {
    return [...this.resources];
  }

  isConnected(): boolean {
    return this.connected;
  }

  async disconnect(): Promise<void> {
    if (this.process) {
      this.process.kill();
      this.process = null;
    }
    this.connected = false;
    this.pendingRequests.clear();
  }

  // Integration with ENGIE workflow
  
  async syncProjectFromGitHub(repoPath: string, projectContext: any): Promise<{
    success: boolean;
    files?: string[];
    structure?: any;
    error?: string;
  }> {
    try {
      console.log(`🔄 Syncing project from ${repoPath} via MCP...`);
      
      // List project files
      const fileList = await this.listFiles(repoPath);
      
      // Read key project files for context
      const keyFiles = ['package.json', 'README.md', 'CLAUDE.md', 'requirements.txt', 'setup.py'];
      const projectFiles: any = {};
      
      for (const fileName of keyFiles) {
        try {
          const filePath = `${repoPath}/${fileName}`;
          const fileContent = await this.readFile(filePath);
          projectFiles[fileName] = fileContent;
        } catch {
          // File doesn't exist, skip
        }
      }
      
      return {
        success: true,
        files: fileList.contents || [],
        structure: {
          projectFiles,
          context: projectContext
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to sync project'
      };
    }
  }

  async implementTaskWithMCP(
    taskTitle: string,
    taskDescription: string,
    projectPath: string,
    context?: any
  ): Promise<{
    success: boolean;
    changes?: string[];
    commitMessage?: string;
    error?: string;
  }> {
    try {
      console.log(`🚀 Implementing task "${taskTitle}" via MCP...`);
      
      // First, understand the project structure
      const projectSync = await this.syncProjectFromGitHub(projectPath, context);
      if (!projectSync.success) {
        throw new Error(projectSync.error);
      }
      
      // Use Claude Code tools to implement the task
      // This is a simplified approach - in reality, this would involve
      // more sophisticated prompting and file analysis
      
      const implementation = await this.callTool('Task', {
        description: `Implement: ${taskTitle}`,
        prompt: `Please implement the following task:
        
Title: ${taskTitle}
Description: ${taskDescription}

Project context:
${JSON.stringify(projectSync.structure, null, 2)}

Please create or modify the necessary files to implement this task.
Follow the project's existing patterns and standards.`
      });
      
      return {
        success: true,
        changes: implementation.changes || [],
        commitMessage: `Implement: ${taskTitle}\n\n${taskDescription}\n\n🤖 Generated via ENGIE + Claude Code MCP`
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to implement task'
      };
    }
  }

  registerIpcHandlers(): void {
    ipcMain.handle('mcpClaude:initialize', async () => {
      return await this.initialize();
    });

    ipcMain.handle('mcpClaude:isConnected', async () => {
      return this.isConnected();
    });

    ipcMain.handle('mcpClaude:getTools', async () => {
      return this.getAvailableTools();
    });

    ipcMain.handle('mcpClaude:getResources', async () => {
      return this.getAvailableResources();
    });

    ipcMain.handle('mcpClaude:callTool', async (_, toolName: string, args: any) => {
      return await this.callTool(toolName, args);
    });

    ipcMain.handle('mcpClaude:readFile', async (_, filePath: string) => {
      return await this.readFile(filePath);
    });

    ipcMain.handle('mcpClaude:editFile', async (_, filePath: string, oldString: string, newString: string) => {
      return await this.editFile(filePath, oldString, newString);
    });

    ipcMain.handle('mcpClaude:syncProject', async (_, repoPath: string, context: any) => {
      return await this.syncProjectFromGitHub(repoPath, context);
    });

    ipcMain.handle('mcpClaude:implementTask', async (_, title: string, description: string, projectPath: string, context: any) => {
      return await this.implementTaskWithMCP(title, description, projectPath, context);
    });

    ipcMain.handle('mcpClaude:disconnect', async () => {
      await this.disconnect();
    });
  }
}

export const mcpClaudeClient = new MCPClaudeClient();