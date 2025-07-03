import React, { useState, useEffect } from 'react';

interface ProjectSetupDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (config: ProjectConfig) => void;
  projectName?: string;
  taskCount?: number;
}

interface ProjectConfig {
  projectName: string;
  description: string;
  template: 'react' | 'node' | 'python' | 'vanilla';
  isPrivate: boolean;
  enableClaudeActions: boolean;
  enableMCPConnection: boolean;
  workingDirectory: string;
}

export const ProjectSetupDialog: React.FC<ProjectSetupDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  projectName = '',
  taskCount = 0
}) => {
  const [config, setConfig] = useState<ProjectConfig>({
    projectName: projectName || '',
    description: '',
    template: 'vanilla',
    isPrivate: false,
    enableClaudeActions: true,
    enableMCPConnection: true,
    workingDirectory: ''
  });

  const [step, setStep] = useState(1);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (isOpen && projectName) {
      setConfig(prev => ({
        ...prev,
        projectName,
        description: `Project generated from ${taskCount} ENGIE tasks`
      }));
    }
  }, [isOpen, projectName, taskCount]);

  const handleNext = () => {
    if (step < 3) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleConfirm = async () => {
    setIsCreating(true);
    await onConfirm(config);
    setIsCreating(false);
  };

  const isValid = () => {
    return config.projectName.length > 0 && config.description.length > 0;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-dark-800 border border-gray-600 rounded-lg p-6 w-96 max-w-lg">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-cyan-400">🚀 Create Project Repository</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white"
            disabled={isCreating}
          >
            ✕
          </button>
        </div>

        {/* Progress indicators */}
        <div className="flex mb-6">
          {[1, 2, 3].map((stepNum) => (
            <div key={stepNum} className="flex-1 flex items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                  step >= stepNum
                    ? 'bg-cyan-400 text-dark-900'
                    : 'bg-gray-600 text-gray-300'
                }`}
              >
                {stepNum}
              </div>
              {stepNum < 3 && (
                <div
                  className={`flex-1 h-1 mx-2 ${
                    step > stepNum ? 'bg-cyan-400' : 'bg-gray-600'
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Step 1: Basic Info */}
        {step === 1 && (
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-white">Project Details</h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Project Name
              </label>
              <input
                type="text"
                value={config.projectName}
                onChange={(e) => setConfig(prev => ({ ...prev, projectName: e.target.value }))}
                className="w-full px-3 py-2 bg-dark-700 border border-gray-600 rounded text-white focus:border-cyan-400 focus:outline-none"
                placeholder="my-awesome-project"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Description
              </label>
              <textarea
                value={config.description}
                onChange={(e) => setConfig(prev => ({ ...prev, description: e.target.value }))}
                className="w-full px-3 py-2 bg-dark-700 border border-gray-600 rounded text-white focus:border-cyan-400 focus:outline-none"
                rows={3}
                placeholder="Describe what this project will do..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Project Template
              </label>
              <select
                value={config.template}
                onChange={(e) => setConfig(prev => ({ ...prev, template: e.target.value as any }))}
                className="w-full px-3 py-2 bg-dark-700 border border-gray-600 rounded text-white focus:border-cyan-400 focus:outline-none"
              >
                <option value="vanilla">Vanilla (Basic files)</option>
                <option value="react">React App</option>
                <option value="node">Node.js Server</option>
                <option value="python">Python App</option>
              </select>
            </div>
          </div>
        )}

        {/* Step 2: GitHub Configuration */}
        {step === 2 && (
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-white">GitHub Configuration</h3>
            
            <div className="space-y-3">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={!config.isPrivate}
                  onChange={(e) => setConfig(prev => ({ ...prev, isPrivate: !e.target.checked }))}
                  className="mr-3 w-4 h-4 text-cyan-400 bg-dark-700 border-gray-600 rounded focus:ring-cyan-400"
                />
                <span className="text-gray-300">Public Repository</span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={config.enableClaudeActions}
                  onChange={(e) => setConfig(prev => ({ ...prev, enableClaudeActions: e.target.checked }))}
                  className="mr-3 w-4 h-4 text-cyan-400 bg-dark-700 border-gray-600 rounded focus:ring-cyan-400"
                />
                <div>
                  <span className="text-gray-300">Enable Claude GitHub Actions</span>
                  <div className="text-xs text-gray-500">
                    Automatically respond to @claude mentions in issues and PRs
                  </div>
                </div>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={config.enableMCPConnection}
                  onChange={(e) => setConfig(prev => ({ ...prev, enableMCPConnection: e.target.checked }))}
                  className="mr-3 w-4 h-4 text-cyan-400 bg-dark-700 border-gray-600 rounded focus:ring-cyan-400"
                />
                <div>
                  <span className="text-gray-300">Connect to Claude Code MCP</span>
                  <div className="text-xs text-gray-500">
                    Enable real-time code collaboration with Claude Code
                  </div>
                </div>
              </label>
            </div>

            {config.enableClaudeActions && (
              <div className="bg-orange-900 bg-opacity-20 border border-orange-400 rounded p-3">
                <div className="text-orange-300 text-sm">
                  <strong>⚠️ Authentication Required:</strong>
                  <br />
                  You'll need to add your ANTHROPIC_API_KEY to the GitHub repository secrets after creation.
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 3: Summary */}
        {step === 3 && (
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-white">Project Summary</h3>
            
            <div className="bg-dark-700 border border-gray-600 rounded p-4 space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-400">Name:</span>
                <span className="text-white">{config.projectName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Template:</span>
                <span className="text-white">{config.template}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Visibility:</span>
                <span className="text-white">{config.isPrivate ? 'Private' : 'Public'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Claude Actions:</span>
                <span className={config.enableClaudeActions ? 'text-green-400' : 'text-gray-400'}>
                  {config.enableClaudeActions ? 'Enabled' : 'Disabled'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">MCP Connection:</span>
                <span className={config.enableMCPConnection ? 'text-green-400' : 'text-gray-400'}>
                  {config.enableMCPConnection ? 'Enabled' : 'Disabled'}
                </span>
              </div>
            </div>

            <div className="text-sm text-gray-400">
              📋 {taskCount} tasks will be converted to GitHub issues with @claude mentions
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between mt-6">
          <button
            onClick={step === 1 ? onClose : handleBack}
            className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded transition-colors"
            disabled={isCreating}
          >
            {step === 1 ? 'Cancel' : 'Back'}
          </button>

          <button
            onClick={step === 3 ? handleConfirm : handleNext}
            disabled={!isValid() || isCreating}
            className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isCreating ? (
              <>
                <span className="animate-spin">⚙️</span>
                Creating...
              </>
            ) : step === 3 ? (
              'Create Project'
            ) : (
              'Next'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};