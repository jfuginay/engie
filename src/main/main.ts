import { app, BrowserWindow, Menu, ipcMain } from 'electron';
import * as path from 'path';

// Only load dotenv in development
if (process.env.NODE_ENV !== 'production') {
  try {
    require('dotenv').config();
  } catch (error) {
    console.warn('dotenv not available:', error);
  }
}
import { apiKeyManager } from './api-key-manager';
import { claudeCliManager } from './claude-cli-manager';
// import { backgroundProcessor } from './background-processor';
import { claudeAIService } from './claude-ai-service';
import { simpleTaskManager } from './simple-task-manager';
import { aiOrchestrator } from './ai-orchestrator';
import { gitMonitor } from './git-monitor';
import { ragSystem } from './rag-system';
import { templateSystem } from './template-system';
import { memorySystem } from './memory-system';
import { taskStorage } from './task-storage-simple';
import { vectorStore } from './vector-store-simple';
import { terminalService } from './terminal-service';
import { gitHubManager } from './github-manager';
import { mcpClaudeClient } from './mcp-claude-client';

class EngieApp {
  private mainWindow: BrowserWindow | null = null;
  private taskWindow: BrowserWindow | null = null;

  constructor() {
    this.init();
  }

  private init() {
    app.whenReady().then(async () => {
      await this.initializeServices();
      this.createWindow();
      this.setupMenu();
      this.registerIpcHandlers();
    });

    app.on('window-all-closed', () => {
      if (process.platform !== 'darwin') {
        app.quit();
      }
    });

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        this.createWindow();
      }
    });
  }

  private async createWindow(): Promise<void> {
    this.mainWindow = new BrowserWindow({
      height: 900,
      width: 1400,
      minHeight: 600,
      minWidth: 1000,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, '../preload/preload.js'),
      },
      titleBarStyle: 'hiddenInset',
      show: false,
    });

    // Handle window ready to show
    this.mainWindow.once('ready-to-show', () => {
      this.mainWindow?.show();
    });

    // Load the app
    if (process.env.NODE_ENV === 'development') {
      await this.mainWindow.loadURL('http://localhost:5173');
      this.mainWindow.webContents.openDevTools();
    } else {
      await this.mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
    }

    this.mainWindow.on('closed', () => {
      this.mainWindow = null;
    });
  }

  private async createTaskWindow(): Promise<void> {
    // Don't create if already exists
    if (this.taskWindow && !this.taskWindow.isDestroyed()) {
      this.taskWindow.focus();
      return;
    }

    this.taskWindow = new BrowserWindow({
      height: 600,
      width: 800,
      minHeight: 400,
      minWidth: 600,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, '../preload/preload.js'),
      },
      titleBarStyle: 'hiddenInset',
      show: false,
      parent: this.mainWindow || undefined,
    });

    this.taskWindow.once('ready-to-show', () => {
      this.taskWindow?.show();
    });

    // Load the task window
    if (process.env.NODE_ENV === 'development') {
      await this.taskWindow.loadURL('http://localhost:5173/task-window.html');
    } else {
      await this.taskWindow.loadFile(path.join(__dirname, '../renderer/task-window.html'));
    }

    this.taskWindow.on('closed', () => {
      this.taskWindow = null;
      // Notify main window that task window closed
      if (this.mainWindow && !this.mainWindow.isDestroyed()) {
        this.mainWindow.webContents.send('task-window-closed');
      }
    });
  }

  private setupMenu() {
    const template: Electron.MenuItemConstructorOptions[] = [
      {
        label: 'ENGIE',
        submenu: [
          { label: 'About ENGIE', role: 'about' },
          { type: 'separator' },
          { label: 'Settings', accelerator: 'CmdOrCtrl+,', click: () => this.openSettings() },
          { type: 'separator' },
          { label: 'Quit', accelerator: 'CmdOrCtrl+Q', role: 'quit' }
        ]
      },
      {
        label: 'Edit',
        submenu: [
          { role: 'undo' },
          { role: 'redo' },
          { type: 'separator' },
          { role: 'cut' },
          { role: 'copy' },
          { role: 'paste' }
        ]
      },
      {
        label: 'View',
        submenu: [
          { role: 'reload' },
          { role: 'forceReload' },
          { role: 'toggleDevTools' },
          { type: 'separator' },
          { role: 'resetZoom' },
          { role: 'zoomIn' },
          { role: 'zoomOut' },
          { type: 'separator' },
          { role: 'togglefullscreen' }
        ]
      }
    ];

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
  }

  private openSettings() {
    this.mainWindow?.webContents.send('open-settings');
  }

  private async initializeServices() {
    try {
      console.log('Starting service initialization...');
      
      // Initialize storage systems first
      console.log('Initializing storage systems...');
      await taskStorage.initialize();
      await vectorStore.initialize();
      
      // Initialize core services
      console.log('Initializing core services...');
      await claudeCliManager.initialize();
      // TEMPORARILY DISABLED: Background processor was spamming Claude API
      // await backgroundProcessor.start();
      
      // Initialize AI and supporting services
      console.log('Initializing AI and supporting services...');
      await terminalService.initialize();
      await simpleTaskManager.initialize();
      simpleTaskManager.registerIpcHandlers();
      await aiOrchestrator.initialize();
      await gitMonitor.initialize();
      await ragSystem.initialize();
      await templateSystem.initialize();
      await memorySystem.initialize();
      await gitHubManager.initialize();
      await mcpClaudeClient.initialize();
      
      console.log('All services initialized, registering IPC handlers...');
      
      // Register IPC handlers for services that don't auto-register during initialization
      try {
        apiKeyManager.registerIpcHandlers();
        console.log('✅ API Key Manager IPC handlers registered');
      } catch (error) {
        console.error('❌ Failed to register API Key Manager IPC handlers:', error);
      }
      
      try {
        claudeAIService.registerIpcHandlers();
        console.log('✅ Claude AI Service IPC handlers registered');
      } catch (error) {
        console.error('❌ Failed to register Claude AI Service IPC handlers:', error);
      }
      
      try {
        // Simple Task Manager handlers already registered above
        console.log('✅ Simple Task Manager IPC handlers registered');
      } catch (error) {
        console.error('❌ Failed to register Simple Task Manager IPC handlers:', error);
      }
      
      try {
        aiOrchestrator.registerIpcHandlers();
        console.log('✅ AI Orchestrator IPC handlers registered');
      } catch (error) {
        console.error('❌ Failed to register AI Orchestrator IPC handlers:', error);
      }

      try {
        gitHubManager.registerIpcHandlers();
        console.log('✅ GitHub Manager IPC handlers registered');
      } catch (error) {
        console.error('❌ Failed to register GitHub Manager IPC handlers:', error);
      }

      try {
        mcpClaudeClient.registerIpcHandlers();
        console.log('✅ MCP Claude Client IPC handlers registered');
      } catch (error) {
        console.error('❌ Failed to register MCP Claude Client IPC handlers:', error);
      }
      
      // Set up terminal output forwarding
      this.setupTerminalForwarding();
      
      console.log('🎉 All services initialized - ENGIE is ready!');
    } catch (error) {
      console.error('💥 Fatal error during service initialization:', error);
      throw error;
    }
  }

  private setupTerminalForwarding() {
    // Forward terminal events to renderer
    terminalService.on('terminal-output', (data) => {
      if (this.mainWindow) {
        this.mainWindow.webContents.send('terminal:output', data);
      }
    });

    terminalService.on('terminal-closed', (data) => {
      if (this.mainWindow) {
        this.mainWindow.webContents.send('terminal:closed', data);
      }
    });

    terminalService.on('terminal-error', (data) => {
      if (this.mainWindow) {
        this.mainWindow.webContents.send('terminal:error', data);
      }
    });

    // Broadcast task updates to both windows
    const broadcastTaskUpdate = () => {
      if (this.mainWindow && !this.mainWindow.isDestroyed()) {
        this.mainWindow.webContents.send('tasks-updated');
      }
      if (this.taskWindow && !this.taskWindow.isDestroyed()) {
        this.taskWindow.webContents.send('tasks-updated');
      }
    };

    // Manual broadcast when needed (after task operations)
    ipcMain.on('broadcast-task-update', broadcastTaskUpdate);
  }

  private registerIpcHandlers() {
    // System info handler
    ipcMain.handle('system:getInfo', () => {
      return {
        platform: process.platform,
        version: app.getVersion(),
        electronVersion: process.versions.electron,
        nodeVersion: process.versions.node,
      };
    });

    // Terminal handlers are now registered by terminalService.registerIpcHandlers()
    // No need for simple terminal handler - using proper terminal service instead

    // Debug Task Manager status
    ipcMain.handle('debug:mcpStatus', async () => {
      console.log('🔍 DEBUG: Checking Simple Task Manager status...');
      try {
        const debug = await simpleTaskManager.debugStatus();
        return debug;
      } catch (error) {
        console.error('Debug Task Manager status failed:', error);
        return { error: error instanceof Error ? error.message : 'Unknown error' };
      }
    });

    // Task Window handlers
    ipcMain.handle('taskWindow:open', async () => {
      await this.createTaskWindow();
    });

    ipcMain.handle('taskWindow:close', () => {
      if (this.taskWindow && !this.taskWindow.isDestroyed()) {
        this.taskWindow.close();
      }
    });
  }
}

new EngieApp();