import React, { useState } from 'react';
import { Save, X, Edit2, ChevronDown, ChevronRight } from 'lucide-react';
import type { TaskMasterTask } from '../../shared/types';

interface TaskViewerProps {
  task: TaskMasterTask;
  onUpdate: () => void;
}

export const TaskViewer: React.FC<TaskViewerProps> = ({ task, onUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedTask, setEditedTask] = useState(task);
  const [expandedSubtasks, setExpandedSubtasks] = useState<Set<string>>(new Set());

  const handleSave = async () => {
    try {
      await window.engieAPI.taskMaster.updateTaskStatus(task.id, editedTask.status);
      setIsEditing(false);
      onUpdate();
    } catch (error) {
      console.error('Failed to update task:', error);
    }
  };

  const toggleSubtask = (subtaskId: string) => {
    setExpandedSubtasks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(subtaskId)) {
        newSet.delete(subtaskId);
      } else {
        newSet.add(subtaskId);
      }
      return newSet;
    });
  };

  const getStatusColor = (status: TaskMasterTask['status']) => {
    const colors = {
      'pending': 'bg-gray-500',
      'in-progress': 'bg-yellow-500',
      'done': 'bg-green-500',
      'blocked': 'bg-red-500',
      'deferred': 'bg-orange-500',
      'cancelled': 'bg-gray-600',
      'review': 'bg-purple-500',
    };
    return colors[status] || 'bg-gray-500';
  };

  return (
    <div className="h-full flex flex-col bg-dark-900 p-6">
      <div className="flex items-start justify-between mb-6">
        <div className="flex-1">
          <h2 className="text-2xl font-bold mb-2">{task.title}</h2>
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-gray-400">Status:</span>
              {isEditing ? (
                <select
                  value={editedTask.status}
                  onChange={(e) => setEditedTask({ ...editedTask, status: e.target.value as TaskMasterTask['status'] })}
                  className="input-field py-1 px-2"
                >
                  <option value="pending">Pending</option>
                  <option value="in-progress">In Progress</option>
                  <option value="done">Done</option>
                  <option value="blocked">Blocked</option>
                  <option value="deferred">Deferred</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="review">Review</option>
                </select>
              ) : (
                <span className={`px-2 py-1 rounded text-xs text-white ${getStatusColor(task.status)}`}>
                  {task.status}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-400">Priority:</span>
              <span className={`capitalize ${
                task.priority === 'high' ? 'text-red-500' :
                task.priority === 'medium' ? 'text-yellow-500' :
                'text-gray-500'
              }`}>
                {task.priority}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isEditing ? (
            <>
              <button
                onClick={handleSave}
                className="btn-primary flex items-center gap-2"
              >
                <Save size={16} />
                Save
              </button>
              <button
                onClick={() => {
                  setIsEditing(false);
                  setEditedTask(task);
                }}
                className="btn-secondary flex items-center gap-2"
              >
                <X size={16} />
                Cancel
              </button>
            </>
          ) : (
            <button
              onClick={() => setIsEditing(true)}
              className="btn-secondary flex items-center gap-2"
            >
              <Edit2 size={16} />
              Edit
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-6">
        <section>
          <h3 className="text-lg font-semibold mb-2 text-neon-cyan">Description</h3>
          <p className="text-gray-300">{task.description}</p>
        </section>

        {task.details && (
          <section>
            <h3 className="text-lg font-semibold mb-2 text-neon-cyan">Details</h3>
            <pre className="text-sm text-gray-300 whitespace-pre-wrap bg-dark-800 p-4 rounded">
              {task.details}
            </pre>
          </section>
        )}

        {task.testStrategy && (
          <section>
            <h3 className="text-lg font-semibold mb-2 text-neon-cyan">Test Strategy</h3>
            <p className="text-gray-300">{task.testStrategy}</p>
          </section>
        )}

        {task.subtasks && task.subtasks.length > 0 && (
          <section>
            <h3 className="text-lg font-semibold mb-2 text-neon-cyan">Subtasks</h3>
            <div className="space-y-2">
              {task.subtasks.map((subtask) => (
                <div key={subtask.id} className="bg-dark-800 rounded p-3">
                  <div 
                    className="flex items-center justify-between cursor-pointer"
                    onClick={() => toggleSubtask(subtask.id)}
                  >
                    <div className="flex items-center gap-2">
                      {expandedSubtasks.has(subtask.id) ? 
                        <ChevronDown size={16} /> : 
                        <ChevronRight size={16} />
                      }
                      <span className="font-medium">{subtask.title}</span>
                    </div>
                    <span className={`px-2 py-1 rounded text-xs text-white ${getStatusColor(subtask.status)}`}>
                      {subtask.status}
                    </span>
                  </div>
                  
                  {expandedSubtasks.has(subtask.id) && (
                    <div className="mt-2 pl-6 text-sm text-gray-400">
                      {subtask.description}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {task.dependencies && task.dependencies.length > 0 && (
          <section>
            <h3 className="text-lg font-semibold mb-2 text-neon-cyan">Dependencies</h3>
            <ul className="list-disc list-inside text-gray-300">
              {task.dependencies.map((dep, idx) => (
                <li key={idx}>{dep}</li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
};