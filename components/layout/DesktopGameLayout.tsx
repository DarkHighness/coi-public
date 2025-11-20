import React, { Suspense } from 'react';
import { GameState, LanguageCode, FeedLayout } from '../../types';
import { StoryFeed } from '../StoryFeed';
import { ActionPanel } from '../ActionPanel';
import { Sidebar } from '../Sidebar';
import { StoryTimeline } from '../StoryTimeline';

interface DesktopGameLayoutProps {
  gameState: GameState;
  currentHistory: any[];
  language: LanguageCode;
  setLanguage: (lang: LanguageCode) => void;
  isTranslating: boolean;
  feedLayout: FeedLayout;
  setFeedLayout: (layout: FeedLayout) => void;
  onAnimate: (url: string) => void;
  onGenerateImage: (nodeId: string) => void;
  onRetry: () => void;
  onFork: (nodeId: string) => void;
  onAction: (action: string) => Promise<void>;
  onNewGame: () => void;
  onMagicMirror: () => void;
  onSettings: () => void;
  onOpenSaves: () => void;
  onOpenMap: () => void;
  onOpenLogs: () => void;
  aiSettings: any;
  onTypingComplete?: () => void;
}

export const DesktopGameLayout: React.FC<DesktopGameLayoutProps> = ({
  gameState,
  currentHistory,
  language,
  setLanguage,
  isTranslating,
  feedLayout,
  setFeedLayout,
  onAnimate,
  onGenerateImage,
  onRetry,
  onFork,
  onAction,
  onNewGame,
  onMagicMirror,
  onSettings,
  onOpenSaves,
  onOpenMap,
  onOpenLogs,
  aiSettings,
  onTypingComplete
}) => {
  return (
    <div className="hidden md:flex flex-1 h-full overflow-hidden relative z-10">
      {/* Desktop Sidebar */}
      <div className="w-80 border-r border-theme-border bg-theme-surface/90 backdrop-blur shrink-0 relative z-20">
         <Sidebar
           gameState={gameState}
           language={language}
           setLanguage={setLanguage}
           isTranslating={isTranslating}
           onCloseMobile={() => {}}
           onMagicMirror={onMagicMirror}
           onNewGame={onNewGame}
           onSettings={onSettings}
           onOpenSaves={onOpenSaves}
           onOpenMap={onOpenMap}
           onOpenLogs={onOpenLogs}
         />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col relative h-full min-w-0">
         <div className="flex-1 flex flex-col h-full overflow-hidden relative">
             <StoryFeed
               gameState={gameState}
               currentHistory={currentHistory}
               language={language}
               layout={feedLayout}
               setLayout={setFeedLayout}
               onAnimate={onAnimate}
               onGenerateImage={onGenerateImage}
               onRetry={onRetry}
               disableImages={aiSettings.image.enabled === false}
               onFork={onFork}
               aiSettings={aiSettings}
               onTypingComplete={onTypingComplete}
             />

             {/* Action Panel */}
             <div className="flex-none z-30">
                <ActionPanel
                  gameState={gameState}
                  currentHistory={currentHistory}
                  language={language}
                  isTranslating={isTranslating}
                  onAction={onAction}
                />
             </div>
         </div>
      </div>

      {/* Desktop Timeline */}
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
  );
};
