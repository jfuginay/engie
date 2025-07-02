import { contextBridge, ipcRenderer } from 'electron';

// Define the API that will be exposed to the renderer
const engieAPI = {
  // System info
  getSystemInfo: () => ipcRenderer.invoke('system:getInfo'),
  
  // API Key Management
  apiKeys: {
    store: (provider: string, key: string) => ipcRenderer.invoke('apiKey:store', provider, key),
    retrieve: (provider: string) => ipcRenderer.invoke('apiKey:retrieve', provider),
    delete: (provider: string) => ipcRenderer.invoke('apiKey:delete', provider),
    list: () => ipcRenderer.invoke('apiKey:list'),
  },

  // Claude CLI
  claudeCLI: {
    checkInstallation: () => ipcRenderer.invoke('claudeCLI:check'),
    install: () => ipcRenderer.invoke('claudeCLI:install'),
    execute: (command: string) => ipcRenderer.invoke('claudeCLI:execute', command),
  },

  // AI Orchestrator
  ai: {
    processMessage: (message: string, context?: any) => ipcRenderer.invoke('ai:processMessage', message, context),
    getSuggestions: (context?: any) => ipcRenderer.invoke('ai:getSuggestions', context),
    initialize: () => ipcRenderer.invoke('ai:initialize'),
    isInitialized: () => ipcRenderer.invoke('ai:isInitialized'),
  },

  // Claude AI Service
  claude: {
    sendMessage: (message: string, context?: any) => ipcRenderer.invoke('claude:sendMessage', message, context),
    getHistory: () => ipcRenderer.invoke('claude:getHistory'),
    clearHistory: () => ipcRenderer.invoke('claude:clearHistory'),
    initialize: () => ipcRenderer.invoke('claude:initialize'),
  },

  // TaskMaster MCP
  taskMaster: {
    getTasks: () => ipcRenderer.invoke('taskMaster:getTasks'),
    getTask: (id: string) => ipcRenderer.invoke('taskMaster:getTask', id),
    createTask: (description: string) => ipcRenderer.invoke('taskMaster:createTask', description),
    updateTaskStatus: (id: string, status: string) => ipcRenderer.invoke('taskMaster:updateStatus', id, status),
    expandTask: (id: string) => ipcRenderer.invoke('taskMaster:expandTask', id),
    analyzeComplexity: () => ipcRenderer.invoke('taskMaster:analyzeComplexity'),
    research: (query: string) => ipcRenderer.invoke('taskMaster:research', query),
    getNextTask: () => ipcRenderer.invoke('taskMaster:getNextTask'),
  },

  // Git Monitor
  git: {
    addProject: (projectPath: string) => ipcRenderer.invoke('git:addProject', projectPath),
    removeProject: (projectPath: string) => ipcRenderer.invoke('git:removeProject', projectPath),
    analyzeProject: (projectPath: string) => ipcRenderer.invoke('git:analyzeProject', projectPath),
    getProjects: () => ipcRenderer.invoke('git:getProjects'),
    handleCommit: (projectPath: string) => ipcRenderer.invoke('git:handleCommit', projectPath),
  },

  // RAG System
  rag: {
    indexProject: (projectPath: string) => ipcRenderer.invoke('rag:indexProject', projectPath),
    searchCode: (query: string, projectPath?: string) => ipcRenderer.invoke('rag:searchCode', query, projectPath),
    getProjectKnowledge: (projectPath: string) => ipcRenderer.invoke('rag:getProjectKnowledge', projectPath),
    getAllProjects: () => ipcRenderer.invoke('rag:getAllProjects'),
  },

  // Template System
  template: {
    generate: (templateId: string, variables: Record<string, any>, projectPath?: string) => 
      ipcRenderer.invoke('template:generate', templateId, variables, projectPath),
    getAll: (category?: string, language?: string) => ipcRenderer.invoke('template:getAll', category, language),
    create: (code: string, metadata: any) => ipcRenderer.invoke('template:create', code, metadata),
    updateFromProject: (projectPath: string) => ipcRenderer.invoke('template:updateFromProject', projectPath),
    delete: (templateId: string) => ipcRenderer.invoke('template:delete', templateId),
  },

  // Memory System
  memory: {
    startConversation: (projectPath?: string) => ipcRenderer.invoke('memory:startConversation', projectPath),
    addMessage: (message: any) => ipcRenderer.invoke('memory:addMessage', message),
    getContext: (conversationId?: string) => ipcRenderer.invoke('memory:getContext', conversationId),
    getRelevantContext: (query: string, projectPath?: string) => 
      ipcRenderer.invoke('memory:getRelevantContext', query, projectPath),
    updateProject: (projectPath: string, updates: any) => 
      ipcRenderer.invoke('memory:updateProject', projectPath, updates),
    addInsight: (projectPath: string, insight: string) => 
      ipcRenderer.invoke('memory:addInsight', projectPath, insight),
    recordTask: (projectPath: string, taskId: string) => 
      ipcRenderer.invoke('memory:recordTask', projectPath, taskId),
    endConversation: () => ipcRenderer.invoke('memory:endConversation'),
  },

  // Terminal
  terminal: {
    create: (sessionId: string, options?: any) => ipcRenderer.invoke('terminal:create', sessionId, options),
    execute: (sessionId: string, command: string) => ipcRenderer.invoke('terminal:execute', sessionId, command),
    sendInput: (sessionId: string, input: string) => ipcRenderer.invoke('terminal:sendInput', sessionId, input),
    close: (sessionId: string) => ipcRenderer.invoke('terminal:close', sessionId),
    getInfo: (sessionId: string) => ipcRenderer.invoke('terminal:getInfo', sessionId),
    getAllSessions: () => ipcRenderer.invoke('terminal:getAllSessions'),
    resize: (sessionId: string, cols: number, rows: number) => ipcRenderer.invoke('terminal:resize', sessionId, cols, rows),
    onOutput: (callback: (event: any, data: any) => void) => {
      ipcRenderer.on('terminal:output', callback);
    },
    onClosed: (callback: (event: any, data: any) => void) => {
      ipcRenderer.on('terminal:closed', callback);
    },
    onError: (callback: (event: any, data: any) => void) => {
      ipcRenderer.on('terminal:error', callback);
    },
  },

  // IPC Event Listeners
  on: (channel: string, callback: (...args: any[]) => void) => {
    const validChannels = ['open-settings', 'task-updated', 'claude-response'];
    if (validChannels.includes(channel)) {
      ipcRenderer.on(channel, (_event, ...args) => callback(...args));
    }
  },

  removeAllListeners: (channel: string) => {
    ipcRenderer.removeAllListeners(channel);
  },
};

// Expose the API to the renderer process
contextBridge.exposeInMainWorld('engieAPI', engieAPI);

// Type definitions for TypeScript
export type EngieAPI = typeof engieAPI;