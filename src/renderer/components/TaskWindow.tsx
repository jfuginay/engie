import React, { useState, useEffect } from 'react';
import type { TaskMasterTask } from '../../shared/types';
import { TaskDisplay } from './TaskDisplay';
import { TaskDetailDialog } from './TaskDetailDialog';

export const TaskWindow: React.FC = () => {
  const [tasks, setTasks] = useState<TaskMasterTask[]>([]);
  const [selectedTask, setSelectedTask] = useState<TaskMasterTask | null>(null);
  const [showTaskDetail, setShowTaskDetail] = useState(false);

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

  const handleTaskClick = (task: TaskMasterTask) => {
    setSelectedTask(task);
    setShowTaskDetail(true);
  };

  const handleTaskSave = async (taskId: string, updates: Partial<TaskMasterTask>) => {
    try {
      await window.engieAPI.taskMaster.updateTask(taskId, updates);
      await loadTasks(); // Refresh the task list
      setShowTaskDetail(false);
    } catch (error) {
      console.error('Failed to update task:', error);
      throw error;
    }
  };

  const handleTaskDelete = async (taskId: string) => {
    try {
      await window.engieAPI.taskMaster.deleteTask(taskId);
      await loadTasks(); // Refresh the task list
      setShowTaskDetail(false);
    } catch (error) {
      console.error('Failed to delete task:', error);
      throw error;
    }
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
        <TaskDisplay tasks={tasks} onTaskClick={handleTaskClick} />
      </div>

      <div className="border-t border-gray-600 p-2 bg-dark-800 text-center text-xs text-gray-500">
        Total: {tasks.length} | Active: {tasks.filter(t => t.status !== 'done').length} | Completed: {tasks.filter(t => t.status === 'done').length}
      </div>

      <TaskDetailDialog
        task={selectedTask}
        isOpen={showTaskDetail}
        onClose={() => setShowTaskDetail(false)}
        onSave={handleTaskSave}
        onDelete={handleTaskDelete}
      />
    </div>
  );
};