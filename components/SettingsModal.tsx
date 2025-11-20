
import React, { useState, useEffect } from 'react';
import { LanguageCode, AISettings, ModelInfo } from '../types';
import { TRANSLATIONS } from '../utils/constants';
import { getModels, validateConnection } from '../services/geminiService';
import { getEnvApiKey } from '../utils/env';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: LanguageCode;
  currentSettings: AISettings;
  onSave: (settings: AISettings) => void; // Now acts as onUpdate
  themeFont: string;
  showToast: (msg: string, type?: 'info' | 'error') => void;
}

type Tab = 'credentials' | 'models';
type FunctionKey = 'story' | 'image' | 'video' | 'audio' | 'translation' | 'lore';

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  language,
  currentSettings,
  onSave,
  themeFont,
  showToast
}) => {
  const [activeTab, setActiveTab] = useState<Tab>('credentials');
  const [geminiModels, setGeminiModels] = useState<ModelInfo[]>([]);
  const [openaiModels, setOpenaiModels] = useState<ModelInfo[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);
  const [showSaveIndicator, setShowSaveIndicator] = useState(false);

  const t = TRANSLATIONS[language];

  useEffect(() => {
    if (isOpen) {
      setActiveTab('credentials');
      loadModels();
    }
  }, [isOpen]);

  const loadModels = async () => {
      setLoadingModels(true);
      const [g, o] = await Promise.all([
          getModels('gemini'),
          getModels('openai')
      ]);
      setGeminiModels(g);
      setOpenaiModels(o);
      setLoadingModels(false);
  };

  // Instant Update Handler
  const updateSettings = (newSettings: AISettings) => {
    onSave(newSettings);
    // Trigger visual feedback
    setShowSaveIndicator(true);
    setTimeout(() => setShowSaveIndicator(false), 2000);
  };

  const updateFunction = (func: FunctionKey, field: string, value: any) => {
    const newSettings = {
      ...currentSettings,
      [func]: { ...currentSettings[func], [field]: value }
    };
    updateSettings(newSettings);
  };

  const updateCreds = (provider: 'gemini' | 'openai', field: 'apiKey' | 'baseUrl', value: string) => {
    const newSettings = {
      ...currentSettings,
      [provider]: { ...currentSettings[provider], [field]: value }
    };
    updateSettings(newSettings);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-theme-surface border border-theme-border rounded w-full max-w-2xl shadow-[0_0_40px_rgba(var(--theme-primary),0.2)] relative overflow-hidden flex flex-col max-h-[90vh]">

        <div className="p-6 border-b border-theme-border bg-theme-surface-highlight/50 flex justify-between items-center">
          <h2 className={`text-2xl text-theme-primary ${themeFont}`}>{t.settings}</h2>
          <button onClick={onClose} className="text-theme-muted hover:text-theme-text">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>

        <div className="flex border-b border-theme-border bg-theme-bg">
           {(['credentials', 'models'] as Tab[]).map((tab) => (
             <button
               key={tab}
               onClick={() => setActiveTab(tab)}
               className={`flex-1 py-3 text-sm font-bold uppercase tracking-widest transition-colors ${
                 activeTab === tab
                   ? 'bg-theme-surface text-theme-primary border-b-2 border-theme-primary'
                   : 'text-theme-muted hover:text-theme-text hover:bg-theme-surface-highlight'
               }`}
             >
               {t.tabs[tab]}
             </button>
           ))}
        </div>

        <div className="p-6 space-y-6 overflow-y-auto flex-1">

          {activeTab === 'credentials' && (
            <div className="space-y-8 animate-slide-in">
              <div className="bg-theme-surface-highlight/30 p-4 rounded border border-theme-border">
                  <h3 className="text-sm font-bold text-theme-text uppercase tracking-widest mb-4">{t.languageLabel}</h3>
                  <div className="flex gap-4">
                      <button
                          onClick={() => updateSettings({ ...currentSettings, language: 'en' })}
                          className={`flex-1 py-2 rounded border transition-colors ${currentSettings.language === 'en' ? 'bg-theme-primary text-theme-bg border-theme-primary' : 'bg-theme-bg text-theme-text border-theme-border hover:border-theme-primary'}`}
                      >
                          English
                      </button>
                      <button
                          onClick={() => updateSettings({ ...currentSettings, language: 'zh' })}
                          className={`flex-1 py-2 rounded border transition-colors ${currentSettings.language === 'zh' ? 'bg-theme-primary text-theme-bg border-theme-primary' : 'bg-theme-bg text-theme-text border-theme-border hover:border-theme-primary'}`}
                      >
                          中文 (Chinese)
                      </button>
                  </div>
              </div>

              {/* Gemini Inputs */}
              <div className="bg-theme-surface-highlight/30 p-4 rounded border border-theme-border">
                 <div className="flex justify-between items-center mb-4">
                    <h3 className="text-sm font-bold text-theme-text uppercase tracking-widest">{t.creds.geminiTitle}</h3>
                    <button
                      onClick={async () => {
                        const { isValid, error } = await validateConnection('gemini');
                        showToast(isValid ? t.connectionSuccess : (error || t.connectionFailed), isValid ? 'info' : 'error');
                      }}
                      className="text-xs text-theme-primary hover:text-theme-primary-hover underline"
                    >
                      Test Connection
                    </button>
                 </div>
                 <input
                   type="password"
                   value={currentSettings.gemini.apiKey || ''}
                   onChange={(e) => updateCreds('gemini', 'apiKey', e.target.value)}
                   placeholder={getEnvApiKey() ? t.loadedFromEnv : t.creds.apiKeyPlaceholder}
                   className="w-full bg-theme-bg border border-theme-border rounded p-2 text-theme-text text-sm outline-none mb-2"
                   onBlur={loadModels}
                 />
                 <input
                   type="text"
                   value={currentSettings.gemini.baseUrl || ''}
                   onChange={(e) => updateCreds('gemini', 'baseUrl', e.target.value)}
                   placeholder="Base URL (Optional)"
                   className="w-full bg-theme-bg border border-theme-border rounded p-2 text-theme-text text-sm outline-none"
                   onBlur={loadModels}
                 />
              </div>
              {/* OpenAI Inputs */}
              <div className="bg-theme-surface-highlight/30 p-4 rounded border border-theme-border">
                 <div className="flex justify-between items-center mb-4">
                    <h3 className="text-sm font-bold text-theme-text uppercase tracking-widest">{t.creds.openaiTitle}</h3>
                    <button
                      onClick={async () => {
                        const { isValid, error } = await validateConnection('openai');
                        showToast(isValid ? t.connectionSuccess : (error || t.connectionFailed), isValid ? 'info' : 'error');
                      }}
                      className="text-xs text-theme-primary hover:text-theme-primary-hover underline"
                    >
                      Test Connection
                    </button>
                 </div>
                 <input
                   type="password"
                   value={currentSettings.openai.apiKey || ''}
                   onChange={(e) => updateCreds('openai', 'apiKey', e.target.value)}
                   placeholder={t.creds.apiKeyPlaceholder}
                   className="w-full bg-theme-bg border border-theme-border rounded p-2 text-theme-text text-sm outline-none mb-2"
                   onBlur={loadModels}
                 />
                 <input
                   type="text"
                   value={currentSettings.openai.baseUrl || ''}
                   onChange={(e) => updateCreds('openai', 'baseUrl', e.target.value)}
                   placeholder="https://openrouter.ai/api/v1"
                   className="w-full bg-theme-bg border border-theme-border rounded p-2 text-theme-text text-sm outline-none"
                   onBlur={loadModels}
                 />
              </div>
            </div>
          )}

          {activeTab === 'models' && (
            <div className="space-y-6 animate-slide-in">

              {/* Context Length Slider */}
              <div className="space-y-2 pb-4 border-b border-theme-border">
                  <div className="flex justify-between">
                    <label className="text-sm font-bold text-theme-primary uppercase tracking-widest">{t.models.contextLen}</label>
                    <span className="text-theme-text font-mono">{currentSettings.contextLen || 16} turns</span>
                  </div>
                  <input
                    type="range"
                    min="4"
                    max="50"
                    step="2"
                    value={currentSettings.contextLen || 16}
                    onChange={(e) => updateSettings({...currentSettings, contextLen: parseInt(e.target.value)})}
                    className="w-full accent-theme-primary"
                  />
                  <p className="text-xs text-theme-muted italic">{t.models.contextLenHelp}</p>
              </div>

              {([
                { key: 'story', label: t.models.story, help: t.models.storyHelp, hasEnable: false },
                { key: 'image', label: t.models.image, help: t.models.imageHelp, hasEnable: true },
                { key: 'video', label: t.models.video, help: t.models.videoHelp, hasEnable: true },
                { key: 'audio', label: t.models.audio, help: t.models.audioHelp, hasEnable: true },
                { key: 'translation', label: t.models.translation, help: t.models.translationHelp, hasEnable: true },
                { key: 'lore', label: t.models.lore, help: t.models.loreHelp, hasEnable: true },
              ] as const).map((section) => {
                const sectionKey = section.key as FunctionKey;
                const config = currentSettings[sectionKey];
                const isEnabled = config.enabled !== false;
                const modelList = config.provider === 'gemini' ? geminiModels : openaiModels;

                return (
                <div key={section.key} className="space-y-3 pb-6 border-b border-theme-border last:border-0">
                   <div className="flex items-center justify-between">
                      <label className="text-sm font-bold text-theme-primary uppercase tracking-widest">{section.label}</label>
                      {section.hasEnable && (
                         <button
                            onClick={() => updateFunction(sectionKey, 'enabled', !isEnabled)}
                            className={`w-8 h-4 rounded-full relative transition-colors ${isEnabled ? 'bg-green-500' : 'bg-theme-border'}`}
                         >
                            <span className={`absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full transition-transform ${isEnabled ? 'translate-x-4' : ''}`}></span>
                         </button>
                      )}
                      </div>

                   <div className={`grid grid-cols-1 md:grid-cols-3 gap-3 ${section.hasEnable && !isEnabled ? 'opacity-40 pointer-events-none' : ''}`}>
                      <select
                        value={config.provider}
                        onChange={(e) => updateFunction(sectionKey, 'provider', e.target.value)}
                        className="bg-theme-bg border border-theme-border rounded p-2 text-theme-text text-xs focus:border-theme-primary outline-none [&>option]:bg-theme-bg [&>option]:text-theme-text"
                      >
                        <option value="gemini">Gemini</option>
                        <option value="openai">OpenAI</option>
                      </select>

                      <div className="col-span-2 relative">
                         <select
                            value={config.modelId}
                            onChange={(e) => updateFunction(sectionKey, 'modelId', e.target.value)}
                            className="w-full bg-theme-bg border border-theme-border rounded p-2 text-theme-text text-xs focus:border-theme-primary outline-none font-mono appearance-none [&>option]:bg-theme-bg [&>option]:text-theme-text"
                            disabled={loadingModels}
                         >
                            <option value={config.modelId}>{config.modelId} (Current)</option>
                            {modelList.map(m => (
                                <option key={m.id} value={m.id}>{m.name || m.id}</option>
                            ))}
                         </select>
                         {loadingModels && <div className="absolute right-2 top-2 text-theme-muted text-xs">{t.loadingGeneric}</div>}
                      </div>
                   </div>
                </div>
              );})}
            </div>
          )}

        </div>

        <div className="p-4 border-t border-theme-border bg-theme-surface/50 flex justify-between items-center">
          <div className={`text-xs text-theme-primary font-bold uppercase tracking-widest transition-opacity duration-500 ${showSaveIndicator ? 'opacity-100' : 'opacity-0'}`}>
             {t.toast.autoSavedSettings}
          </div>
          <button onClick={onClose} className="px-6 py-2 bg-theme-surface-highlight hover:bg-theme-primary hover:text-theme-bg border border-theme-border rounded transition-colors font-bold text-sm">
            {t.close}
          </button>
        </div>
      </div>
    </div>
  );
};
