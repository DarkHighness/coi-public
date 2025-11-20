import React from 'react';
import { TRANSLATIONS } from '../../utils/constants';
import { LanguageCode } from '../../types';
import { ItemLore } from './ItemLore';

interface ItemDetails {
  description: string;
  lore: string;
}

interface InventoryItemDetailProps {
  loading: boolean;
  details: ItemDetails | null;
  language: string;
}

export const InventoryItemDetail: React.FC<InventoryItemDetailProps> = ({ loading, details, language }) => {
  const t = TRANSLATIONS[language as LanguageCode] || TRANSLATIONS.en;
  
  const showMoreLabel = language === 'zh' ? '展开' : 'Show More';
  const showLessLabel = language === 'zh' ? '收起' : 'Show Less';

  if (loading) {
    return (
      <span className="flex items-center gap-2 animate-pulse py-2">
        <svg className="animate-spin h-4 w-4 text-theme-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <span className="text-theme-muted text-xs">{t.consultingArchives}</span>
      </span>
    );
  }

  if (!details) return null;

  return (
    <div className="space-y-3">
      <p className="leading-relaxed">{details.description}</p>
      {details.lore && (
        <ItemLore 
            lore={details.lore} 
            labelHistory={t.history}
            labelShowMore={showMoreLabel}
            labelShowLess={showLessLabel}
        />
      )}
    </div>
  );
};