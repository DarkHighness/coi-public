import React, { useState, useEffect } from 'react';
import { getItemDescription } from '../services/geminiService';
import { InventoryItemDetail } from './render/InventoryItemDetail';
import { InventoryItemHeader } from './render/InventoryItemHeader';

interface InventoryItemProps {
  name: string;
  language: string;
  context: string;
}

interface ItemDetails {
  description: string;
  lore: string;
}

export const InventoryItem: React.FC<InventoryItemProps> = ({ name, language, context }) => {
  const [details, setDetails] = useState<ItemDetails | null>(null);
  const [loading, setLoading] = useState(false);
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

  // Reset details if language changes to force re-fetch
  useEffect(() => {
    setDetails(null);
  }, [language]);

  const handleClick = async () => {
    if (isOpen) {
      setIsOpen(false);
      return;
    }
    
    setIsOpen(true);
    if (!details) {
      setLoading(true);
      const data = await getItemDescription(name, context, language);
      setDetails(data);
      setLoading(false);
    }
  };

  return (
    <div 
      className={`mb-2 transform transition-all duration-500 ease-out ${
        isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'
      }`}
    >
      <InventoryItemHeader 
        name={name}
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
             loading={loading} 
             details={details} 
             language={language} 
           />
        </div>
      </div>
    </div>
  );
};