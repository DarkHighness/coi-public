
import React from 'react';
import { useTranslation } from 'react-i18next';
import { FeedLayout } from '../../types';

interface FeedHeaderProps {
  layout: FeedLayout;
  setLayout: (layout: FeedLayout) => void;
  activeIndex: number;
  totalSegments: number;
  environment?: string;
  ambience?: string;
}

export const FeedHeader: React.FC<FeedHeaderProps> = ({ layout, setLayout, activeIndex, totalSegments, environment, ambience }) => {
  const { t } = useTranslation();

  return (
    <div className="flex-none p-2 flex justify-between items-center border-b border-theme-border bg-theme-surface/50 backdrop-blur-sm z-10">
       <div className="flex items-center space-x-4 text-xs font-bold uppercase tracking-widest">
          <div className="flex items-center space-x-2">
            <span className="text-theme-muted">{t('turn')}:</span>
            <span className="text-theme-primary">{layout === 'stack' ? `${activeIndex + 1} / ${totalSegments}` : totalSegments}</span>
          </div>

          {(environment || ambience) && (
             <div className="flex items-center space-x-2 md:space-x-3 border-l border-theme-border pl-2 md:pl-4 opacity-70 overflow-hidden">
                {environment && (
                   <div className="flex items-center space-x-1 max-w-[100px] md:max-w-[150px]" title={t('environment')}>
                      <span className="text-lg leading-none" role="img" aria-label="location">📍</span>
                      <span className="text-theme-text truncate text-xs md:text-sm">{environment}</span>
                   </div>
                )}
                {ambience && (
                   <div className="flex items-center space-x-1 max-w-[100px] md:max-w-[150px]" title={t('audioSettings.environment')}>
                      <span className="text-lg leading-none" role="img" aria-label="music">🎵</span>
                      <span className="text-theme-text truncate text-xs md:text-sm">{ambience}</span>
                   </div>
                )}
             </div>
          )}
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
