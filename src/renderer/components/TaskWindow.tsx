import React, { useState, useEffect } from 'react';
import type { TaskMasterTask } from '../../shared/types';
import { TaskDisplay } from './TaskDisplay';

export const TaskWindow: React.FC = () => {
  const [tasks, setTasks] = useState<TaskMasterTask[]>([]);

  useEffect(() => {
    // Load initial tasks
    loadTasks();

    // Set up task update listener
    window.engieAPI.on('tasks-updated', loadTasks);

    // Refresh tasks every 5 seconds
    const refreshInterval = setInterval(loadTasks, 5000);

    return () => {
      window.engieAPI.removeAllListeners('tasks-updated');
      clearInterval(refreshInterval);
    };
  }, []);

  const loadTasks = async () => {
    try {
      const taskList = await window.engieAPI.taskMaster.getTasks();
      setTasks(taskList);
    } catch (error) {
      console.error('Failed to load tasks:', error);
    }
  };

  const handleReturnToMain = () => {
    window.engieAPI.taskWindow.close();
  };

  return (
    <div className="h-screen bg-dark-900 flex flex-col font-mono text-sm">
      <div className="border-b border-gray-600 p-4 bg-dark-800 flex justify-between items-center">
        <div className="text-cyan-400 font-semibold flex items-center gap-2">
          <span>📋</span>
          <span>ACTIVE TASKS</span>
        </div>
        <button
          onClick={handleReturnToMain}
          className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded text-xs transition-colors flex items-center gap-1"
          title="Return to main window"
        >
          <span>↩</span>
          <span>Return to ENGIE</span>
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4">
        <TaskDisplay tasks={tasks} />
      </div>

      <div className="border-t border-gray-600 p-2 bg-dark-800 text-center text-xs text-gray-500">
        Total: {tasks.length} | Active: {tasks.filter(t => t.status !== 'done').length} | Completed: {tasks.filter(t => t.status === 'done').length}
      </div>
    </div>
  );
};