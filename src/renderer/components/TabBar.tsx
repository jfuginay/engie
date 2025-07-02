import React from 'react';
import { X, Plus, Terminal as TerminalIcon, MessageSquare, FileText } from 'lucide-react';
import type { Tab } from '../../shared/types';

interface TabBarProps {
  tabs: Tab[];
  activeTabId: string;
  onTabSelect: (tabId: string) => void;
  onTabClose: (tabId: string) => void;
  onNewTab: (type: Tab['type']) => void;
}

export const TabBar: React.FC<TabBarProps> = ({
  tabs,
  activeTabId,
  onTabSelect,
  onTabClose,
  onNewTab,
}) => {
  const getTabIcon = (type: Tab['type']) => {
    switch (type) {
      case 'chat':
        return <MessageSquare size={14} />;
      case 'terminal':
        return <TerminalIcon size={14} />;
      case 'task':
        return <FileText size={14} />;
    }
  };

  return (
    <div className="tab-bar">
      {tabs.map((tab) => (
        <div
          key={tab.id}
          className={`tab ${activeTabId === tab.id ? 'active' : ''}`}
          onClick={() => onTabSelect(tab.id)}
        >
          {getTabIcon(tab.type)}
          <span className="truncate max-w-[150px]">{tab.title}</span>
          {tab.closeable && (
            <button
              className="ml-1 hover:bg-dark-600 rounded p-0.5"
              onClick={(e) => {
                e.stopPropagation();
                onTabClose(tab.id);
              }}
            >
              <X size={12} />
            </button>
          )}
        </div>
      ))}
      
      <button
        className="tab hover:text-neon-cyan"
        onClick={() => onNewTab('terminal')}
      >
        <Plus size={14} />
        <span>New Terminal</span>
      </button>
    </div>
  );
};