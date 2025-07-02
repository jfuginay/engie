import React, { useState, useEffect } from 'react';
import { Settings } from 'lucide-react';

export const Header: React.FC = () => {
  const [systemStatus, setSystemStatus] = useState({
    lg: false,  // LangGraph
    bp: false,  // Background Processor
    ai: false,  // Local AI
    tm: false,  // TaskMaster
  });

  useEffect(() => {
    // Simulate checking system status
    setTimeout(() => {
      setSystemStatus({
        lg: true,
        bp: true,
        ai: false,
        tm: true,
      });
    }, 1000);
  }, []);

  return (
    <header className="bg-dark-800 border-b border-dark-700 px-6 py-3 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="16" cy="16" r="14" stroke="#00ffff" strokeWidth="2" className="animate-pulse-neon"/>
            <path d="M16 8V16L20 20" stroke="#00ffff" strokeWidth="2" strokeLinecap="round"/>
            <circle cx="16" cy="16" r="3" fill="#00ffff"/>
          </svg>
          <h1 className="text-xl font-bold text-neon-cyan animate-glow">ENGIE</h1>
        </div>
        
        <div className="flex items-center gap-2 text-xs">
          <StatusIndicator label="LG" active={systemStatus.lg} />
          <StatusIndicator label="BP" active={systemStatus.bp} />
          <StatusIndicator label="AI" active={systemStatus.ai} />
          <StatusIndicator label="TM" active={systemStatus.tm} />
        </div>
      </div>

      <button 
        className="p-2 hover:bg-dark-700 rounded transition-colors"
        onClick={() => window.engieAPI.on('open-settings', () => {})}
      >
        <Settings size={20} className="text-gray-400 hover:text-white" />
      </button>
    </header>
  );
};

const StatusIndicator: React.FC<{ label: string; active: boolean }> = ({ label, active }) => (
  <div className="flex items-center gap-1">
    <div className={`w-2 h-2 rounded-full ${active ? 'bg-green-500' : 'bg-red-500'}`} />
    <span className={`${active ? 'text-green-500' : 'text-gray-500'}`}>{label}</span>
  </div>
);