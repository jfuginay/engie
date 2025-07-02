import React, { useState, useEffect } from 'react';
import { Key, Save, X, Eye, EyeOff } from 'lucide-react';

interface ApiKeySettingsProps {
  onClose: () => void;
}

export const ApiKeySettings: React.FC<ApiKeySettingsProps> = ({ onClose }) => {
  const [apiKeys, setApiKeys] = useState({
    anthropic: '',
    openai: '',
    perplexity: '',
    google: '',
  });
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [hasChanges, setHasChanges] = useState<Record<string, boolean>>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadExistingKeys();
  }, []);

  const loadExistingKeys = async () => {
    const providers = ['anthropic', 'openai', 'perplexity', 'google'];
    const keys: Record<string, string> = {};
    
    for (const provider of providers) {
      const key = await window.engieAPI.apiKeys.retrieve(provider);
      if (key) {
        keys[provider] = '••••••••••••••••';
      }
    }
    
    setApiKeys(keys as any);
  };

  const handleKeyChange = (provider: string, value: string) => {
    setApiKeys(prev => ({ ...prev, [provider]: value }));
    setHasChanges(prev => ({ ...prev, [provider]: true }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    
    try {
      for (const [provider, hasChanged] of Object.entries(hasChanges)) {
        if (hasChanged && apiKeys[provider as keyof typeof apiKeys]) {
          await window.engieAPI.apiKeys.store(provider, apiKeys[provider as keyof typeof apiKeys]);
        }
      }
      
      onClose();
    } catch (error) {
      console.error('Failed to save API keys:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const toggleShowKey = (provider: string) => {
    setShowKeys(prev => ({ ...prev, [provider]: !prev[provider] }));
  };

  return (
    <div className="h-screen flex items-center justify-center bg-dark-900">
      <div className="max-w-2xl w-full bg-dark-800 rounded-lg shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b border-dark-700">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Key className="text-neon-cyan" />
            API Key Settings
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-dark-700 rounded transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <p className="text-sm text-gray-400">
            Your API keys are stored securely in your system's keychain. 
            Only enter a key if you want to update it.
          </p>

          <div className="space-y-4">
            <ApiKeyField
              label="Anthropic API Key"
              provider="anthropic"
              placeholder="sk-ant-..."
              value={apiKeys.anthropic}
              onChange={(value) => handleKeyChange('anthropic', value)}
              showKey={showKeys.anthropic}
              onToggleShow={() => toggleShowKey('anthropic')}
              hasChanges={hasChanges.anthropic}
            />

            <ApiKeyField
              label="OpenAI API Key"
              provider="openai"
              placeholder="sk-..."
              value={apiKeys.openai}
              onChange={(value) => handleKeyChange('openai', value)}
              showKey={showKeys.openai}
              onToggleShow={() => toggleShowKey('openai')}
              hasChanges={hasChanges.openai}
            />

            <ApiKeyField
              label="Perplexity API Key"
              provider="perplexity"
              placeholder="pplx-..."
              value={apiKeys.perplexity}
              onChange={(value) => handleKeyChange('perplexity', value)}
              showKey={showKeys.perplexity}
              onToggleShow={() => toggleShowKey('perplexity')}
              hasChanges={hasChanges.perplexity}
            />

            <ApiKeyField
              label="Google API Key"
              provider="google"
              placeholder="AIza..."
              value={apiKeys.google}
              onChange={(value) => handleKeyChange('google', value)}
              showKey={showKeys.google}
              onToggleShow={() => toggleShowKey('google')}
              hasChanges={hasChanges.google}
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 p-6 border-t border-dark-700">
          <button
            onClick={onClose}
            className="btn-secondary"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || !Object.values(hasChanges).some(v => v)}
            className="btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save size={16} />
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
};

interface ApiKeyFieldProps {
  label: string;
  provider: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  showKey: boolean;
  onToggleShow: () => void;
  hasChanges?: boolean;
}

const ApiKeyField: React.FC<ApiKeyFieldProps> = ({
  label,
  placeholder,
  value,
  onChange,
  showKey,
  onToggleShow,
  hasChanges,
}) => {
  return (
    <div>
      <label className="block text-sm font-medium mb-2">
        {label}
        {hasChanges && <span className="text-yellow-500 text-xs ml-2">(modified)</span>}
      </label>
      <div className="relative">
        <input
          type={showKey ? 'text' : 'password'}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="input-field pr-10"
        />
        <button
          type="button"
          onClick={onToggleShow}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
        >
          {showKey ? <EyeOff size={20} /> : <Eye size={20} />}
        </button>
      </div>
    </div>
  );
};