import React, { useState, useEffect } from 'react';
import { InventoryItem as InventoryItemType } from '../types';
import { InventoryItemDetail } from './render/InventoryItemDetail';
import { InventoryItemHeader } from './render/InventoryItemHeader';

interface InventoryItemProps {
  item: InventoryItemType;
  language: string;
  context: string;
}

export const InventoryItem: React.FC<InventoryItemProps> = ({ item, language, context }) => {
  const [isOpen, setIsOpen] = useState(false);

  // Animation states
  const [isVisible, setIsVisible] = useState(false);
  const [isHighlight, setIsHighlight] = useState(true);

  useEffect(() => {
    // Trigger slide-in
    const entryTimer = setTimeout(() => setIsVisible(true), 50);

    // Remove highlight after a few seconds
    const highlightTimer = setTimeout(() => setIsHighlight(false), 2000);

    return () => {
      clearTimeout(entryTimer);
      clearTimeout(highlightTimer);
    };
  }, []);

  const handleClick = () => {
    setIsOpen(!isOpen);
  };

  return (
    <div
      className={`mb-2 transform transition-all duration-500 ease-out ${
        isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'
      }`}
    >
      <InventoryItemHeader
        name={item.name}
        isOpen={isOpen}
        isHighlight={isHighlight}
        onClick={handleClick}
      />

      <div
        className={`overflow-hidden transition-all duration-500 ease-in-out ${
          isOpen ? 'max-h-[800px] opacity-100 mt-1' : 'max-h-0 opacity-0 mt-0'
        }`}
      >
        <div className="p-3 bg-theme-bg/50 text-sm text-theme-text rounded border-l-2 border-theme-primary overflow-y-auto max-h-[800px]">
           <InventoryItemDetail
             loading={false}
             details={{ description: item.description, lore: item.lore || "" }}
             language={language}
           />
        </div>
      </div>
    </div>
  );
};