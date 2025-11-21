
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { AISettings, ModelInfo } from '../types';
import { validateConnection, getModels, filterModels } from "../services/aiService";
import { getEnvApiKey } from '../utils/env';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSettings: AISettings;
  onSave: (settings: AISettings) => void; // Now acts as onUpdate
  themeFont: string;
  showToast: (msg: string, type?: 'info' | 'error') => void;
}

type Tab = 'credentials' | 'models' | 'audio';
type FunctionKey = 'story' | 'image' | 'video' | 'audio' | 'translation' | 'lore';

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  currentSettings,
  onSave,
  themeFont,
  showToast
}) => {
  const [activeTab, setActiveTab] = useState<Tab>('credentials');
  const [geminiModels, setGeminiModels] = useState<ModelInfo[]>([]);
  const [openaiModels, setOpenaiModels] = useState<ModelInfo[]>([]);
  const [openrouterModels, setOpenrouterModels] = useState<ModelInfo[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);
  const [showSaveIndicator, setShowSaveIndicator] = useState(false);

  const { t, i18n } = useTranslation();

  useEffect(() => {
    if (isOpen) {
      setActiveTab('credentials');
      loadModels();
    }
  }, [isOpen]);

  const loadModels = async (force: boolean = false) => {
      setLoadingModels(true);
      try {
        const [g, o, or] = await Promise.all([
            getModels('gemini', force),
            getModels('openai', force),
            getModels('openrouter', force)
        ]);
        setGeminiModels(g);
        setOpenaiModels(o);
        setOpenrouterModels(or);
      } catch (e) {
        console.error("Failed to load models", e);
        showToast("Failed to load some models", "error");
      } finally {
        setLoadingModels(false);
      }
  };

  // Filter and Sort Models
  const getFilteredModels = (provider: 'gemini' | 'openai' | 'openrouter', type: FunctionKey) => {
      const list = provider === 'gemini' ? geminiModels : (provider === 'openai' ? openaiModels : openrouterModels);
      return filterModels(list, type);
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

  const updateCreds = (provider: 'gemini' | 'openai' | 'openrouter', field: 'apiKey' | 'baseUrl', value: string) => {
    const newSettings = {
      ...currentSettings,
      [provider]: { ...currentSettings[provider], [field]: value }
    };
    updateSettings(newSettings);
  };

  const changeLanguage = (lang: string) => {
    i18n.changeLanguage(lang);
    updateSettings({ ...currentSettings, language: lang as any });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-theme-surface border border-theme-border rounded w-full max-w-2xl shadow-[0_0_40px_rgba(var(--theme-primary),0.2)] relative overflow-hidden flex flex-col max-h-[90vh]">

        <div className="p-6 border-b border-theme-border bg-theme-surface-highlight/50 flex justify-between items-center">
          <h2 className={`text-2xl text-theme-primary ${themeFont}`}>{t('settings')}</h2>
          <button onClick={onClose} className="text-theme-muted hover:text-theme-text">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>

        <div className="flex border-b border-theme-border bg-theme-bg">
           {(['credentials', 'models', 'audio'] as Tab[]).map((tab) => (
             <button
               key={tab}
               onClick={() => setActiveTab(tab)}
               className={`flex-1 py-3 text-sm font-bold uppercase tracking-widest transition-colors ${
                 activeTab === tab
                   ? 'bg-theme-surface text-theme-primary border-b-2 border-theme-primary'
                   : 'text-theme-muted hover:text-theme-text hover:bg-theme-surface-highlight'
               }`}
             >
               {t(`tabs.${tab}`)}
             </button>
           ))}
        </div>

        <div className="p-6 space-y-6 overflow-y-auto flex-1">

          {activeTab === 'credentials' && (
            <div className="space-y-8 animate-slide-in">
              <div className="bg-theme-surface-highlight/30 p-4 rounded border border-theme-border">
                  <h3 className="text-sm font-bold text-theme-text uppercase tracking-widest mb-4">{t('languageLabel')}</h3>
                  <div className="flex gap-4">
                      <button
                          onClick={() => changeLanguage('en')}
                          className={`flex-1 py-2 rounded border transition-colors ${i18n.language === 'en' ? 'bg-theme-primary text-theme-bg border-theme-primary' : 'bg-theme-bg text-theme-text border-theme-border hover:border-theme-primary'}`}
                      >
                          English
                      </button>
                      <button
                          onClick={() => changeLanguage('zh')}
                          className={`flex-1 py-2 rounded border transition-colors ${i18n.language === 'zh' ? 'bg-theme-primary text-theme-bg border-theme-primary' : 'bg-theme-bg text-theme-text border-theme-border hover:border-theme-primary'}`}
                      >
                          中文 (Chinese)
                      </button>
                  </div>
              </div>

              {/* Gemini Inputs */}
              <div className="bg-theme-surface-highlight/30 p-4 rounded border border-theme-border">
                 <div className="flex justify-between items-center mb-4">
                    <h3 className="text-sm font-bold text-theme-text uppercase tracking-widest">{t('creds.geminiTitle')}</h3>
                    <button
                      onClick={async () => {
                        const { isValid, error } = await validateConnection('gemini');
                        showToast(isValid ? t('connectionSuccess') : (error || t('connectionFailed')), isValid ? 'info' : 'error');
                      }}
                      className="text-xs text-theme-primary hover:text-theme-primary-hover underline"
                    >
                      {t('testConnection')}
                    </button>
                 </div>
                 <input
                   type="password"
                   value={currentSettings.gemini.apiKey || ''}
                   onChange={(e) => updateCreds('gemini', 'apiKey', e.target.value)}
                   placeholder={getEnvApiKey() ? t('loadedFromEnv') : t('creds.apiKeyPlaceholder')}
                   className="w-full bg-theme-bg border border-theme-border rounded p-2 text-theme-text text-sm outline-none mb-2"
                   onBlur={() => loadModels(false)}
                 />
                 <input
                   type="text"
                   value={currentSettings.gemini.baseUrl || ''}
                   onChange={(e) => updateCreds('gemini', 'baseUrl', e.target.value)}
                   placeholder="Base URL (Optional)"
                   className="w-full bg-theme-bg border border-theme-border rounded p-2 text-theme-text text-sm outline-none"
                   onBlur={() => loadModels(false)}
                 />
              </div>
              {/* OpenAI Inputs */}
              <div className="bg-theme-surface-highlight/30 p-4 rounded border border-theme-border">
                 <div className="flex justify-between items-center mb-4">
                    <h3 className="text-sm font-bold text-theme-text uppercase tracking-widest">{t('creds.openaiTitle')}</h3>
                    <button
                      onClick={async () => {
                        const { isValid, error } = await validateConnection('openai');
                        showToast(isValid ? t('connectionSuccess') : (error || t('connectionFailed')), isValid ? 'info' : 'error');
                      }}
                      className="text-xs text-theme-primary hover:text-theme-primary-hover underline"
                    >
                      {t('testConnection')}
                    </button>
                 </div>
                 <input
                   type="password"
                   value={currentSettings.openai.apiKey || ''}
                   onChange={(e) => updateCreds('openai', 'apiKey', e.target.value)}
                   placeholder={t('creds.apiKeyPlaceholder')}
                   className="w-full bg-theme-bg border border-theme-border rounded p-2 text-theme-text text-sm outline-none mb-2"
                   onBlur={() => loadModels(false)}
                 />
                 <input
                   type="text"
                   value={currentSettings.openai.baseUrl || ''}
                   onChange={(e) => updateCreds('openai', 'baseUrl', e.target.value)}
                   placeholder="https://api.openai.com/v1"
                   className="w-full bg-theme-bg border border-theme-border rounded p-2 text-theme-text text-sm outline-none"
                   onBlur={() => loadModels(false)}
                 />
              </div>

              {/* OpenRouter Inputs */}
              <div className="bg-theme-surface-highlight/30 p-4 rounded border border-theme-border">
                 <div className="flex justify-between items-center mb-4">
                    <h3 className="text-sm font-bold text-theme-text uppercase tracking-widest">OpenRouter</h3>
                    <button
                      onClick={async () => {
                        const { isValid, error } = await validateConnection('openrouter');
                        showToast(isValid ? t('connectionSuccess') : (error || t('connectionFailed')), isValid ? 'info' : 'error');
                      }}
                      className="text-xs text-theme-primary hover:text-theme-primary-hover underline"
                    >
                      {t('testConnection')}
                    </button>
                 </div>
                 <input
                   type="password"
                   value={currentSettings.openrouter.apiKey || ''}
                   onChange={(e) => updateCreds('openrouter', 'apiKey', e.target.value)}
                   placeholder={t('creds.apiKeyPlaceholder')}
                   className="w-full bg-theme-bg border border-theme-border rounded p-2 text-theme-text text-sm outline-none mb-2"
                   onBlur={() => loadModels(false)}
                 />
                 <input
                   type="text"
                   value={currentSettings.openrouter.baseUrl || ''}
                   onChange={(e) => updateCreds('openrouter', 'baseUrl', e.target.value)}
                   placeholder="https://openrouter.ai/api/v1"
                   className="w-full bg-theme-bg border border-theme-border rounded p-2 text-theme-text text-sm outline-none"
                   onBlur={() => loadModels(false)}
                 />
              </div>
            </div>
          )}

          {activeTab === 'models' && (
            <div className="space-y-6 animate-slide-in">

              <div className="flex justify-end">
                  <button
                      onClick={() => loadModels(true)}
                      disabled={loadingModels}
                      className="px-3 py-1 bg-theme-surface-highlight border border-theme-border rounded text-xs text-theme-text hover:bg-theme-primary hover:text-theme-bg transition-colors flex items-center gap-2"
                  >
                      {loadingModels ? (
                          <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                      ) : (
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
                      )}
                      Refresh Models
                  </button>
              </div>

              {/* Context Length Slider */}
              <div className="space-y-2 pb-4 border-b border-theme-border">
                  <div className="flex justify-between">
                    <label className="text-sm font-bold text-theme-primary uppercase tracking-widest">{t('models.contextLen')}</label>
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
                  <p className="text-xs text-theme-muted italic">{t('models.contextLenHelp')}</p>
              </div>

              {([
                { key: 'story', label: t('models.story'), help: t('models.storyHelp'), hasEnable: false },
                { key: 'image', label: t('models.image'), help: t('models.imageHelp'), hasEnable: true },
                { key: 'video', label: t('models.video'), help: t('models.videoHelp'), hasEnable: true },
                { key: 'audio', label: t('models.audio'), help: t('models.audioHelp'), hasEnable: true },
                { key: 'translation', label: t('models.translation'), help: t('models.translationHelp'), hasEnable: true },
                { key: 'lore', label: t('models.lore'), help: t('models.loreHelp'), hasEnable: true },
              ] as const).map((section) => {
                const sectionKey = section.key as FunctionKey;
                const config = currentSettings[sectionKey];
                const isEnabled = config.enabled !== false;
                const modelList = getFilteredModels(config.provider, sectionKey);
                const isModelValid = modelList.some(m => m.id === config.modelId);

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
                        className="bg-theme-bg border border-theme-border rounded p-2 text-theme-text text-xs focus:border-theme-primary outline-none [&>option]:bg-theme-bg [&>option]:text-theme-text w-full"
                      >
                        <option value="gemini" className="text-black dark:text-white">Gemini</option>
                        <option value="openai" className="text-black dark:text-white">OpenAI</option>
                        <option value="openrouter" className="text-black dark:text-white">OpenRouter</option>
                      </select>

                      <div className="col-span-2 relative">
                         <select
                            value={config.modelId}
                            onChange={(e) => updateFunction(sectionKey, 'modelId', e.target.value)}
                            className={`w-full bg-theme-bg border rounded p-2 text-theme-text text-xs focus:border-theme-primary outline-none font-mono appearance-none [&>option]:bg-theme-bg [&>option]:text-theme-text ${!isModelValid && !loadingModels ? 'border-red-500 text-red-500' : 'border-theme-border'}`}
                            disabled={loadingModels}
                         >
                            <option value={config.modelId} className="text-black dark:text-white">{config.modelId} (Current)</option>
                            {modelList.map(m => (
                                <option key={m.id} value={m.id} className="text-black dark:text-white">{m.name || m.id}</option>
                            ))}
                         </select>
                         {loadingModels && <div className="absolute right-2 top-2 text-theme-muted text-xs">{t('loadingGeneric')}</div>}
                         {!isModelValid && !loadingModels && (
                             <div className="text-[10px] text-red-500 mt-1 font-bold uppercase tracking-wider">
                                 Model not found in list. Please select a valid model.
                             </div>
                         )}
                      </div>

                      {sectionKey === 'image' && (
                          <div className="col-span-3 mt-1 border-t border-theme-border pt-2">
                              <div className="flex items-center justify-between">
                                <label className="text-xs font-bold text-theme-muted uppercase tracking-widest">{t('models.resolution')}</label>
                                <select
                                    value={config.resolution || '1024x1024'}
                                    onChange={(e) => updateFunction(sectionKey, 'resolution', e.target.value)}
                                    className="bg-theme-bg border border-theme-border rounded p-1 text-theme-text text-xs focus:border-theme-primary outline-none [&>option]:bg-theme-bg [&>option]:text-theme-text w-1/2 text-white"
                                >
                                    <option value="1024x1024" className="text-black dark:text-white">{t('models.resolutions.ratio11')}</option>
                                    <option value="832x1248" className="text-black dark:text-white">{t('models.resolutions.ratio23')}</option>
                                    <option value="1248x832" className="text-black dark:text-white">{t('models.resolutions.ratio32')}</option>
                                    <option value="864x1184" className="text-black dark:text-white">{t('models.resolutions.ratio34')}</option>
                                    <option value="1184x864" className="text-black dark:text-white">{t('models.resolutions.ratio43')}</option>
                                    <option value="896x1152" className="text-black dark:text-white">{t('models.resolutions.ratio45')}</option>
                                    <option value="1152x896" className="text-black dark:text-white">{t('models.resolutions.ratio54')}</option>
                                    <option value="768x1344" className="text-black dark:text-white">{t('models.resolutions.ratio916')}</option>
                                    <option value="1344x768" className="text-black dark:text-white">{t('models.resolutions.ratio169')}</option>
                                    <option value="1536x672" className="text-black dark:text-white">{t('models.resolutions.ratio219')}</option>
                                </select>
                              </div>
                          </div>
                      )}
                   </div>
                </div>
              );})}
            </div>
          )}

          {activeTab === 'audio' && (
            <div className="p-6 space-y-8 overflow-y-auto custom-scrollbar">
               {/* Environment Audio */}
               <div className="space-y-4">
                  <div className="flex justify-between items-center">
                     <h3 className="text-lg font-bold text-theme-primary uppercase tracking-widest">{t('audioSettings.environment')}</h3>
                     <button
                        onClick={() => updateSettings({
                           ...currentSettings,
                           audioVolume: {
                               ...currentSettings.audioVolume,
                               bgmMuted: !currentSettings.audioVolume?.bgmMuted
                           }
                        })}
                        className={`px-3 py-1 rounded text-xs font-bold uppercase tracking-widest border transition-colors ${
                           currentSettings.audioVolume?.bgmMuted
                               ? 'bg-red-500/20 border-red-500 text-red-500'
                               : 'bg-theme-primary/20 border-theme-primary text-theme-primary'
                        }`}
                     >
                        {currentSettings.audioVolume?.bgmMuted ? t('audioSettings.muted') : t('audioSettings.active')}
                     </button>
                  </div>
                  <div className={`space-y-2 ${currentSettings.audioVolume?.bgmMuted ? 'opacity-50 pointer-events-none' : ''}`}>
                     <div className="flex justify-between text-xs text-theme-muted">
                        <span>{t('audioSettings.volume')}</span>
                        <span>{Math.round((currentSettings.audioVolume?.bgmVolume ?? 0.5) * 100)}%</span>
                     </div>
                     <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={currentSettings.audioVolume?.bgmVolume ?? 0.5}
                        onChange={(e) => updateSettings({
                           ...currentSettings,
                           audioVolume: {
                               ...currentSettings.audioVolume,
                               bgmVolume: parseFloat(e.target.value)
                           }
                        })}
                        className="w-full accent-theme-primary"
                     />
                  </div>
               </div>

               {/* TTS Audio */}
               <div className="space-y-4 pt-6 border-t border-theme-border">
                  <div className="flex justify-between items-center">
                     <h3 className="text-lg font-bold text-theme-primary uppercase tracking-widest">{t('audioSettings.voice')}</h3>
                     <button
                        onClick={() => updateSettings({
                           ...currentSettings,
                           audioVolume: {
                               ...currentSettings.audioVolume,
                               ttsMuted: !currentSettings.audioVolume?.ttsMuted
                           }
                        })}
                        className={`px-3 py-1 rounded text-xs font-bold uppercase tracking-widest border transition-colors ${
                           currentSettings.audioVolume?.ttsMuted
                               ? 'bg-red-500/20 border-red-500 text-red-500'
                               : 'bg-theme-primary/20 border-theme-primary text-theme-primary'
                        }`}
                     >
                        {currentSettings.audioVolume?.ttsMuted ? t('audioSettings.muted') : t('audioSettings.active')}
                     </button>
                  </div>
                  <div className={`space-y-2 ${currentSettings.audioVolume?.ttsMuted ? 'opacity-50 pointer-events-none' : ''}`}>
                     <div className="flex justify-between text-xs text-theme-muted">
                        <span>{t('audioSettings.volume')}</span>
                        <span>{Math.round((currentSettings.audioVolume?.ttsVolume ?? 1.0) * 100)}%</span>
                     </div>
                     <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={currentSettings.audioVolume?.ttsVolume ?? 1.0}
                        onChange={(e) => updateSettings({
                           ...currentSettings,
                           audioVolume: {
                               ...currentSettings.audioVolume,
                               ttsVolume: parseFloat(e.target.value)
                           }
                        })}
                        className="w-full accent-theme-primary"
                     />
                  </div>
               </div>
            </div>
          )}

        </div>

        <div className="p-4 border-t border-theme-border bg-theme-surface/50 flex justify-between items-center">
          <div className={`text-xs text-theme-primary font-bold uppercase tracking-widest transition-opacity duration-500 ${showSaveIndicator ? 'opacity-100' : 'opacity-0'}`}>
             {t('toast.autoSavedSettings')}
          </div>
          <button onClick={onClose} className="px-6 py-2 bg-theme-surface-highlight hover:bg-theme-primary hover:text-theme-bg border border-theme-border rounded transition-colors font-bold text-sm">
            {t('close')}
          </button>
        </div>
      </div>
    </div>
  );
};
