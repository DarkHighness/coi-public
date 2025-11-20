
import React, { useState, useRef } from 'react';
import { LanguageCode } from '../types';
import { LanguageSelector } from './LanguageSelector';
import { THEMES, TRANSLATIONS } from '../utils/constants';

interface StartScreenProps {
  language: LanguageCode;
  setLanguage: (lang: LanguageCode) => void;
  onStart: (theme: string, customContext?: string) => void;
  onContinue: () => void;
  onLoad: (file: File) => void;
  onSettings: () => void;
  hasSave: boolean;
}

export const StartScreen: React.FC<StartScreenProps> = ({
  language,
  setLanguage,
  onStart,
  onContinue,
  onLoad,
  onSettings,
  hasSave
}) => {
  const [mode, setMode] = useState<'main' | 'theme_select'>('main');
  const [hoveredTheme, setHoveredTheme] = useState<string>('fantasy');
  const [customContext, setCustomContext] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const t = TRANSLATIONS[language];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onLoad(file);
  };

  // Dynamic background style based on hovered theme
  const activeThemeVar = THEMES[hoveredTheme]?.vars['--theme-primary'] || '#f59e0b';

  return (
    <div className="relative h-[100dvh] w-full overflow-hidden flex flex-col lg:flex-row bg-theme-bg text-theme-text font-sans transition-colors duration-1000">
      
      {/* Global Background Effect */}
      <div 
        className="absolute inset-0 z-0 transition-colors duration-1000 ease-linear opacity-20"
        style={{ background: `radial-gradient(circle at 20% 50%, ${activeThemeVar}, transparent 70%)` }}
      ></div>
      <div className="absolute inset-0 z-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-10 animate-pulse"></div>

      {/* Left Panel: Branding & Atmosphere */}
      <div className="relative z-10 lg:w-6/12 h-1/3 lg:h-full flex flex-col justify-center p-8 lg:p-20 pointer-events-none">
        <div className="space-y-4 lg:space-y-6 animate-fade-in-up">
           <h1 className="text-5xl lg:text-8xl font-fantasy tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-theme-text to-theme-muted drop-shadow-lg">
             {t.titlePart1}
           </h1>
           <h2 className="text-3xl lg:text-6xl font-scifi uppercase tracking-[0.2em] text-theme-primary/80">
             {t.titlePart2}
           </h2>
           <p className="hidden lg:block text-lg text-theme-muted max-w-md border-l-4 border-theme-primary pl-6 italic mt-8">
             "Every choice ripples through infinity. Where will your story begin?"
           </p>
        </div>
      </div>

      {/* Right Panel: Interaction */}
      <div className="relative z-20 lg:w-6/12 h-2/3 lg:h-full bg-theme-surface/80 backdrop-blur-xl border-t lg:border-t-0 lg:border-l border-theme-border/50 shadow-2xl flex flex-col">
        
        {/* Top Bar */}
        <div className="flex justify-end items-center gap-4 p-6 lg:p-8">
           <button 
             onClick={onSettings}
             className="p-2 text-theme-muted hover:text-theme-primary transition-colors rounded-full hover:bg-theme-surface-highlight/50"
             title={t.settings}
           >
             <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
           </button>
           <LanguageSelector language={language} setLanguage={setLanguage} />
        </div>

        {/* Menu Content */}
        <div className="flex-1 flex flex-col justify-center px-8 lg:px-16 max-w-xl mx-auto w-full space-y-8 pb-12 overflow-y-auto">
          
          {mode === 'main' ? (
            <div className="space-y-4 animate-slide-in">
              {hasSave && (
                <button 
                  onClick={onContinue}
                  className="w-full py-5 bg-theme-primary text-theme-bg font-bold text-xl uppercase tracking-widest hover:bg-theme-primary-hover transition-all shadow-[0_0_30px_rgba(var(--theme-primary),0.4)] hover:scale-105 transform rounded-sm border border-transparent"
                >
                  {t.continueGame}
                </button>
              )}

              <button 
                onClick={() => setMode('theme_select')}
                className={`w-full py-4 border-2 border-theme-text/10 hover:border-theme-primary text-theme-text font-bold text-lg uppercase tracking-widest hover:bg-theme-surface-highlight transition-all rounded-sm flex items-center justify-center gap-3 group ${!hasSave ? 'bg-theme-primary text-theme-bg border-theme-primary hover:bg-theme-primary-hover hover:border-theme-primary-hover' : ''}`}
              >
                <span>{t.startTitle}</span>
                <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
              </button>

              <div className="pt-6 flex justify-center">
                <button 
                   onClick={() => fileInputRef.current?.click()}
                   className="text-theme-muted hover:text-theme-text text-sm uppercase tracking-wide transition-colors flex items-center gap-2 border-b border-transparent hover:border-theme-muted"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg>
                  {t.loadGame}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-6 animate-slide-in pb-8">
              <div className="flex items-center gap-4 mb-2">
                 <button onClick={() => setMode('main')} className="text-theme-muted hover:text-theme-text transition-colors">
                   <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
                 </button>
                 <h3 className="text-sm uppercase tracking-widest text-theme-muted">{t.selectTheme}</h3>
              </div>
              
              {/* Custom Context Input */}
              <div className="mb-6">
                 <label className="block text-xs text-theme-primary uppercase tracking-widest font-bold mb-2">{t.customContext}</label>
                 <textarea 
                    value={customContext}
                    onChange={(e) => setCustomContext(e.target.value)}
                    placeholder={t.customContextPlaceholder}
                    className="w-full bg-theme-surface-highlight/30 border border-theme-border rounded p-3 text-sm text-theme-text focus:border-theme-primary outline-none resize-none h-20 placeholder-theme-muted"
                 />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[50vh] overflow-y-auto pr-2 scroll-smooth">
                  <button
                    onMouseEnter={() => setHoveredTheme('fantasy')}
                    onClick={() => onStart('', customContext)}
                    className="col-span-full group relative overflow-hidden p-4 border border-theme-border hover:border-theme-primary text-center transition-all bg-gradient-to-r from-theme-surface-highlight to-transparent hover:from-theme-primary/10"
                  >
                     <span className="relative z-10 font-bold uppercase tracking-wider text-theme-text group-hover:text-theme-primary transition-colors">{t.randomTheme}</span>
                     <span className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity text-theme-primary">🎲</span>
                  </button>
                  
                  {Object.keys(THEMES).map((key) => (
                    <button
                      key={key}
                      onMouseEnter={() => setHoveredTheme(key)}
                      onClick={() => onStart(key, customContext)}
                      className="group relative overflow-hidden p-3 border border-theme-border hover:border-theme-primary text-left transition-all bg-theme-surface-highlight/30 hover:bg-theme-surface-highlight"
                    >
                      <span className={`relative z-10 font-bold uppercase text-xs tracking-wider text-theme-text group-hover:text-theme-primary transition-colors ${THEMES[key].fontClass}`}>
                        {t.themes[key as keyof typeof t.themes] || THEMES[key].name}
                      </span>
                    </button>
                  ))}
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-6 text-center text-xs text-theme-muted/50 uppercase tracking-widest shrink-0">
          v1.0.1 • Powered by Gemini 3 Pro
        </div>
      </div>

      <input 
        type="file" 
        ref={fileInputRef} 
        className="hidden" 
        accept=".json,.gz" 
        onChange={handleFileChange} 
      />
    </div>
  );
};
