import React, { useState, useRef, useEffect } from 'react';

interface CommandHistory {
  command: string;
  output: string;
  timestamp: Date;
}

export const Terminal: React.FC = () => {
  const [history, setHistory] = useState<CommandHistory[]>([]);
  const [currentCommand, setCurrentCommand] = useState('');
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [sessionId, setSessionId] = useState<string>('main-terminal');
  const [sessionCreated, setSessionCreated] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const terminalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    initializeTerminalSession();
    
    // Listen for terminal output events
    const handleTerminalOutput = (event: any, data: any) => {
      if (data.sessionId === sessionId) {
        const newEntry: CommandHistory = {
          command: '', // This is output, not a command
          output: data.data,
          timestamp: new Date(),
        };
        setHistory(prev => [...prev, newEntry]);
      }
    };

    window.engieAPI.terminal.onOutput(handleTerminalOutput);

    return () => {
      // Cleanup: close terminal session when component unmounts
      if (sessionCreated) {
        window.engieAPI.terminal.close(sessionId);
      }
    };
  }, []);

  const initializeTerminalSession = async () => {
    try {
      // Create a terminal session with Claude CLI support
      const success = await window.engieAPI.terminal.create(sessionId, {
        useClaudeCli: true,
        cwd: '/Users/jfuginay/Documents/dev/engie/engie'
      });
      
      if (success) {
        setSessionCreated(true);
        console.log('✅ Terminal session created successfully');
      } else {
        console.error('❌ Failed to create terminal session');
      }
    } catch (error) {
      console.error('❌ Error creating terminal session:', error);
    }
  };

  useEffect(() => {
    // Scroll to bottom when new output is added
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [history]);

  const executeCommand = async (command: string) => {
    if (!command.trim()) return;

    if (!sessionCreated) {
      const newEntry: CommandHistory = {
        command,
        output: 'Terminal session not ready. Please wait...',
        timestamp: new Date(),
      };
      setHistory(prev => [...prev, newEntry]);
      return;
    }

    try {
      // Execute command in the terminal session
      const result = await window.engieAPI.terminal.execute(sessionId, command);
      
      const newEntry: CommandHistory = {
        command,
        output: result 
          ? 'Command sent to terminal session'
          : 'Failed to execute command',
        timestamp: new Date(),
      };

      setHistory(prev => [...prev, newEntry]);
    } catch (error) {
      const newEntry: CommandHistory = {
        command,
        output: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date(),
      };
      setHistory(prev => [...prev, newEntry]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    executeCommand(currentCommand);
    setCurrentCommand('');
    setHistoryIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const commandHistory = history.filter(h => h.command).map(h => h.command);
    
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (commandHistory.length > 0) {
        const newIndex = historyIndex < commandHistory.length - 1 ? historyIndex + 1 : historyIndex;
        setHistoryIndex(newIndex);
        setCurrentCommand(commandHistory[commandHistory.length - 1 - newIndex]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        setCurrentCommand(commandHistory[commandHistory.length - 1 - newIndex]);
      } else if (historyIndex === 0) {
        setHistoryIndex(-1);
        setCurrentCommand('');
      }
    } else if (e.key === 'l' && e.ctrlKey) {
      e.preventDefault();
      setHistory([]);
    }
  };

  return (
    <div className="flex flex-col h-full bg-black font-mono text-sm">
      <div 
        ref={terminalRef}
        className="flex-1 overflow-y-auto p-4 space-y-2"
      >
        {history.length === 0 && (
          <div className="text-gray-500">
            Welcome to ENGIE Terminal. Type 'help' for available commands.
          </div>
        )}
        
        {history.map((entry, index) => (
          <div key={index}>
            <div className="flex items-start gap-2">
              <span className="text-green-500">➜</span>
              <span className="text-neon-cyan">~</span>
              <span className="text-white">{entry.command}</span>
            </div>
            {entry.output && (
              <pre className="mt-1 text-gray-300 whitespace-pre-wrap pl-6">
                {entry.output}
              </pre>
            )}
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="border-t border-dark-700">
        <div className="flex items-center gap-2 p-4">
          <span className="text-green-500">➜</span>
          <span className="text-neon-cyan">~</span>
          <input
            ref={inputRef}
            type="text"
            value={currentCommand}
            onChange={(e) => setCurrentCommand(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent outline-none text-white"
            spellCheck={false}
            autoComplete="off"
          />
        </div>
      </form>
    </div>
  );
};