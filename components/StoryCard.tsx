
import React from 'react';
import { StorySegment, LanguageCode } from '../types';
import { TRANSLATIONS } from '../utils/constants';
import { StoryImage } from './render/StoryImage';
import { StoryText } from './render/StoryText';
import { UserActionCard } from './render/UserActionCard';
import { TokenStats } from './render/TokenStats';

interface StoryCardLabels {
  decided: string;
  vision: string;
  unavailable: string;
}

export interface StoryCardProps {
  segment: StorySegment;
  isLast: boolean;
  labels: StoryCardLabels;
  onAnimate?: (imageUrl: string) => void;
  language?: string;
  disableImages?: boolean;
  shouldAnimate?: boolean;
}

export const StoryCard: React.FC<StoryCardProps> = ({ 
  segment, 
  isLast, 
  labels, 
  onAnimate, 
  language = 'en',
  disableImages = false,
  shouldAnimate = true
}) => {
  
  if (segment.role === 'user') {
    return <UserActionCard text={segment.text} labelDecided={labels.decided} />;
  }

  return (
    <div className="flex flex-col mb-16 animate-slide-in space-y-6 group/card max-w-3xl mx-auto">
      <StoryImage 
        imageUrl={segment.imageUrl}
        isLast={isLast}
        labelVision={labels.vision}
        labelUnavailable={labels.unavailable}
        onAnimate={onAnimate}
        disableImages={disableImages}
      />
      
      <div className="flex flex-col">
        <StoryText 
          text={segment.text}
          isLast={isLast}
          language={language as LanguageCode}
          shouldAnimate={shouldAnimate}
        />
        <div className="px-6">
           <TokenStats usage={segment.usage} language={language} />
        </div>
      </div>
    </div>
  );
};
