
import React from 'react';
import { LanguageCode } from '../../types';
import { TRANSLATIONS } from '../../utils/constants';

interface StackControlsProps {
  onPrev: () => void;
  onNext: () => void;
  onLatest: () => void;
  activeIndex: number;
  totalSegments: number;
  language: LanguageCode;
}

export const StackControls: React.FC<StackControlsProps> = ({ onPrev, onNext, onLatest, activeIndex, totalSegments, language }) => {
  const t = TRANSLATIONS[language];

  return (
     <div className="bg-theme-surface/90 backdrop-blur border border-theme-border rounded-full p-2 shadow-xl flex items-center gap-2 transition-opacity duration-300 hover:opacity-100 opacity-90">
        <button 
           onClick={onPrev}
           disabled={activeIndex === 0}
           className="p-2 rounded-full hover:bg-theme-surface-highlight disabled:opacity-30 disabled:hover:bg-transparent text-theme-text transition-colors"
           title={t.previous}
        >
           <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg>
        </button>
        
        <span className="text-xs font-mono text-theme-muted w-12 text-center select-none">
           {activeIndex + 1}/{totalSegments}
        </span>

        <button 
           onClick={onNext}
           disabled={activeIndex === totalSegments - 1}
           className="p-2 rounded-full hover:bg-theme-surface-highlight disabled:opacity-30 disabled:hover:bg-transparent text-theme-text transition-colors"
           title={t.next}
        >
           <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
        </button>

        <div className="w-[1px] h-6 bg-theme-border mx-1"></div>

        <button 
           onClick={onLatest}
           disabled={activeIndex === totalSegments - 1}
           className="px-3 py-1 rounded hover:bg-theme-surface-highlight disabled:opacity-30 text-xs font-bold text-theme-primary uppercase tracking-wider transition-colors"
        >
           {t.latest}
        </button>
     </div>
  );
};
