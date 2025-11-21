
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Quest } from '../../types';

interface QuestPanelProps {
  quests: Quest[];
  themeFont: string;
}

export const QuestPanel: React.FC<QuestPanelProps> = ({ quests, themeFont }) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(true);
  const [expandedQuests, setExpandedQuests] = useState<Set<string>>(new Set());

  const activeQuests = quests.filter(q => q.status === 'active' && q.type !== 'hidden');
  const mainQuests = activeQuests.filter(q => q.type === 'main');
  const sideQuests = activeQuests.filter(q => q.type === 'side');

  const toggleQuest = (questId: string) => {
    setExpandedQuests(prev => {
      const newSet = new Set(prev);
      if (newSet.has(questId)) {
        newSet.delete(questId);
      } else {
        newSet.add(questId);
      }
      return newSet;
    });
  };

  return (
    <div className="mb-6">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full text-left text-theme-primary uppercase text-xs font-bold tracking-widest mb-4 flex items-center justify-between group ${themeFont}`}
      >
        <span className="flex items-center">
          <span className="w-2 h-2 bg-theme-primary rounded-full mr-2 animate-pulse"></span>
          {t('questPanel.title')}
        </span>
        <svg className={`w-4 h-4 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
      </button>

      <div className={`transition-all duration-500 ease-in-out overflow-hidden ${isOpen ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}>
        <div className="space-y-4">
           {/* Main Quests */}
           {mainQuests.map(q => (
             <div
               key={q.id}
               className="bg-theme-surface-highlight/50 p-4 rounded border border-theme-border text-theme-text text-sm leading-relaxed border-l-4 border-l-theme-primary relative group cursor-pointer hover:bg-theme-surface-highlight/70 transition-colors"
               onClick={() => toggleQuest(q.id)}
             >
                <div className="absolute -right-2 -top-2 opacity-0 group-hover:opacity-100 transition-opacity bg-theme-bg border border-theme-primary text-[10px] px-1 rounded text-theme-primary uppercase">{t('questPanel.main')}</div>
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-theme-primary mb-1 flex-1">{q.title}</h4>
                  <svg className={`w-4 h-4 text-theme-primary transition-transform duration-200 ${expandedQuests.has(q.id) ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                </div>
                {expandedQuests.has(q.id) && (
                  <p className="italic opacity-90 mt-2 animate-[fade-in_0.3s_ease-in]">{q.description}</p>
                )}
             </div>
           ))}

           {/* Side Quests */}
           {sideQuests.length > 0 && (
             <div className="space-y-2">
                <h5 className="text-[10px] uppercase text-theme-muted tracking-widest border-b border-theme-border pb-1">{t('questPanel.side')}</h5>
                {sideQuests.map(q => (
                   <div
                     key={q.id}
                     className="bg-theme-surface/30 p-3 rounded border border-theme-border/50 text-xs text-theme-muted hover:text-theme-text transition-colors cursor-pointer hover:bg-theme-surface/50"
                     onClick={() => toggleQuest(q.id)}
                   >
                      <div className="flex items-center justify-between">
                        <h4 className="font-bold mb-0.5 flex-1">{q.title}</h4>
                        <svg className={`w-3 h-3 transition-transform duration-200 ${expandedQuests.has(q.id) ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                      </div>
                      {expandedQuests.has(q.id) && (
                        <p className="mt-2 animate-[fade-in_0.3s_ease-in]">{q.description}</p>
                      )}
                   </div>
                ))}
             </div>
           )}

           {activeQuests.length === 0 && (
             <p className="text-theme-muted text-sm italic p-2 text-center opacity-50">{t('questPanel.empty')}</p>
           )}
        </div>
      </div>
    </div>
  );
};
