import React from 'react';
import type { TaskMasterTask } from '../../shared/types';

interface TaskDisplayProps {
  tasks: TaskMasterTask[];
  onTaskClick?: (task: TaskMasterTask) => void;
}

export const TaskDisplay: React.FC<TaskDisplayProps> = ({ tasks, onTaskClick }) => {
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-400';
      case 'medium': return 'text-yellow-400';
      case 'low': return 'text-green-400';
      default: return 'text-gray-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'done': return '✅';
      case 'in-progress': return '⏳';
      default: return '📌';
    }
  };

  if (tasks.length === 0) {
    return (
      <div className="text-gray-500 text-center py-4">
        No tasks yet. Create your first task!
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {tasks.map((task, index) => (
        <div 
          key={task.id} 
          onClick={() => onTaskClick?.(task)}
          className={`flex items-start gap-2 cursor-pointer hover:bg-dark-700 hover:bg-opacity-50 rounded p-2 transition-colors ${
            task.status === 'done' ? 'opacity-50' : ''
          } ${onTaskClick ? 'hover:scale-[1.02]' : ''}`}
          title="Click to view details"
        >
          <span className="text-gray-500 min-w-[2ch]">[{index + 1}]</span>
          <span>{getStatusIcon(task.status)}</span>
          <div className="flex-1">
            <span className={task.status === 'done' ? 'line-through' : ''}>
              {(() => {
                // Handle potential JSON strings in title (for backwards compatibility)
                try {
                  if (task.title.startsWith('{') && task.title.includes('"title"')) {
                    const parsed = JSON.parse(task.title);
                    return parsed.title || task.title;
                  }
                  return task.title;
                } catch {
                  return task.title;
                }
              })()}
            </span>
            {task.priority && (
              <span className={`ml-2 text-xs ${getPriorityColor(task.priority)}`}>
                {task.priority.toUpperCase()}
              </span>
            )}
            {task.progress !== undefined && task.progress > 0 && (
              <div className="mt-1">
                <div className="w-full bg-gray-700 rounded-full h-1">
                  <div
                    className="bg-cyan-400 h-1 rounded-full transition-all"
                    style={{ width: `${task.progress}%` }}
                  />
                </div>
                <span className="text-xs text-gray-400">{task.progress}%</span>
              </div>
            )}
          </div>
          {onTaskClick && (
            <span className="text-gray-500 text-xs opacity-0 group-hover:opacity-100 transition-opacity">
              👁️
            </span>
          )}
        </div>
      ))}
    </div>
  );
};