
import React from 'react';
import { GameState, LanguageCode } from '../types';
import { LanguageSelector } from './LanguageSelector';
import { THEMES, TRANSLATIONS } from '../utils/constants';
import { CharacterPanel } from './sidebar/CharacterPanel';
import { QuestPanel } from './sidebar/QuestPanel';
import { InventoryPanel } from './sidebar/InventoryPanel';
import { RelationshipPanel } from './sidebar/RelationshipPanel';
import { LocationPanel } from './sidebar/LocationPanel';
import { SystemFooter } from './sidebar/SystemFooter';

interface SidebarProps {
  gameState: GameState;
  language: LanguageCode;
  setLanguage: (lang: LanguageCode) => void;
  isTranslating: boolean;
  onCloseMobile: () => void;
  onMagicMirror: () => void;
  onNewGame: () => void;
  onSettings: () => void;
  onOpenSaves: () => void;
  onOpenMap: () => void;
  onOpenLogs: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  gameState,
  language,
  setLanguage,
  isTranslating,
  onCloseMobile,
  onMagicMirror,
  onNewGame,
  onSettings,
  onOpenSaves,
  onOpenMap,
  onOpenLogs
}) => {
  const t = TRANSLATIONS[language];
  const currentThemeConfig = THEMES[gameState.theme] || THEMES.fantasy;
  const { character } = gameState;

  const itemContext = `Theme: ${gameState.theme}. Quest: ${gameState.currentQuest}. Location: ${gameState.currentLocation}.`;

  return (
    <div className="flex flex-col h-full relative">
      <div className="p-6 border-b border-theme-border bg-theme-surface/50 flex justify-between items-start shrink-0">
        <h1 className={`text-2xl text-theme-primary ${currentThemeConfig.fontClass} tracking-wider drop-shadow-sm`}>
          {t.titlePart1}
          <span className="block text-sm text-theme-muted font-sans tracking-normal mt-1">{t.titlePart2}</span>
        </h1>
        <div className="hidden md:block">
           <LanguageSelector language={language} setLanguage={setLanguage} disabled={isTranslating || gameState.isProcessing} />
        </div>
        <button className="md:hidden text-theme-text" onClick={onCloseMobile}>
           <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-8 scroll-smooth">
        {character && (
          <CharacterPanel 
            character={character} 
            language={language} 
            themeFont={currentThemeConfig.fontClass} 
          />
        )}
        <LocationPanel
          currentLocation={gameState.currentLocation}
          knownLocations={gameState.knownLocations}
          language={language}
          themeFont={currentThemeConfig.fontClass}
          itemContext={itemContext}
        />
        <QuestPanel 
          quest={gameState.currentQuest} 
          language={language} 
          themeFont={currentThemeConfig.fontClass} 
        />
        <RelationshipPanel 
          relationships={gameState.relationships || []} 
          language={language} 
          themeFont={currentThemeConfig.fontClass} 
        />
        <InventoryPanel 
          inventory={gameState.inventory || []} 
          language={language} 
          themeFont={currentThemeConfig.fontClass} 
          itemContext={itemContext} 
        />
      </div>
      
      {/* Status Bar */}
      <div className="bg-black/40 text-[10px] text-theme-muted py-1 px-6 flex justify-between items-center border-t border-theme-border/50 font-mono">
         <span>Tokens: {gameState.totalTokens.toLocaleString()}</span>
         <button onClick={onOpenLogs} className="hover:text-theme-primary underline">View Logs</button>
      </div>

      <div className="shrink-0 p-6 border-t border-theme-border bg-theme-surface/30 space-y-4">
         <button 
           onClick={onOpenMap}
           className="w-full py-2 text-sm bg-theme-surface-highlight/50 border border-theme-border hover:border-theme-primary text-theme-text rounded transition-colors flex items-center justify-center gap-2"
         >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 7m0 13V7"></path></svg>
            {t.tree.viewMap}
         </button>

         <SystemFooter 
           language={language}
           themeFont={currentThemeConfig.fontClass}
           onMagicMirror={onMagicMirror}
           onNewGame={onNewGame}
           onSave={onOpenSaves}
           onSettings={onSettings}
           onCloseMobile={onCloseMobile}
         />
      </div>
    </div>
  );
};
