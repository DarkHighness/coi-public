import React from 'react';
import { MagicMirrorButton } from './MagicMirrorButton';
import { ImagePlaceholder } from './ImagePlaceholder';

interface StoryImageProps {
  imageUrl?: string;
  isLast: boolean;
  labelVision: string;
  labelUnavailable: string;
  onAnimate?: (url: string) => void;
  disableImages: boolean;
  themeFont?: string;
}

export const StoryImage: React.FC<StoryImageProps> = ({
  imageUrl,
  isLast,
  labelVision,
  labelUnavailable,
  onAnimate,
  disableImages,
  themeFont
}) => {
  if (disableImages) return null;

  return (
    <div className="relative w-full aspect-video rounded-sm overflow-hidden shadow-2xl border-2 border-theme-border bg-black group">
      {imageUrl ? (
         <>
           <img 
             src={imageUrl} 
             alt="Scene visualization" 
             className="w-full h-full object-cover transition-transform duration-[2000ms] ease-in-out group-hover:scale-105 opacity-90 hover:opacity-100"
           />
           <div className="absolute inset-0 bg-gradient-to-t from-theme-bg via-transparent to-transparent opacity-30 pointer-events-none"></div>
           
           {onAnimate && <MagicMirrorButton onAnimate={() => onAnimate(imageUrl)} />}
         </>
      ) : (
        <ImagePlaceholder 
          isLast={isLast}
          labelVision={labelVision}
          labelUnavailable={labelUnavailable}
          themeFont={themeFont}
        />
      )}
    </div>
  );
};