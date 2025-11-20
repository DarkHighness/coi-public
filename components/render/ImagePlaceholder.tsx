import React from 'react';

interface ImagePlaceholderProps {
  isLast: boolean;
  labelVision: string;
  labelUnavailable: string;
  themeFont?: string;
}

export const ImagePlaceholder: React.FC<ImagePlaceholderProps> = ({ isLast, labelVision, labelUnavailable, themeFont }) => (
  <div className="w-full h-full bg-theme-surface-highlight flex flex-col items-center justify-center">
    {isLast ? (
      <div className="flex flex-col items-center gap-3 animate-pulse">
          <div className="w-12 h-12 rounded-full border-2 border-theme-primary border-t-transparent animate-spin"></div>
          <span className={`text-theme-primary text-xs uppercase tracking-widest ${themeFont}`}>{labelVision}</span>
      </div>
    ) : (
      <span className="text-theme-muted text-sm italic opacity-50">{labelUnavailable}</span>
    )}
  </div>
);