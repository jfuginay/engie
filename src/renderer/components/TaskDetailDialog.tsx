import React, { useState, useEffect } from 'react';
import type { TaskMasterTask } from '../../shared/types';

interface TaskDetailDialogProps {
  task: TaskMasterTask | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (taskId: string, updates: Partial<TaskMasterTask>) => Promise<void>;
  onDelete: (taskId: string) => Promise<void>;
}

export const TaskDetailDialog: React.FC<TaskDetailDialogProps> = ({
  task,
  isOpen,
  onClose,
  onSave,
  onDelete
}) => {
  const [editedTask, setEditedTask] = useState<Partial<TaskMasterTask>>({});
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (task) {
      setEditedTask({
        title: task.title,
        description: task.description,
        priority: task.priority,
        status: task.status,
        tags: [...(task.tags || [])],
        dueDate: task.dueDate,
        estimatedDuration: task.estimatedDuration,
        energyLevel: task.energyLevel,
        dependencies: [...(task.dependencies || [])],
        progress: task.progress,
        notes: task.notes
      });
      setIsEditing(false);
      setShowDeleteConfirm(false);
    }
  }, [task]);

  const handleSave = async () => {
    if (!task || !editedTask.title?.trim()) return;

    setIsSaving(true);
    try {
      await onSave(task.id, editedTask);
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to save task:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!task) return;

    setIsSaving(true);
    try {
      await onDelete(task.id);
      onClose();
    } catch (error) {
      console.error('Failed to delete task:', error);
    } finally {
      setIsSaving(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleCancel = () => {
    setEditedTask({
      title: task?.title,
      description: task?.description,
      priority: task?.priority,
      status: task?.status,
      tags: [...(task?.tags || [])],
      dueDate: task?.dueDate,
      estimatedDuration: task?.estimatedDuration,
      energyLevel: task?.energyLevel,
      dependencies: [...(task?.dependencies || [])],
      progress: task?.progress,
      notes: task?.notes
    });
    setIsEditing(false);
  };

  const addTag = (tag: string) => {
    if (tag.trim() && !editedTask.tags?.includes(tag.trim())) {
      setEditedTask(prev => ({
        ...prev,
        tags: [...(prev.tags || []), tag.trim()]
      }));
    }
  };

  const removeTag = (tagToRemove: string) => {
    setEditedTask(prev => ({
      ...prev,
      tags: prev.tags?.filter(tag => tag !== tagToRemove) || []
    }));
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-400 bg-red-900';
      case 'medium': return 'text-yellow-400 bg-yellow-900';
      case 'low': return 'text-green-400 bg-green-900';
      default: return 'text-gray-400 bg-gray-900';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-400 bg-green-900';
      case 'in-progress': return 'text-blue-400 bg-blue-900';
      case 'blocked': return 'text-red-400 bg-red-900';
      case 'pending': return 'text-gray-400 bg-gray-900';
      default: return 'text-gray-400 bg-gray-900';
    }
  };

  if (!isOpen || !task) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-dark-800 border border-gray-600 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-600">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-semibold text-cyan-400">
              {isEditing ? '✏️ Edit Task' : '📋 Task Details'}
            </h2>
            <div className={`px-2 py-1 rounded text-xs font-medium ${getPriorityColor(task.priority)}`}>
              {task.priority?.toUpperCase()}
            </div>
            <div className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(task.status)}`}>
              {task.status?.toUpperCase()}
            </div>
          </div>
          <div className="flex gap-2">
            {!isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-sm transition-colors"
                disabled={isSaving}
              >
                Edit
              </button>
            )}
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white text-xl"
              disabled={isSaving}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column */}
            <div className="space-y-4">
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Title</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={editedTask.title || ''}
                    onChange={(e) => setEditedTask(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full px-3 py-2 bg-dark-700 border border-gray-600 rounded text-white focus:border-cyan-400 focus:outline-none"
                    placeholder="Task title..."
                  />
                ) : (
                  <div className="text-white bg-dark-700 px-3 py-2 rounded border border-gray-600">
                    {task.title}
                  </div>
                )}
              </div>

              {/* Priority & Status */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Priority</label>
                  {isEditing ? (
                    <select
                      value={editedTask.priority || 'medium'}
                      onChange={(e) => setEditedTask(prev => ({ ...prev, priority: e.target.value as any }))}
                      className="w-full px-3 py-2 bg-dark-700 border border-gray-600 rounded text-white focus:border-cyan-400 focus:outline-none"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  ) : (
                    <div className={`px-3 py-2 rounded text-center ${getPriorityColor(task.priority)}`}>
                      {task.priority?.toUpperCase()}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Status</label>
                  {isEditing ? (
                    <select
                      value={editedTask.status || 'pending'}
                      onChange={(e) => setEditedTask(prev => ({ ...prev, status: e.target.value as any }))}
                      className="w-full px-3 py-2 bg-dark-700 border border-gray-600 rounded text-white focus:border-cyan-400 focus:outline-none"
                    >
                      <option value="pending">Pending</option>
                      <option value="in-progress">In Progress</option>
                      <option value="blocked">Blocked</option>
                      <option value="completed">Completed</option>
                    </select>
                  ) : (
                    <div className={`px-3 py-2 rounded text-center ${getStatusColor(task.status)}`}>
                      {task.status?.toUpperCase()}
                    </div>
                  )}
                </div>
              </div>

              {/* Progress */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Progress ({editedTask.progress || task.progress || 0}%)
                </label>
                {isEditing ? (
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={editedTask.progress || task.progress || 0}
                    onChange={(e) => setEditedTask(prev => ({ ...prev, progress: parseInt(e.target.value) }))}
                    className="w-full accent-cyan-400"
                  />
                ) : (
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-cyan-400 h-2 rounded-full transition-all"
                      style={{ width: `${task.progress || 0}%` }}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-4">
              {/* Due Date */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Due Date</label>
                {isEditing ? (
                  <input
                    type="datetime-local"
                    value={editedTask.dueDate ? new Date(editedTask.dueDate).toISOString().slice(0, 16) : ''}
                    onChange={(e) => setEditedTask(prev => ({ 
                      ...prev, 
                      dueDate: e.target.value ? new Date(e.target.value).toISOString() : undefined 
                    }))}
                    className="w-full px-3 py-2 bg-dark-700 border border-gray-600 rounded text-white focus:border-cyan-400 focus:outline-none"
                  />
                ) : (
                  <div className="text-white bg-dark-700 px-3 py-2 rounded border border-gray-600">
                    {task.dueDate ? new Date(task.dueDate).toLocaleString() : 'No due date'}
                  </div>
                )}
              </div>

              {/* Duration & Energy */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Duration</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editedTask.estimatedDuration || ''}
                      onChange={(e) => setEditedTask(prev => ({ ...prev, estimatedDuration: e.target.value }))}
                      className="w-full px-3 py-2 bg-dark-700 border border-gray-600 rounded text-white focus:border-cyan-400 focus:outline-none"
                      placeholder="e.g., 2 hours"
                    />
                  ) : (
                    <div className="text-white bg-dark-700 px-3 py-2 rounded border border-gray-600">
                      {task.estimatedDuration || 'Not specified'}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Energy Level</label>
                  {isEditing ? (
                    <select
                      value={editedTask.energyLevel || 'medium'}
                      onChange={(e) => setEditedTask(prev => ({ ...prev, energyLevel: e.target.value as any }))}
                      className="w-full px-3 py-2 bg-dark-700 border border-gray-600 rounded text-white focus:border-cyan-400 focus:outline-none"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  ) : (
                    <div className="text-white bg-dark-700 px-3 py-2 rounded border border-gray-600">
                      {task.energyLevel?.toUpperCase() || 'MEDIUM'}
                    </div>
                  )}
                </div>
              </div>

              {/* Task ID & Created */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Task ID</label>
                  <div className="text-gray-400 bg-dark-700 px-3 py-2 rounded border border-gray-600 font-mono">
                    {task.id}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Created</label>
                  <div className="text-gray-400 bg-dark-700 px-3 py-2 rounded border border-gray-600">
                    {task.createdAt ? new Date(task.createdAt).toLocaleDateString() : 'Unknown'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
            {isEditing ? (
              <textarea
                value={editedTask.description || ''}
                onChange={(e) => setEditedTask(prev => ({ ...prev, description: e.target.value }))}
                className="w-full px-3 py-2 bg-dark-700 border border-gray-600 rounded text-white focus:border-cyan-400 focus:outline-none"
                rows={4}
                placeholder="Task description..."
              />
            ) : (
              <div className="text-white bg-dark-700 px-3 py-2 rounded border border-gray-600 min-h-[100px] whitespace-pre-wrap">
                {task.description || 'No description provided'}
              </div>
            )}
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Tags</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {(editedTask.tags || task.tags || []).map((tag, index) => (
                <span
                  key={index}
                  className="px-2 py-1 bg-cyan-900 text-cyan-300 rounded text-sm flex items-center gap-1"
                >
                  {tag}
                  {isEditing && (
                    <button
                      onClick={() => removeTag(tag)}
                      className="text-cyan-200 hover:text-white ml-1"
                    >
                      ✕
                    </button>
                  )}
                </span>
              ))}
            </div>
            {isEditing && (
              <input
                type="text"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    addTag(e.currentTarget.value);
                    e.currentTarget.value = '';
                  }
                }}
                className="w-full px-3 py-2 bg-dark-700 border border-gray-600 rounded text-white focus:border-cyan-400 focus:outline-none"
                placeholder="Type a tag and press Enter..."
              />
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Notes</label>
            {isEditing ? (
              <textarea
                value={editedTask.notes || ''}
                onChange={(e) => setEditedTask(prev => ({ ...prev, notes: e.target.value }))}
                className="w-full px-3 py-2 bg-dark-700 border border-gray-600 rounded text-white focus:border-cyan-400 focus:outline-none"
                rows={3}
                placeholder="Additional notes..."
              />
            ) : (
              <div className="text-white bg-dark-700 px-3 py-2 rounded border border-gray-600 min-h-[80px] whitespace-pre-wrap">
                {task.notes || 'No notes'}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center p-6 border-t border-gray-600">
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded transition-colors disabled:bg-gray-600"
            disabled={isSaving}
          >
            🗑️ Delete Task
          </button>

          <div className="flex gap-3">
            {isEditing ? (
              <>
                <button
                  onClick={handleCancel}
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded transition-colors"
                  disabled={isSaving}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSaving || !editedTask.title?.trim()}
                  className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isSaving ? (
                    <>
                      <span className="animate-spin">⚙️</span>
                      Saving...
                    </>
                  ) : (
                    <>
                      💾 Save Changes
                    </>
                  )}
                </button>
              </>
            ) : (
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded transition-colors"
              >
                Close
              </button>
            )}
          </div>
        </div>

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="absolute inset-0 bg-black bg-opacity-75 flex items-center justify-center">
            <div className="bg-dark-800 border border-red-600 rounded-lg p-6 max-w-md">
              <h3 className="text-xl font-semibold text-red-400 mb-4">🗑️ Delete Task?</h3>
              <p className="text-gray-300 mb-6">
                Are you sure you want to delete "{task.title}"? This action cannot be undone.
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded transition-colors"
                  disabled={isSaving}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={isSaving}
                  className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded transition-colors disabled:bg-gray-600 flex items-center gap-2"
                >
                  {isSaving ? (
                    <>
                      <span className="animate-spin">⚙️</span>
                      Deleting...
                    </>
                  ) : (
                    'Delete Task'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};