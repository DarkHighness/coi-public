
import React, { useState } from 'react';
import { LanguageCode } from '../../types';
import { TRANSLATIONS } from '../../utils/constants';

interface QuestPanelProps {
  quest: string;
  language: LanguageCode;
  themeFont: string;
}

export const QuestPanel: React.FC<QuestPanelProps> = ({ quest, language, themeFont }) => {
  const t = TRANSLATIONS[language];
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="mb-6">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full text-left text-theme-primary uppercase text-xs font-bold tracking-widest mb-4 flex items-center justify-between group ${themeFont}`}
      >
        <span className="flex items-center">
          <span className="w-2 h-2 bg-theme-primary rounded-full mr-2 animate-pulse"></span>
          {t.quest}
        </span>
        <svg className={`w-4 h-4 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
      </button>
      
      <div className={`transition-all duration-500 ease-in-out overflow-hidden ${isOpen ? 'max-h-48 opacity-100' : 'max-h-0 opacity-0'}`}>
        <div className="bg-theme-surface-highlight/50 p-4 rounded border border-theme-border text-theme-text text-sm leading-relaxed italic border-l-4 border-l-theme-primary">
          {quest}
        </div>
      </div>
    </div>
  );
};
