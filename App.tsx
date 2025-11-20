import React, { useState, useRef, useEffect, Suspense } from 'react';
import { useGameEngine } from './hooks/useGameEngine';
import { StartScreen } from './components/StartScreen';
import { Toast } from './components/Toast';
import { THEMES, TRANSLATIONS } from './utils/constants';
import { FeedLayout } from './types';
import { MobileNav, MobileTab } from './components/MobileNav';
import { getEnvApiKey } from './utils/env';
import { validateConnection } from './services/geminiService';
import { useAmbience } from './hooks/useAmbience';

// Lazy Load Heavy Components for Code Splitting
const MagicMirror = React.lazy(() => import('./components/MagicMirror').then(module => ({ default: module.MagicMirror })));
const SettingsModal = React.lazy(() => import('./components/SettingsModal').then(module => ({ default: module.SettingsModal })));
const SaveManager = React.lazy(() => import('./components/SaveManager').then(module => ({ default: module.SaveManager })));
const DestinyMap = React.lazy(() => import('./components/DestinyMap').then(module => ({ default: module.DestinyMap })));
const EnvironmentalEffects = React.lazy(() => import('./components/EnvironmentalEffects').then(module => ({ default: module.EnvironmentalEffects })));
const LogPanel = React.lazy(() => import('./components/sidebar/LogPanel').then(module => ({ default: module.LogPanel })));
const MobileGameLayout = React.lazy(() => import('./components/layout/MobileGameLayout').then(module => ({ default: module.MobileGameLayout })));
const DesktopGameLayout = React.lazy(() => import('./components/layout/DesktopGameLayout').then(module => ({ default: module.DesktopGameLayout })));

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
    navigateToNode,
    generateImageForNode
  } = useGameEngine();

  const [feedLayout, setFeedLayout] = useState<FeedLayout>('scroll');
  const [isSaveManagerOpen, setIsSaveManagerOpen] = useState(false);
  const [isDestinyMapOpen, setIsDestinyMapOpen] = useState(false);
  const [isLogPanelOpen, setIsLogPanelOpen] = useState(false);
  const [notification, setNotification] = useState<{show: boolean, msg: string, type: 'info' | 'error'}>({show: false, msg: '', type: 'info'});

  // Mobile Nav State
  const [mobileTab, setMobileTab] = useState<MobileTab>('story');

  // Typing State for Audio Control
  const [isTyping, setIsTyping] = useState(false);

  const t = TRANSLATIONS[language];
  const currentThemeConfig = THEMES[gameState.theme] || THEMES.fantasy;

  // Determine current context for effects
  const currentSegment = currentHistory[currentHistory.length - 1];

  // Reset typing state when a new model segment appears
  useEffect(() => {
    const last = currentHistory[currentHistory.length - 1];
    if (last?.role === 'model') {
        setIsTyping(true);
    } else {
        setIsTyping(false);
    }
  }, [currentHistory]);

  // Centralized Menu/View State Handler to ensure Audio stops
  const handleInterfaceState = (
      action: () => void,
      shouldStopAudio: boolean = true
  ) => {
      if (shouldStopAudio) {
          // Explicitly disable typing state to stop audio immediately
          // This acts as a "pause" for the scene flow
          setIsTyping(false);
      }
      action();
  };

  // Audio Ambience Logic
  // We rely on isTyping being false when menus are open (via handleInterfaceState)
  // But we also keep the reactive checks for safety
  const isAnyMenuOpen = isSettingsOpen || isSaveManagerOpen || isDestinyMapOpen || isLogPanelOpen || isMagicMirrorOpen;
  const shouldPlayAmbience = view === 'game' && isTyping && !isAnyMenuOpen && mobileTab === 'story';

  useAmbience(
    shouldPlayAmbience ? currentSegment?.environment : undefined,
    aiSettings.audioVolume?.bgmVolume ?? 0.5,
    aiSettings.audioVolume?.bgmMuted ?? false
  );

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
          // If we have a current slot loaded, just switch view
          if (currentSlotId) {
              setView('game');
          } else if (saveSlots.length > 0) {
              // Otherwise load the most recent slot
              // Sort by timestamp desc
              const sorted = [...saveSlots].sort((a, b) => b.timestamp - a.timestamp);
              const mostRecent = sorted[0];
              switchSlot(mostRecent.id);
              // switchSlot sets view to game automatically if successful
          } else {
              // No saves? Start new
              setView('start');
          }
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

          {/* Background Ambient Effect */}
          <div className="absolute inset-0 opacity-20 animate-pulse z-0 bg-gradient-to-b from-theme-primary/20 to-transparent"></div>

          <div className="relative z-10 flex flex-col items-center gap-8 animate-fade-in">
             <div className="relative">
                <div className="w-24 h-24 border-4 border-theme-primary/30 border-t-theme-primary rounded-full animate-spin shadow-[0_0_50px_rgba(var(--theme-primary),0.4)]"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                   <div className="w-16 h-16 bg-theme-primary/10 rounded-full animate-pulse"></div>
                </div>
             </div>

             <div className="text-center space-y-3">
                <h2 className={`text-3xl md:text-5xl ${currentThemeConfig.fontClass} tracking-widest uppercase text-transparent bg-clip-text bg-gradient-to-r from-theme-primary via-theme-text to-theme-primary animate-shimmer bg-[length:200%_auto]`}>
                  {t.outline.generating}
                </h2>
                <p className="text-theme-muted text-sm uppercase tracking-[0.2em] animate-pulse">{t.loading}</p>
             </div>
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
        <Suspense fallback={<LoadingFallback />}>
          <MobileGameLayout
            gameState={gameState}
            currentHistory={currentHistory}
            language={language}
            setLanguage={setLanguage}
            isTranslating={isTranslating}
            mobileTab={mobileTab}
            setMobileTab={setMobileTab}
            feedLayout={feedLayout}
            setFeedLayout={setFeedLayout}
            onAnimate={(url) => {
              setMagicMirrorImage(url);
              handleInterfaceState(() => setIsMagicMirrorOpen(true));
            }}
            onGenerateImage={generateImageForNode}
            onRetry={() => handleAction(currentHistory[currentHistory.length - 1]?.text || 'Retry')}
            onFork={handleFork}
            onAction={handlePlayerAction}
            onNewGame={() => handleInterfaceState(() => setView('start'))}
            onMagicMirror={() => handleInterfaceState(() => setIsMagicMirrorOpen(true))}
            onSettings={() => handleInterfaceState(() => setIsSettingsOpen(true))}
            onOpenSaves={() => handleInterfaceState(() => setIsSaveManagerOpen(true))}
            onOpenMap={() => handleInterfaceState(() => setIsDestinyMapOpen(true))}
            onOpenLogs={() => handleInterfaceState(() => setIsLogPanelOpen(true))}
            aiSettings={aiSettings}
            onTypingComplete={() => setIsTyping(false)}
          />

          <DesktopGameLayout
            gameState={gameState}
            currentHistory={currentHistory}
            language={language}
            setLanguage={setLanguage}
            isTranslating={isTranslating}
            feedLayout={feedLayout}
            setFeedLayout={setFeedLayout}
            onAnimate={(url) => {
              setMagicMirrorImage(url);
              handleInterfaceState(() => setIsMagicMirrorOpen(true));
            }}
            onGenerateImage={generateImageForNode}
            onRetry={() => handleAction(currentHistory[currentHistory.length - 1]?.text || 'Retry')}
            onFork={handleFork}
            onAction={handlePlayerAction}
            onNewGame={() => handleInterfaceState(() => setView('start'))}
            onMagicMirror={() => handleInterfaceState(() => setIsMagicMirrorOpen(true))}
            onSettings={() => handleInterfaceState(() => setIsSettingsOpen(true))}
            onOpenSaves={() => handleInterfaceState(() => setIsSaveManagerOpen(true))}
            onOpenMap={() => handleInterfaceState(() => setIsDestinyMapOpen(true))}
            onOpenLogs={() => handleInterfaceState(() => setIsLogPanelOpen(true))}
            aiSettings={aiSettings}
            onTypingComplete={() => setIsTyping(false)}
          />
        </Suspense>
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
