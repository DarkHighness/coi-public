import React, { useState } from 'react';
import { LanguageCode, Location } from '../../types';
import { TRANSLATIONS } from '../../utils/constants';

interface LocationPanelProps {
  currentLocation: string;
  knownLocations: string[];
  locations: Location[];
  language: LanguageCode;
  themeFont: string;
  itemContext: string;
}

export const LocationPanel: React.FC<LocationPanelProps> = ({ currentLocation, knownLocations = [], locations = [], language, themeFont }) => {
  const t = TRANSLATIONS[language];
  const [isOpen, setIsOpen] = useState(true);
  const [expandedLocation, setExpandedLocation] = useState<string | null>(null);

  const handleLocationClick = (locationName: string) => {
    if (expandedLocation === locationName) {
      setExpandedLocation(null);
    } else {
      setExpandedLocation(locationName);
    }
  };

  const renderLocationItem = (locationName: string, isCurrent: boolean) => {
    const isExpanded = expandedLocation === locationName;
    const locationData = locations.find(l => l.name === locationName);

    return (
      <div key={locationName} className={`mb-2 transition-all ${isExpanded ? 'bg-theme-surface-highlight/30' : ''} rounded`}>
         <button
           onClick={() => handleLocationClick(locationName)}
           className={`w-full text-left px-3 py-2 rounded border transition-all duration-300 flex justify-between items-center ${
             isCurrent
               ? 'bg-theme-surface-highlight/50 border-theme-primary/30 text-theme-text hover:bg-theme-primary/10'
               : 'bg-theme-bg border-theme-border/50 text-theme-muted hover:text-theme-primary hover:border-theme-primary/50'
           }`}
         >
             <span className={`font-bold tracking-wide text-xs ${isCurrent ? 'text-theme-primary' : ''}`}>{locationName}</span>
             {isCurrent && (
               <svg className="w-3 h-3 text-theme-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
             )}
         </button>

         {/* Inline Details */}
         <div className={`overflow-hidden transition-all duration-500 ease-in-out ${isExpanded ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}>
            <div className="p-3 border-x border-b border-theme-border/30 rounded-b bg-black/20">
                {locationData ? (
                   <div className="space-y-2 text-xs animate-fade-in">
                      <p className="text-theme-text leading-relaxed">{locationData.description}</p>
                      {locationData.lore && (
                        <div className="pt-2 border-t border-theme-border/20 mt-1">
                           <span className="text-[10px] uppercase tracking-wider text-theme-primary font-bold block mb-1">{t.history}</span>
                           <p className="text-theme-muted italic">{locationData.lore}</p>
                        </div>
                      )}
                   </div>
                ) : (
                   <div className="text-xs text-theme-muted italic opacity-50">{t.noInfoAvailable}</div>
                )}
            </div>
         </div>
      </div>
    );
  };

  return (
    <div className="mb-6 relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full text-left text-theme-primary uppercase text-xs font-bold tracking-widest mb-4 flex items-center justify-between group ${themeFont}`}
      >
        <span className="flex items-center">
          <svg className="w-4 h-4 mr-2 text-theme-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
          {t.location.title}
        </span>
        <svg className={`w-4 h-4 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
      </button>

      <div className={`transition-all duration-500 ease-in-out overflow-hidden ${isOpen ? 'max-h-[800px] opacity-100' : 'max-h-0 opacity-0'}`}>
         <div className="space-y-1">
            {/* Current Location */}
            {renderLocationItem(currentLocation || t.unknown, true)}

            {/* Known Locations Divider */}
            {knownLocations.length > 0 && (
                <div className="mt-4 mb-2">
                   <h4 className="uppercase text-[10px] text-theme-muted font-bold tracking-wider mb-2 border-b border-theme-border/30 pb-1">{t.location.known}</h4>
                   {knownLocations.filter(l => l !== currentLocation).map(loc => renderLocationItem(loc, false))}
                </div>
            )}
         </div>
      </div>
    </div>
  );
};
