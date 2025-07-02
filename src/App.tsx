import React, { useState, useEffect, useCallback } from 'react';
import { ChatInterface } from './renderer/components/ChatInterface';
import { TabBar } from './renderer/components/TabBar';
import { TaskSidebar } from './renderer/components/TaskSidebar';
import { Terminal } from './renderer/components/Terminal';
import { TaskViewer } from './renderer/components/TaskViewer';
import { Header } from './renderer/components/Header';
import { FirstRunSetup } from './renderer/components/FirstRunSetup';
import { ApiKeySettings } from './renderer/components/ApiKeySettings';
import type { Tab, TaskMasterTask } from './shared/types';

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
        expandTask: (id: string) => Promise<TaskMasterTask>;
        analyzeComplexity: () => Promise<any>;
        research: (query: string) => Promise<string>;
        getNextTask: () => Promise<TaskMasterTask>;
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
      };
      terminal: {
        execute: (command: string) => Promise<any>;
      };
      on: (channel: string, callback: (...args: any[]) => void) => void;
      removeAllListeners: (channel: string) => void;
    };
  }
}

export const App: React.FC = () => {
  const [tabs, setTabs] = useState<Tab[]>([
    { id: 'chat', type: 'chat', title: 'Chat', closeable: false }
  ]);
  const [activeTabId, setActiveTabId] = useState('chat');
  const [tasks, setTasks] = useState<TaskMasterTask[]>([]);
  const [showFirstRun, setShowFirstRun] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    // Check if this is first run
    checkFirstRun();
    
    // Load tasks
    loadTasks();

    // Listen for settings open event
    window.engieAPI.on('open-settings', () => {
      setShowSettings(true);
    });

    return () => {
      window.engieAPI.removeAllListeners('open-settings');
    };
  }, []);

  const checkFirstRun = async () => {
    const providers = await window.engieAPI.apiKeys.list();
    if (providers.length === 0) {
      setShowFirstRun(true);
    }
  };

  const loadTasks = async () => {
    try {
      const taskList = await window.engieAPI.taskMaster.getTasks();
      setTasks(taskList);
    } catch (error) {
      console.error('Failed to load tasks:', error);
    }
  };

  const openNewTab = useCallback((type: Tab['type'], title: string, data?: any) => {
    const newTab: Tab = {
      id: `${type}-${Date.now()}`,
      type,
      title,
      closeable: true,
      data
    };
    
    setTabs(prev => [...prev, newTab]);
    setActiveTabId(newTab.id);
  }, []);

  const closeTab = useCallback((tabId: string) => {
    setTabs(prev => {
      const newTabs = prev.filter(tab => tab.id !== tabId);
      if (activeTabId === tabId && newTabs.length > 0) {
        setActiveTabId(newTabs[newTabs.length - 1].id);
      }
      return newTabs;
    });
  }, [activeTabId]);

  const renderTabContent = () => {
    const activeTab = tabs.find(tab => tab.id === activeTabId);
    
    switch (activeTab?.type) {
      case 'chat':
        return <ChatInterface />;
      case 'terminal':
        return <Terminal />;
      case 'task':
        return <TaskViewer task={activeTab.data} onUpdate={loadTasks} />;
      default:
        return <div className="p-4">Loading...</div>;
    }
  };

  if (showFirstRun) {
    return <FirstRunSetup onComplete={() => setShowFirstRun(false)} />;
  }

  if (showSettings) {
    return <ApiKeySettings onClose={() => setShowSettings(false)} />;
  }

  return (
    <div className="terminal-container">
      <Header />
      
      <TabBar
        tabs={tabs}
        activeTabId={activeTabId}
        onTabSelect={setActiveTabId}
        onTabClose={closeTab}
        onNewTab={(type) => {
          if (type === 'terminal') {
            openNewTab('terminal', 'Terminal');
          }
        }}
      />
      
      <div className="main-content">
        <div className="flex-1 overflow-hidden">
          {renderTabContent()}
        </div>
        
        <TaskSidebar 
          tasks={tasks} 
          onTaskSelect={(task) => openNewTab('task', task.title, task)}
          onRefresh={loadTasks}
        />
      </div>
    </div>
  );
};

export default App;