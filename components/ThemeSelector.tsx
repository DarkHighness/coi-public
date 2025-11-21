import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { THEMES } from '../utils/constants';

interface ThemeSelectorProps {
  themes: typeof THEMES;
  onSelect: (theme: string) => void;
  onHover: (theme: string) => void;
}

export const ThemeSelector: React.FC<ThemeSelectorProps> = ({
  themes,
  onSelect,
  onHover
}) => {
  const { t } = useTranslation();
  const themeKeys = Object.keys(themes);
  const [previewTheme, setPreviewTheme] = useState<string | null>(null);

  const handlePreview = (key: string) => {
    setPreviewTheme(key);
  };

  const closePreview = () => {
    setPreviewTheme(null);
  };

  const previewData = previewTheme ? themes[previewTheme] : null;
  const previewName = previewTheme ? t(`themes.${previewTheme}.name`) : '';

  return (
    <>
      <div className="w-full flex flex-col gap-3">
        {/* Theme Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pr-2 pb-20 md:pb-4">
          {/* Random Option */}
          <button
            onClick={() => onSelect('')}
            onMouseEnter={() => onHover('fantasy')}
            className="relative p-5 rounded-xl border-2 border-theme-primary/30 hover:border-theme-primary transition-all text-left group overflow-hidden bg-gradient-to-br from-theme-surface-highlight to-theme-bg hover:shadow-[0_0_20px_rgba(var(--theme-primary),0.3)]"
          >
             <div className="absolute top-4 right-4 text-4xl opacity-20 group-hover:scale-110 group-hover:opacity-30 transition-all">
               🎲
             </div>
             <div className="relative z-10">
               <div className="font-bold text-theme-primary uppercase tracking-wider text-lg mb-1">{t('randomTheme')}</div>
               <div className="text-sm text-theme-muted">{t('randomThemeDesc')}</div>
             </div>
          </button>

          {themeKeys.map((key) => {
            const theme = themes[key];
            const name = t(`themes.${key}.name`);
            const narrativeStyle = t(`themes.${key}.narrativeStyle`);

            return (
              <div
                key={key}
                role="button"
                tabIndex={0}
                onClick={() => onSelect(key)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    onSelect(key);
                  }
                }}
                onMouseEnter={() => onHover(key)}
                className="relative p-5 rounded-xl border border-theme-border hover:border-theme-primary transition-all text-left group overflow-hidden bg-theme-surface-highlight/20 hover:bg-theme-surface-highlight/40 cursor-pointer"
              >
                {/* Background Gradient */}
                <div
                  className="absolute inset-0 opacity-10 group-hover:opacity-20 transition-opacity duration-500"
                  style={{ background: `linear-gradient(135deg, ${theme.vars['--theme-primary']}, transparent)` }}
                ></div>

                {/* Content */}
                <div className="relative z-10 flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div
                      className="w-3 h-3 rounded-full mb-2"
                      style={{ backgroundColor: theme.vars['--theme-primary'], boxShadow: `0 0 10px ${theme.vars['--theme-primary']}` }}
                    ></div>
                    <h4 className={`font-bold uppercase tracking-wide text-sm leading-tight text-theme-text group-hover:text-theme-primary transition-colors ${theme.fontClass}`}>
                      {name}
                    </h4>
                    <p className="text-xs text-theme-muted mt-1 line-clamp-2">
                      {narrativeStyle?.split('.')[0]}
                    </p>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col gap-2 shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePreview(key);
                      }}
                      className="p-2 rounded-lg bg-theme-bg/50 border border-theme-border hover:border-theme-primary hover:bg-theme-surface transition-all"
                      title={t('themePreview')}
                    >
                      <svg className="w-4 h-4 text-theme-muted hover:text-theme-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                      </svg>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelect(key);
                      }}
                      className="p-2 rounded-lg bg-theme-primary/10 border border-theme-primary hover:bg-theme-primary hover:text-theme-bg transition-all"
                      title={t('themeStart')}
                    >
                      <svg className="w-4 h-4 text-theme-primary group-hover:text-theme-bg" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path>
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Preview Modal */}
      {previewTheme && previewData && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in"
          onClick={closePreview}
        >
          <div
            className="bg-theme-surface border border-theme-border rounded-2xl shadow-2xl max-w-3xl w-full mx-4 max-h-[85vh] overflow-hidden flex flex-col animate-slide-in"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Dynamic Background */}
            <div
              className="absolute inset-0 opacity-10"
              style={{ background: `linear-gradient(135deg, ${previewData.vars['--theme-primary']}, transparent)` }}
            ></div>

            {/* Header */}
            <div className="relative z-10 p-6 border-b border-theme-border flex items-center justify-between">
              <div>
                <h2 className={`text-3xl font-bold uppercase tracking-tighter text-white bg-clip-text bg-gradient-to-r from-theme-text to-theme-muted ${previewData.fontClass}`}>
                  {previewName}
                </h2>
                <div className="mt-1 flex items-center gap-2">
                  <div className="h-px flex-1 max-w-24 bg-gradient-to-r from-theme-primary/50 to-transparent"></div>
                  <span className="text-xs text-theme-primary uppercase tracking-[0.2em] font-bold">{t('themePreview')}</span>
                </div>
              </div>
              <button
                onClick={closePreview}
                className="p-2 text-theme-muted hover:text-theme-text transition-colors rounded-full hover:bg-theme-surface-highlight"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="relative z-10 flex-1 p-6 overflow-y-auto custom-scrollbar space-y-4">
              <div>
                <h3 className="text-xs text-theme-primary uppercase tracking-[0.2em] font-bold mb-2">{t('narrativeStyle')}</h3>
                <p className="text-theme-muted italic text-base leading-relaxed">
                  "{t(`themes.${previewTheme}.narrativeStyle`)}"
                </p>
              </div>

              <div className="bg-theme-bg/50 p-6 rounded-lg border border-theme-border/50 relative">
                <div className="absolute -top-3 -left-3 text-4xl text-theme-primary/20 font-serif">"</div>
                <p className={`text-theme-text/90 leading-loose ${previewData.fontClass === 'font-serif' ? 'font-serif text-lg' : 'font-sans'}`}>
                  {t(`themes.${previewTheme}.example`)}
                </p>
                <div className="absolute -bottom-3 -right-3 text-4xl text-theme-primary/20 font-serif rotate-180">"</div>
              </div>
            </div>

            {/* Footer */}
            <div className="relative z-10 p-6 border-t border-theme-border">
              <button
                onClick={() => {
                  onSelect(previewTheme);
                  closePreview();
                }}
                className="w-full py-4 bg-theme-primary text-theme-bg font-bold text-xl uppercase tracking-widest hover:bg-theme-primary-hover transition-all shadow-[0_0_20px_rgba(var(--theme-primary),0.4)] hover:scale-[1.02] rounded-lg flex items-center justify-center gap-3"
              >
                <span>{t('startThisAdventure')}</span>
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6"></path>
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
