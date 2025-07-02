import React, { useState } from 'react';
import { Key, CheckCircle, AlertCircle } from 'lucide-react';

interface FirstRunSetupProps {
  onComplete: () => void;
}

export const FirstRunSetup: React.FC<FirstRunSetupProps> = ({ onComplete }) => {
  const [apiKeys, setApiKeys] = useState({
    anthropic: '',
    openai: '',
    perplexity: '',
    google: '',
  });
  const [validationStatus, setValidationStatus] = useState<Record<string, boolean | null>>({});
  const [isProcessing, setIsProcessing] = useState(false);

  const validateKey = async (provider: string, key: string) => {
    if (!key) {
      setValidationStatus(prev => ({ ...prev, [provider]: null }));
      return;
    }

    // Simple validation based on key format
    let isValid = false;
    switch (provider) {
      case 'anthropic':
        isValid = key.startsWith('sk-ant-');
        break;
      case 'openai':
        isValid = key.startsWith('sk-');
        break;
      case 'perplexity':
        isValid = key.length > 20;
        break;
      case 'google':
        isValid = key.length === 39;
        break;
    }

    setValidationStatus(prev => ({ ...prev, [provider]: isValid }));
  };

  const handleKeyChange = (provider: string, value: string) => {
    setApiKeys(prev => ({ ...prev, [provider]: value }));
    validateKey(provider, value);
  };

  const handleSave = async () => {
    setIsProcessing(true);

    try {
      // Save all provided API keys
      for (const [provider, key] of Object.entries(apiKeys)) {
        if (key) {
          await window.engieAPI.apiKeys.store(provider, key);
        }
      }

      // Check and install Claude CLI
      const isClaudeInstalled = await window.engieAPI.claudeCLI.checkInstallation();
      if (!isClaudeInstalled && apiKeys.anthropic) {
        await window.engieAPI.claudeCLI.install();
      }

      onComplete();
    } catch (error) {
      console.error('Setup failed:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const canProceed = apiKeys.anthropic && validationStatus.anthropic === true;

  return (
    <div className="h-screen flex items-center justify-center bg-dark-900">
      <div className="max-w-2xl w-full p-8">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <svg width="64" height="64" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="16" cy="16" r="14" stroke="#00ffff" strokeWidth="2" className="animate-pulse-neon"/>
              <path d="M16 8V16L20 20" stroke="#00ffff" strokeWidth="2" strokeLinecap="round"/>
              <circle cx="16" cy="16" r="3" fill="#00ffff"/>
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-neon-cyan animate-glow mb-2">Welcome to ENGIE</h1>
          <p className="text-gray-400">Let's set up your AI integrations</p>
        </div>

        <div className="space-y-6">
          <div className="bg-dark-800 rounded-lg p-6 space-y-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Key className="text-neon-cyan" />
              API Keys
            </h2>
            
            <p className="text-sm text-gray-400">
              Your API keys are stored securely in your system's keychain. 
              At minimum, you'll need an Anthropic API key to use ENGIE.
            </p>

            <div className="space-y-4">
              <ApiKeyInput
                label="Anthropic API Key"
                provider="anthropic"
                placeholder="sk-ant-..."
                value={apiKeys.anthropic}
                onChange={(value) => handleKeyChange('anthropic', value)}
                isValid={validationStatus.anthropic}
                required
              />

              <ApiKeyInput
                label="OpenAI API Key"
                provider="openai"
                placeholder="sk-..."
                value={apiKeys.openai}
                onChange={(value) => handleKeyChange('openai', value)}
                isValid={validationStatus.openai}
              />

              <ApiKeyInput
                label="Perplexity API Key"
                provider="perplexity"
                placeholder="pplx-..."
                value={apiKeys.perplexity}
                onChange={(value) => handleKeyChange('perplexity', value)}
                isValid={validationStatus.perplexity}
              />

              <ApiKeyInput
                label="Google API Key"
                provider="google"
                placeholder="AIza..."
                value={apiKeys.google}
                onChange={(value) => handleKeyChange('google', value)}
                isValid={validationStatus.google}
              />
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={!canProceed || isProcessing}
            className="w-full btn-primary py-3 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing ? 'Setting up...' : 'Complete Setup'}
          </button>
        </div>
      </div>
    </div>
  );
};

interface ApiKeyInputProps {
  label: string;
  provider: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  isValid: boolean | null;
  required?: boolean;
}

const ApiKeyInput: React.FC<ApiKeyInputProps> = ({
  label,
  placeholder,
  value,
  onChange,
  isValid,
  required,
}) => {
  return (
    <div>
      <label className="block text-sm font-medium mb-2">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <div className="relative">
        <input
          type="password"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="input-field pr-10"
        />
        {isValid !== null && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            {isValid ? (
              <CheckCircle size={20} className="text-green-500" />
            ) : (
              <AlertCircle size={20} className="text-red-500" />
            )}
          </div>
        )}
      </div>
    </div>
  );
};