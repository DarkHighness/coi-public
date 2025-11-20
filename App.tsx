
import React, { useState, useRef, useEffect, Suspense } from 'react';
import { useGameEngine } from './hooks/useGameEngine';
import { StartScreen } from './components/StartScreen';
import { Sidebar } from './components/Sidebar';
import { StoryFeed } from './components/StoryFeed';
import { ActionPanel } from './components/ActionPanel';
import { Toast } from './components/Toast';
import { THEMES, TRANSLATIONS } from './utils/constants';
import { FeedLayout } from './types';
import { MobileNav, MobileTab } from './components/MobileNav';
import { getEnvApiKey } from './utils/env';
import { validateConnection } from './services/geminiService';
// import { EnvironmentalEffects } from './components/EnvironmentalEffects';
import { LogPanel } from './components/sidebar/LogPanel';

// Lazy Load Heavy Components for Code Splitting
const MagicMirror = React.lazy(() => import('./components/MagicMirror').then(module => ({ default: module.MagicMirror })));
const SettingsModal = React.lazy(() => import('./components/SettingsModal').then(module => ({ default: module.SettingsModal })));
const SaveManager = React.lazy(() => import('./components/SaveManager').then(module => ({ default: module.SaveManager })));
const DestinyMap = React.lazy(() => import('./components/DestinyMap').then(module => ({ default: module.DestinyMap })));
const StoryTimeline = React.lazy(() => import('./components/StoryTimeline').then(module => ({ default: module.StoryTimeline })));
const EnvironmentalEffects = React.lazy(() => import('./components/EnvironmentalEffects').then(module => ({ default: module.EnvironmentalEffects })));

export default function App() {
  const {
    view, setView,
    language, setLanguage,
    isTranslating,
    gameState, setGameState,
    handleAction,
    startNewGame,
    isAutoSaving,
    isMagicMirrorOpen, setIsMagicMirrorOpen,
    magicMirrorImage, setMagicMirrorImage,
    isSettingsOpen, setIsSettingsOpen,
    aiSettings, handleSaveSettings,
    currentHistory,
    saveSlots, switchSlot, deleteSlot,
    currentSlotId,
    navigateToNode
  } = useGameEngine();

  const [feedLayout, setFeedLayout] = useState<FeedLayout>('scroll');
  const [isSaveManagerOpen, setIsSaveManagerOpen] = useState(false);
  const [isDestinyMapOpen, setIsDestinyMapOpen] = useState(false);
  const [isLogPanelOpen, setIsLogPanelOpen] = useState(false);
  const [notification, setNotification] = useState<{show: boolean, msg: string, type: 'info' | 'error'}>({show: false, msg: '', type: 'info'});

  // Mobile Nav State
  const [mobileTab, setMobileTab] = useState<MobileTab>('story');

  const t = TRANSLATIONS[language];
  const currentThemeConfig = THEMES[gameState.theme] || THEMES.fantasy;

  // Determine current context for effects
  const currentSegment = currentHistory[currentHistory.length - 1];
  const effectText = currentSegment ? currentSegment.text : "";
  const effectPrompt = currentSegment ? currentSegment.imagePrompt : "";

  useEffect(() => {
    const savedLayout = localStorage.getItem('chronicles_feedlayout');
    if (savedLayout === 'scroll' || savedLayout === 'stack') {
      setFeedLayout(savedLayout as FeedLayout);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('chronicles_feedlayout', feedLayout);
  }, [feedLayout]);

  const showToast = (msg: string, type: 'info' | 'error' = 'info') => {
      setNotification({show: true, msg, type});
      setTimeout(() => setNotification({show: false, msg: '', type: 'info'}), 3000);
  };

  const handleFork = (nodeId: string) => {
      if (window.confirm(t.tree.forkConfirm)) {
          navigateToNode(nodeId);
          setMobileTab('story'); // Switch back to story on fork
      }
  };

  const handlePlayerAction = async (action: string) => {
      const toastMsg = await handleAction(action);
      if (toastMsg) {
          if (toastMsg.startsWith('Error:')) {
             showToast(toastMsg.replace('Error: ', ''), 'error');
          } else {
             showToast(toastMsg);
          }
      }
  };

  const validateConfig = () => {
      const storyProvider = aiSettings.story.provider;
      if (storyProvider === 'gemini') {
          if (aiSettings.gemini.apiKey || getEnvApiKey()) return true;
      } else if (storyProvider === 'openai') {
          if (aiSettings.openai.apiKey) return true;
      }
      return false;
  };

  const performValidation = async (): Promise<boolean> => {
      if (!validateConfig()) {
          showToast(t.missingApiKey, 'error');
          setIsSettingsOpen(true);
          return false;
      }

      const provider = aiSettings.story.provider as 'gemini' | 'openai';
      showToast("Validating connection...", 'info');

      const { isValid, error } = await validateConnection(provider);

      if (!isValid) {
          showToast(error || "Invalid API Key or Connection Failed", 'error');
          setIsSettingsOpen(true);
          return false;
      }
      return true;
  };

  const handleStartGame = async (theme: string, customContext?: string) => {
      if (await performValidation()) {
          startNewGame(theme, customContext);
      }
  };

  const handleContinueGame = async () => {
      if (await performValidation()) {
          setView('game');
      }
  };

  const LoadingFallback = () => (
     <div className="fixed inset-0 flex items-center justify-center z-[100] bg-black/50 backdrop-blur pointer-events-none">
        <div className="w-10 h-10 border-4 border-theme-primary border-t-transparent rounded-full animate-spin"></div>
     </div>
  );

  if (view === 'start') {
    return (
      <>
        <StartScreen
          language={language}
          setLanguage={setLanguage}
          onStart={handleStartGame}
          onContinue={handleContinueGame}
          onLoad={() => setIsSaveManagerOpen(true)}
          onSettings={() => setIsSettingsOpen(true)}
          hasSave={saveSlots.length > 0}
        />
        <Suspense fallback={<LoadingFallback />}>
          <SettingsModal
            isOpen={isSettingsOpen}
            onClose={() => setIsSettingsOpen(false)}
            language={language}
            currentSettings={aiSettings}
            onSave={handleSaveSettings}
            themeFont={currentThemeConfig.fontClass}
            showToast={showToast}
          />
          {isSaveManagerOpen && (
             <SaveManager
                slots={saveSlots}
                currentSlotId={null}
                onSwitch={switchSlot}
                onDelete={deleteSlot}
                onClose={() => setIsSaveManagerOpen(false)}
                language={language}
             />
          )}
        </Suspense>
        <Toast show={notification.show} message={notification.msg} type={notification.type} />
      </>
    );
  }

  // Initializing Loading View
  if (view === 'initializing') {
     return (
       <div className="h-[100dvh] w-full flex flex-col items-center justify-center bg-theme-bg text-theme-primary relative overflow-hidden">
          <div className="absolute inset-0 bg-black/60 z-0"></div>

          <div className="relative z-10 flex flex-col items-center gap-6 animate-pulse">
             <div className="w-16 h-16 border-4 border-theme-primary border-t-transparent rounded-full animate-spin shadow-[0_0_30px_rgba(var(--theme-primary),0.4)]"></div>
             <h2 className={`text-2xl md:text-4xl ${currentThemeConfig.fontClass} tracking-widest uppercase text-center px-4`}>
               {t.outline.generating}
             </h2>
             <p className="text-theme-muted italic text-sm">{t.loading}</p>
          </div>
       </div>
     );
  }

  // Main Game View
  return (
    <div className="h-[100dvh] w-full flex flex-col overflow-hidden bg-theme-bg text-theme-text font-sans transition-colors duration-1000 relative">
      {/* Global Styles based on theme */}
      <style>{`
        :root {
          --theme-bg: ${currentThemeConfig.vars['--theme-bg']};
          --theme-surface: ${currentThemeConfig.vars['--theme-surface']};
          --theme-surface-highlight: ${currentThemeConfig.vars['--theme-surface-highlight']};
          --theme-border: ${currentThemeConfig.vars['--theme-border']};
          --theme-primary: ${currentThemeConfig.vars['--theme-primary']};
          --theme-primary-hover: ${currentThemeConfig.vars['--theme-primary-hover']};
          --theme-text: ${currentThemeConfig.vars['--theme-text']};
          --theme-muted: ${currentThemeConfig.vars['--theme-muted']};
        }
      `}</style>

      {/* Environmental Overlay - Placed underneath interactive elements but above background */}
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
          <Suspense fallback={<div className="w-full h-full bg-theme-bg transition-colors duration-1000"></div>}>
              <EnvironmentalEffects
                  currentText={effectText}
                  imagePrompt={effectPrompt}
                  theme={gameState.theme}
              />
          </Suspense>
      </div>

      <div className="flex flex-1 h-full overflow-hidden relative z-10">

        {/* Desktop Sidebar (Hidden on Mobile) */}
        <div className="hidden md:flex w-80 border-r border-theme-border bg-theme-surface/90 backdrop-blur shrink-0 relative z-20">
           <Sidebar
             gameState={gameState}
             language={language}
             setLanguage={setLanguage}
             isTranslating={isTranslating}
             onCloseMobile={() => {}}
             onMagicMirror={() => setIsMagicMirrorOpen(true)}
             onNewGame={() => setView('start')}
             onSettings={() => setIsSettingsOpen(true)}
             onOpenSaves={() => setIsSaveManagerOpen(true)}
             onOpenMap={() => setIsDestinyMapOpen(true)}
             onOpenLogs={() => setIsLogPanelOpen(true)}
           />
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col relative h-full min-w-0">

           {/* Mobile View Switching Logic */}
           <div className="flex-1 flex flex-col h-full overflow-hidden relative">
              {/* 1. Story Feed View (Visible if tab=story or on Desktop) */}
              <div className={`flex-1 flex flex-col h-full w-full absolute inset-0 transition-opacity duration-300 ${mobileTab === 'story' ? 'z-10 opacity-100 pointer-events-auto' : 'md:opacity-100 md:pointer-events-auto opacity-0 pointer-events-none'}`}>
                 <StoryFeed
                   gameState={gameState}
                   currentHistory={currentHistory}
                   language={language}
                   layout={feedLayout}
                   setLayout={setFeedLayout}
                   onAnimate={(url) => {
                      setMagicMirrorImage(url);
                      setIsMagicMirrorOpen(true);
                   }}
                   onRetry={() => handleAction(currentHistory[currentHistory.length - 1]?.text || 'Retry')}
                   disableImages={aiSettings.image.enabled === false}
                   onFork={handleFork}
                 />

                 {/* Action Panel fixed at bottom of feed */}
                 <div className="flex-none z-30 pb-16 md:pb-0"> {/* Padding for Mobile Nav */}
                    <ActionPanel
                      gameState={gameState}
                      currentHistory={currentHistory}
                      language={language}
                      isTranslating={isTranslating}
                      onAction={handlePlayerAction}
                    />
                 </div>
              </div>

              {/* 2. Status/Sidebar View (Mobile Only) */}
              <div className={`flex-1 flex flex-col h-full w-full absolute inset-0 bg-theme-bg z-20 transition-transform duration-300 md:hidden ${mobileTab === 'status' ? 'translate-x-0' : 'translate-x-full'}`}>
                  <Sidebar
                     gameState={gameState}
                     language={language}
                     setLanguage={setLanguage}
                     isTranslating={isTranslating}
                     onCloseMobile={() => setMobileTab('story')}
                     onMagicMirror={() => setIsMagicMirrorOpen(true)}
                     onNewGame={() => setView('start')}
                     onSettings={() => setIsSettingsOpen(true)}
                     onOpenSaves={() => setIsSaveManagerOpen(true)}
                     onOpenMap={() => setIsDestinyMapOpen(true)}
                     onOpenLogs={() => setIsLogPanelOpen(true)}
                  />
                  <div className="h-16 flex-none"></div> {/* Spacer for Mobile Nav */}
              </div>

              {/* 3. Menu Grid View (Mobile Only) */}
               <div className={`flex-1 flex flex-col h-full w-full absolute inset-0 bg-theme-bg z-20 transition-transform duration-300 md:hidden ${mobileTab === 'menu' ? 'translate-x-0' : 'translate-x-full'}`}>
                  <div className="p-6">
                     <h2 className={`text-2xl text-theme-primary ${currentThemeConfig.fontClass} mb-8`}>{t.menu}</h2>
                     <div className="grid grid-cols-2 gap-4">
                        <button onClick={() => setIsDestinyMapOpen(true)} className="p-4 bg-theme-surface border border-theme-border rounded flex flex-col items-center gap-2 aspect-square justify-center hover:border-theme-primary transition-colors">
                            <svg className="w-8 h-8 text-theme-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 7m0 13V7"></path></svg>
                            <span className="text-sm font-bold uppercase">{t.tree.map}</span>
                        </button>
                        <button onClick={() => setIsSaveManagerOpen(true)} className="p-4 bg-theme-surface border border-theme-border rounded flex flex-col items-center gap-2 aspect-square justify-center hover:border-theme-primary transition-colors">
                            <svg className="w-8 h-8 text-theme-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"></path></svg>
                            <span className="text-sm font-bold uppercase">{t.saves.title}</span>
                        </button>
                        <button onClick={() => setIsSettingsOpen(true)} className="p-4 bg-theme-surface border border-theme-border rounded flex flex-col items-center gap-2 aspect-square justify-center hover:border-theme-primary transition-colors">
                            <svg className="w-8 h-8 text-theme-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                            <span className="text-sm font-bold uppercase">{t.settings}</span>
                        </button>
                        <button onClick={() => setIsLogPanelOpen(true)} className="p-4 bg-theme-surface border border-theme-border rounded flex flex-col items-center gap-2 aspect-square justify-center hover:border-theme-primary transition-colors">
                            <svg className="w-8 h-8 text-theme-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                            <span className="text-sm font-bold uppercase">Logs</span>
                        </button>
                        <button onClick={() => { setIsMagicMirrorOpen(true); }} className="p-4 bg-theme-surface border border-theme-border rounded flex flex-col items-center gap-2 aspect-square justify-center hover:border-theme-primary transition-colors">
                            <svg className="w-8 h-8 text-theme-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>
                            <span className="text-sm font-bold uppercase">Magic Mirror</span>
                        </button>
                         <button onClick={() => { if(window.confirm(t.confirmNewGame)) setView('start'); }} className="col-span-2 p-4 bg-red-900/20 border border-red-900/50 rounded flex flex-row items-center gap-2 justify-center hover:bg-red-900/40 transition-colors mt-4">
                            <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7"></path></svg>
                            <span className="text-sm font-bold uppercase text-red-400">{t.newGame} / {t.cancel}</span>
                        </button>
                     </div>
                  </div>
                   <div className="h-16 flex-none"></div> {/* Spacer for Mobile Nav */}
               </div>
           </div>
        </div>

        {/* Desktop Timeline (Hidden on Mobile/Tablet) */}
        <div className="hidden xl:flex shrink-0 z-10">
           <Suspense fallback={<div className="w-72 bg-theme-surface/30 animate-pulse"></div>}>
             <StoryTimeline
                segments={currentHistory}
                theme={gameState.theme}
                language={language}
             />
           </Suspense>
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileNav
        currentTab={mobileTab}
        setTab={setMobileTab}
        language={language}
      />

      {/* Modals (Lazy Loaded) */}
      <Suspense fallback={<LoadingFallback />}>
        <MagicMirror
          isOpen={isMagicMirrorOpen}
          onClose={() => setIsMagicMirrorOpen(false)}
          initialImage={magicMirrorImage}
          language={language}
          themeFont={currentThemeConfig.fontClass}
        />

        <SettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          language={language}
          currentSettings={aiSettings}
          onSave={handleSaveSettings}
          themeFont={currentThemeConfig.fontClass}
          showToast={showToast}
        />

        {isSaveManagerOpen && (
           <SaveManager
              slots={saveSlots}
              currentSlotId={currentSlotId}
              onSwitch={switchSlot}
              onDelete={deleteSlot}
              onClose={() => setIsSaveManagerOpen(false)}
              language={language}
           />
        )}

        {isDestinyMapOpen && (
           <DestinyMap
              gameState={gameState}
              language={language}
              onNavigate={(nodeId) => {
                  navigateToNode(nodeId);
                  setMobileTab('story');
              }}
              onClose={() => setIsDestinyMapOpen(false)}
           />
        )}

        {isLogPanelOpen && (
          <LogPanel
            logs={gameState.logs}
            onClose={() => setIsLogPanelOpen(false)}
          />
        )}
      </Suspense>

      <Toast show={isAutoSaving || notification.show} message={notification.show ? notification.msg : t.autoSaving} type={notification.type} />
    </div>
  );
}
