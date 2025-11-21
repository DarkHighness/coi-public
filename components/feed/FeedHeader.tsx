
import React from 'react';
import { useTranslation } from 'react-i18next';
import { FeedLayout } from '../../types';

interface FeedHeaderProps {
  layout: FeedLayout;
  setLayout: (layout: FeedLayout) => void;
  activeIndex: number;
  totalSegments: number;
}

export const FeedHeader: React.FC<FeedHeaderProps> = ({ layout, setLayout, activeIndex, totalSegments }) => {
  const { t } = useTranslation();

  return (
    <div className="flex-none p-2 flex justify-between items-center border-b border-theme-border bg-theme-surface/50 backdrop-blur-sm z-10">
       <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-widest">
          <span className="text-theme-muted">{t('turn')}:</span>
          <span className="text-theme-primary">{layout === 'stack' ? `${activeIndex + 1} / ${totalSegments}` : totalSegments}</span>
       </div>

       <div className="flex bg-theme-surface-highlight rounded border border-theme-border p-1">
          <button
            onClick={() => setLayout('scroll')}
            className={`px-3 py-1 text-xs rounded transition-colors ${layout === 'scroll' ? 'bg-theme-primary text-theme-bg font-bold' : 'text-theme-muted hover:text-theme-text'}`}
          >
             {t('scroll')}
          </button>
          <button
            onClick={() => setLayout('stack')}
            className={`px-3 py-1 text-xs rounded transition-colors ${layout === 'stack' ? 'bg-theme-primary text-theme-bg font-bold' : 'text-theme-muted hover:text-theme-text'}`}
          >
             {t('stack')}
          </button>
       </div>
    </div>
  );
};
