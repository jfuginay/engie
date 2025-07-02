import React, { useState, useEffect } from 'react';
import { RefreshCw, Zap, TrendingUp, CheckCircle, Circle, Clock } from 'lucide-react';
import type { TaskMasterTask, IntelligenceInsights } from '../../shared/types';

interface TaskSidebarProps {
  tasks: TaskMasterTask[];
  onTaskSelect: (task: TaskMasterTask) => void;
  onRefresh: () => void;
}

export const TaskSidebar: React.FC<TaskSidebarProps> = ({ tasks, onTaskSelect, onRefresh }) => {
  const [insights, setInsights] = useState<IntelligenceInsights>({
    totalPatterns: 0,
    avgEffectiveness: 0,
    learningRate: 0,
    recentActivity: { commits: 0, tasks: 0 },
    recommendations: [],
  });

  useEffect(() => {
    // Simulate intelligence insights
    setInsights({
      totalPatterns: 42,
      avgEffectiveness: 0.87,
      learningRate: 0.92,
      recentActivity: { 
        commits: 7, 
        tasks: tasks.filter(t => t.status === 'done').length 
      },
      recommendations: [
        'Focus on high-priority tasks first',
        'Consider breaking down large tasks',
      ],
    });
  }, [tasks]);

  const getStatusIcon = (status: TaskMasterTask['status']) => {
    switch (status) {
      case 'done':
        return <CheckCircle size={16} className="text-green-500" />;
      case 'in-progress':
        return <Clock size={16} className="text-yellow-500" />;
      default:
        return <Circle size={16} className="text-gray-500" />;
    }
  };

  const getPriorityColor = (priority: TaskMasterTask['priority']) => {
    switch (priority) {
      case 'high':
        return 'text-red-500';
      case 'medium':
        return 'text-yellow-500';
      case 'low':
        return 'text-gray-500';
    }
  };

  const priorityTasks = tasks
    .filter(t => t.status !== 'done' && t.status !== 'cancelled')
    .sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    })
    .slice(0, 5);

  return (
    <div className="w-80 bg-dark-800 border-l border-dark-700 flex flex-col">
      {/* Intelligence Section */}
      <div className="p-4 border-b border-dark-700">
        <h3 className="text-sm font-semibold text-neon-cyan mb-3 flex items-center gap-2">
          <Zap size={16} />
          AI Intelligence
        </h3>
        
        <div className="space-y-2 text-xs">
          <div className="flex justify-between">
            <span className="text-gray-400">Learning Patterns</span>
            <span className="text-white">{insights.totalPatterns}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Effectiveness</span>
            <span className="text-green-500">{Math.round(insights.avgEffectiveness * 100)}%</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Learning Rate</span>
            <div className="flex items-center gap-1">
              <span className="text-white">{Math.round(insights.learningRate * 100)}%</span>
              <TrendingUp size={12} className="text-green-500" />
            </div>
          </div>
        </div>

        <div className="mt-3 pt-3 border-t border-dark-700">
          <div className="text-xs text-gray-400">Recent Activity</div>
          <div className="mt-1 flex gap-4 text-xs">
            <span>Commits: {insights.recentActivity.commits}</span>
            <span>Tasks: {insights.recentActivity.tasks}</span>
          </div>
        </div>
      </div>

      {/* Priority Tasks */}
      <div className="flex-1 flex flex-col p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold">Priority Tasks</h3>
          <button
            onClick={onRefresh}
            className="p-1 hover:bg-dark-700 rounded transition-colors"
          >
            <RefreshCw size={14} className="text-gray-400" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-2">
          {priorityTasks.length === 0 ? (
            <div className="text-center text-gray-500 text-sm py-8">
              No pending tasks
            </div>
          ) : (
            priorityTasks.map((task) => (
              <div
                key={task.id}
                onClick={() => onTaskSelect(task)}
                className="p-3 bg-dark-700 rounded cursor-pointer hover:bg-dark-600 transition-colors"
              >
                <div className="flex items-start gap-2">
                  {getStatusIcon(task.status)}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{task.title}</div>
                    <div className="text-xs text-gray-400 mt-1 flex items-center gap-2">
                      <span className={getPriorityColor(task.priority)}>
                        {task.priority}
                      </span>
                      <span>•</span>
                      <span>{task.status}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Stats */}
        <div className="mt-4 pt-4 border-t border-dark-700">
          <div className="grid grid-cols-3 gap-2 text-xs text-center">
            <div>
              <div className="text-2xl font-bold text-white">
                {tasks.filter(t => t.status === 'done').length}
              </div>
              <div className="text-gray-500">Done</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-yellow-500">
                {tasks.filter(t => t.status === 'in-progress').length}
              </div>
              <div className="text-gray-500">Active</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-400">
                {tasks.filter(t => t.status === 'pending').length}
              </div>
              <div className="text-gray-500">Pending</div>
            </div>
          </div>
        </div>

        {/* Recommendations */}
        {insights.recommendations.length > 0 && (
          <div className="mt-4 p-3 bg-dark-700 rounded text-xs">
            <div className="text-neon-cyan font-semibold mb-2">AI Recommendations</div>
            <ul className="space-y-1">
              {insights.recommendations.map((rec, idx) => (
                <li key={idx} className="text-gray-400">• {rec}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};