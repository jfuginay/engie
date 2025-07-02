import React, { useState, useRef, useEffect } from 'react';
import { Send, Loader } from 'lucide-react';
import { format } from 'date-fns';
import type { Message } from '../../shared/types';

export const ChatInterface: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      type: 'assistant',
      text: 'Hello! I\'m ENGIE, your AI-powered development assistant. How can I help you today?',
      timestamp: new Date(),
    }
  ]);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Start a conversation when component mounts
    const initializeConversation = async () => {
      try {
        const workingDir = await window.engieAPI.terminal.execute('pwd')
          .then(r => r.stdout?.trim())
          .catch(() => undefined);
        
        await window.engieAPI.memory.startConversation(workingDir);
      } catch (error) {
        console.error('Failed to initialize conversation:', error);
      }
    };

    initializeConversation();

    // Cleanup on unmount
    return () => {
      window.engieAPI.memory.endConversation().catch(console.error);
    };
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSend = async () => {
    if (!input.trim() || isProcessing) return;

    const userMessage: Message = {
      id: Date.now(),
      type: 'user',
      text: input.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsProcessing(true);

    // Add message to memory system
    await window.engieAPI.memory.addMessage(userMessage);

    try {
      // Get current working directory and project context
      const workingDir = await window.engieAPI.terminal.execute('pwd').then(r => r.stdout?.trim()).catch(() => process.cwd());
      
      // Get relevant context from memory
      const memoryContext = await window.engieAPI.memory.getRelevantContext(userMessage.text, workingDir);
      
      const context = {
        workingDirectory: workingDir,
        timestamp: new Date().toISOString(),
        memoryContext,
      };

      // Use the AI orchestrator to process the message
      const response = await window.engieAPI.ai.processMessage(userMessage.text, context);
      
      const assistantMessage: Message = {
        id: Date.now() + 1,
        type: 'assistant',
        text: response.result,
        timestamp: new Date(),
        thought: response.thought,
        toolsUsed: response.toolsUsed,
      };
      
      setMessages(prev => [...prev, assistantMessage]);
      
      // Add assistant message to memory
      await window.engieAPI.memory.addMessage(assistantMessage);
    } catch (error) {
      console.error('Failed to process message:', error);
      
      // Fallback response
      const errorMessage: Message = {
        id: Date.now() + 1,
        type: 'assistant',
        text: "I'm experiencing some technical difficulties. Please make sure your API key is configured correctly in settings.",
        timestamp: new Date(),
        thought: 'Error occurred while processing request',
        toolsUsed: [],
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full bg-dark-900">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}
        
        {isProcessing && (
          <div className="flex items-center gap-2 text-gray-400">
            <Loader className="animate-spin" size={16} />
            <span>ENGIE is thinking...</span>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      <div className="border-t border-dark-700 p-4">
        <div className="flex gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask ENGIE anything..."
            className="input-field flex-1 resize-none"
            rows={3}
            disabled={isProcessing}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isProcessing}
            className="btn-primary self-end disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send size={20} />
          </button>
        </div>
        
        <div className="mt-2 text-xs text-gray-500">
          Press Enter to send, Shift+Enter for new line
        </div>
      </div>
    </div>
  );
};

const MessageBubble: React.FC<{ message: Message }> = ({ message }) => {
  const isUser = message.type === 'user';
  
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[80%] ${isUser ? 'text-right' : 'text-left'}`}>
        <div className="flex items-baseline gap-2 mb-1">
          <span className="text-xs text-gray-500">
            {isUser ? 'You' : 'ENGIE'}
          </span>
          <span className="text-xs text-gray-600">
            {format(message.timestamp, 'HH:mm')}
          </span>
        </div>
        
        <div className={`rounded-lg p-3 ${
          isUser 
            ? 'bg-neon-cyan text-black' 
            : 'bg-dark-800 text-white border border-dark-700'
        }`}>
          <p className="whitespace-pre-wrap">{message.text}</p>
        </div>
        
        {message.thought && (
          <div className="mt-2 text-xs text-gray-500 italic">
            💭 {message.thought}
          </div>
        )}
        
        {message.toolsUsed && message.toolsUsed.length > 0 && (
          <div className="mt-1 text-xs text-gray-500">
            🔧 Used: {message.toolsUsed.join(', ')}
          </div>
        )}
      </div>
    </div>
  );
};