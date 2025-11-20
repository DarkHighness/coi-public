
import React from 'react';
import { TypewriterText } from '../TypewriterText';
import { useStoryAudio } from '../../hooks/useStoryAudio';
import { TRANSLATIONS } from '../../utils/constants';
import { LanguageCode } from '../../types';
import { StoryTextHeader } from './StoryTextHeader';

interface StoryTextProps {
  text: string;
  isLast: boolean;
  language: LanguageCode;
  shouldAnimate?: boolean;
}

export const StoryText: React.FC<StoryTextProps> = ({ text, isLast, language, shouldAnimate = true }) => {
  const t = TRANSLATIONS[language];
  const { isPlaying, isLoadingAudio, playAudio } = useStoryAudio(text);

  return (
    <div className="relative px-2 md:px-6">
      {/* Decorative side line */}
      <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-gradient-to-b from-theme-primary/50 via-theme-primary/10 to-transparent opacity-50"></div>

      <StoryTextHeader 
        isPlaying={isPlaying}
        isLoading={isLoadingAudio}
        onPlay={playAudio}
        label={t.readAloud}
      />

      <div className="prose prose-invert prose-lg max-w-none text-theme-text leading-8 font-serif">
        {isLast ? (
           <TypewriterText 
             text={text} 
             speed={15} 
             instant={!shouldAnimate} 
           />
        ) : (
           <div className="whitespace-pre-line">{text}</div>
        )}
      </div>
    </div>
  );
};
