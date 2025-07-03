import React, { useState, useEffect } from 'react';
import { ENGIETerminal } from './renderer/components/ENGIETerminal';
import { FirstRunSetup } from './renderer/components/FirstRunSetup';
import { ApiKeySettings } from './renderer/components/ApiKeySettings';

declare global {
  interface Window {
    engieAPI: {
      getSystemInfo: () => Promise<any>;
      apiKeys: {
        store: (provider: string, key: string) => Promise<boolean>;
        retrieve: (provider: string) => Promise<string | null>;
        delete: (provider: string) => Promise<boolean>;
        list: () => Promise<string[]>;
      };
      claudeCLI: {
        checkInstallation: () => Promise<boolean>;
        install: () => Promise<boolean>;
        execute: (command: string) => Promise<any>;
      };
      ai: {
        processMessage: (message: string, context?: any) => Promise<any>;
        getSuggestions: (context?: any) => Promise<string[]>;
        initialize: () => Promise<boolean>;
        isInitialized: () => Promise<boolean>;
      };
      claude: {
        sendMessage: (message: string, context?: any) => Promise<any>;
        getHistory: () => Promise<any[]>;
        clearHistory: () => Promise<boolean>;
        initialize: () => Promise<boolean>;
      };
      taskMaster: {
        getTasks: () => Promise<TaskMasterTask[]>;
        getTask: (id: string) => Promise<TaskMasterTask>;
        createTask: (description: string) => Promise<TaskMasterTask>;
        updateTaskStatus: (id: string, status: string) => Promise<boolean>;
        updateTask: (id: string, updates: { title?: string; description?: string; priority?: 'high' | 'medium' | 'low' }) => Promise<TaskMasterTask>;
        deleteTask: (id: string) => Promise<boolean>;
        expandTask: (id: string) => Promise<TaskMasterTask>;
        analyzeComplexity: () => Promise<any>;
        research: (query: string) => Promise<string>;
        getNextTask: () => Promise<TaskMasterTask>;
        isConnected: () => Promise<boolean>;
        debugMCPStatus: () => Promise<any>;
      };
      git: {
        addProject: (projectPath: string) => Promise<boolean>;
        removeProject: (projectPath: string) => Promise<boolean>;
        analyzeProject: (projectPath: string) => Promise<any>;
        getProjects: () => Promise<string[]>;
        handleCommit: (projectPath: string) => Promise<void>;
      };
      rag: {
        indexProject: (projectPath: string) => Promise<boolean>;
        searchCode: (query: string, projectPath?: string) => Promise<any[]>;
        getProjectKnowledge: (projectPath: string) => Promise<any>;
        getAllProjects: () => Promise<any[]>;
      };
      template: {
        generate: (templateId: string, variables: Record<string, any>, projectPath?: string) => Promise<any>;
        getAll: (category?: string, language?: string) => Promise<any[]>;
        create: (code: string, metadata: any) => Promise<any>;
        updateFromProject: (projectPath: string) => Promise<number>;
        delete: (templateId: string) => Promise<boolean>;
      };
      memory: {
        startConversation: (projectPath?: string) => Promise<string>;
        addMessage: (message: any) => Promise<void>;
        getContext: (conversationId?: string) => Promise<any>;
        getRelevantContext: (query: string, projectPath?: string) => Promise<any>;
        updateProject: (projectPath: string, updates: any) => Promise<void>;
        addInsight: (projectPath: string, insight: string) => Promise<void>;
        recordTask: (projectPath: string, taskId: string) => Promise<void>;
        endConversation: () => Promise<void>;
        pauseConversation: () => Promise<void>;
      };
      terminal: {
        execute: (command: string) => Promise<any>;
      };
      on: (channel: string, callback: (...args: any[]) => void) => void;
      removeAllListeners: (channel: string) => void;
    };
  }
}

interface TaskMasterTask {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in-progress' | 'done';
  priority: 'low' | 'medium' | 'high';
  dependencies: string[];
  subtasks: TaskMasterTask[];
  details: string;
  testStrategy: string;
  createdAt: Date;
  updatedAt: Date;
}

export const App: React.FC = () => {
  const [showFirstRun, setShowFirstRun] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    // Check if this is first run
    checkFirstRun();

    // Listen for settings open event
    window.engieAPI.on('open-settings', () => {
      setShowSettings(true);
    });

    return () => {
      window.engieAPI.removeAllListeners('open-settings');
    };
  }, []);

  const checkFirstRun = async () => {
    try {
      const providers = await window.engieAPI.apiKeys.list();
      if (providers.length === 0) {
        setShowFirstRun(true);
      }
    } catch (error) {
      console.error('Error checking first run:', error);
    }
  };

  if (showFirstRun) {
    return <FirstRunSetup onComplete={() => setShowFirstRun(false)} />;
  }

  if (showSettings) {
    return <ApiKeySettings onClose={() => setShowSettings(false)} />;
  }

  return (
    <div className="h-screen w-screen bg-dark-900 overflow-hidden">
      <ENGIETerminal />
    </div>
  );
};

export default App;