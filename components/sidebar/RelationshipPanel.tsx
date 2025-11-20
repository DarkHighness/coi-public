
import React, { useState } from 'react';
import { Relationship, LanguageCode } from '../../types';
import { TRANSLATIONS } from '../../utils/constants';

interface RelationshipPanelProps {
  relationships: Relationship[];
  language: LanguageCode;
  themeFont: string;
}

export const RelationshipPanel: React.FC<RelationshipPanelProps> = ({ relationships = [], language, themeFont }) => {
  const t = TRANSLATIONS[language];
  const [isOpen, setIsOpen] = useState(true);

  const safeRelationships = Array.isArray(relationships) ? relationships : [];

  const getAffinityColor = (val: number) => {
    if (val >= 80) return 'bg-green-500'; // Love/Loyal
    if (val >= 60) return 'bg-blue-400'; // Friendly
    if (val >= 40) return 'bg-yellow-500'; // Neutral
    if (val >= 20) return 'bg-orange-500'; // Dislike
    return 'bg-red-600'; // Hated/Enemy
  };

  return (
    <div className="mb-6">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full text-left text-theme-primary uppercase text-xs font-bold tracking-widest mb-4 flex items-center justify-between group ${themeFont}`}
      >
         <span className="flex items-center">
           <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
           {t.relationships}
         </span>
         <div className="flex items-center gap-2">
           <span className="text-[10px] text-theme-muted bg-theme-surface-highlight px-1.5 rounded border border-theme-border">{safeRelationships.length}</span>
           <svg className={`w-4 h-4 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
         </div>
      </button>

      <div className={`transition-all duration-500 ease-in-out overflow-hidden ${isOpen ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0'}`}>
        <div className="space-y-3">
          {safeRelationships.length === 0 ? (
            <p className="text-theme-muted text-sm italic p-2 border border-dashed border-theme-border rounded text-center opacity-50">{t.emptyRelationships}</p>
          ) : (
            safeRelationships.map((rel, idx) => {
              const isUnknown = rel.affinityKnown === false;
              
              return (
                <div key={idx} className="bg-theme-surface-highlight/30 p-3 rounded border border-theme-border hover:border-theme-primary/30 transition-colors">
                   <div className="flex justify-between items-center mb-1">
                      <span className="font-bold text-theme-text text-sm">{rel.name}</span>
                      <span className="text-[10px] uppercase tracking-wider bg-theme-bg px-2 py-0.5 rounded text-theme-primary border border-theme-border">{rel.status}</span>
                   </div>
                   <p className="text-xs text-theme-muted italic mb-2 leading-snug">{rel.description}</p>
                   
                   {/* Affinity Bar */}
                   <div className="flex items-center gap-2 text-[10px]">
                      <span className="text-theme-muted">{t.affinity}</span>
                      <div className="flex-1 h-1.5 bg-theme-bg rounded-full overflow-hidden border border-theme-border/50 relative">
                         {isUnknown ? (
                            <div className="w-full h-full bg-[url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAYAAACp8Z5+AAAAIklEQVQIW2NkQAKrVq36zwjjgzhhYWGMYAEYB8RmROaABADeOQ8CXl/xfgAAAABJRU5ErkJggg==')] opacity-20"></div>
                         ) : (
                           <div 
                             className={`h-full ${getAffinityColor(rel.affinity)} transition-all duration-500`} 
                             style={{ width: `${rel.affinity}%` }}
                           ></div>
                         )}
                      </div>
                      <span className="text-theme-text w-8 text-right font-mono">
                        {isUnknown ? t.unknown : `${rel.affinity}%`}
                      </span>
                   </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
