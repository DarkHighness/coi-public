import { BACKGROUND_IMAGES } from "../utils/constants";
import {
  getEffectForAtmosphere,
  normalizeAtmosphere,
  type VisualEffect,
  type AtmosphereObject,
} from "../utils/constants/atmosphere";
import { useSettings } from "../hooks/useSettings";

import React, { useEffect, useState, useMemo } from "react";

interface EnvironmentalEffectsProps {
  currentText: string;
  imagePrompt?: string;
  /** Unified atmosphere object */
  atmosphere?: AtmosphereObject;
  backgroundImage?: string;
  fallbackEnabled?: boolean;
}

type EffectType = VisualEffect;

export const EnvironmentalEffects: React.FC<EnvironmentalEffectsProps> = ({
  currentText,
  imagePrompt,
  atmosphere,
  backgroundImage,
  fallbackEnabled = true,
}) => {
  // Use settings directly
  const { settings } = useSettings();
  const effectsDisabled = settings.disableEnvironmentalEffects;

  const [effect, setEffect] = useState<EffectType>(null);
  const [loadedBgSource, setLoadedBgSource] = useState<string | null>(null);

  // Normalize the atmosphere to get the unified object
  const resolvedAtmosphere = normalizeAtmosphere(atmosphere);

  useEffect(() => {
    // ... effect detection logic (unchanged)
    // Get default effect from atmosphere
    const atmosphereEffect = getEffectForAtmosphere(resolvedAtmosphere);

    // Priority Detection Logic - text-based overrides
    let detectedEffect: EffectType = atmosphereEffect;
    let weatherType = resolvedAtmosphere.weather; // Keep track of specific weather

    // 1. Check for explicit weather enum from AI (Highest Priority)
    if (resolvedAtmosphere.weather) {
      if (resolvedAtmosphere.weather === "none") {
        detectedEffect = null;
      } else {
        // Map specific weathers to core visual effects
        const w = resolvedAtmosphere.weather;
        if (["rain", "drizzle", "heavy_rain", "storm", "thunderstorm"].includes(w)) {
          detectedEffect = "rain";
        } else if (["snow", "light_snow", "heavy_snow", "blizzard"].includes(w)) {
          detectedEffect = "snow";
        } else if (["fog", "mist", "haze", "cloudy", "overcast"].includes(w)) {
          detectedEffect = "fog";
        } else if (["sunny", "clear", "partly_cloudy"].includes(w)) {
          detectedEffect = "sunny";
        } else if (["dust", "dust_storm", "sandstorm"].includes(w)) {
          detectedEffect = "dust";
        } else if (["embers"].includes(w)) {
          detectedEffect = "embers";
        } else if (["flicker"].includes(w)) {
          detectedEffect = "flicker";
        } else {
          // Fallback if generic string provided
           // strict cast might fail if string is random, but detectedEffect is typed as VisualEffect
           // We'll trust the mapping or fallback to null if unknown
           detectedEffect = (["rain", "snow", "fog", "embers", "flicker", "sunny", "dust"].includes(w) ? w : null) as EffectType;
        }
      }
    }

    setEffect(detectedEffect);
  }, [currentText, imagePrompt, resolvedAtmosphere]);

  // Determine background source and preload
  useEffect(() => {
    let bgSource = backgroundImage;
    let isFallback = false;

    // Extract ambience string for background lookup
    const ambienceKey = resolvedAtmosphere.ambience;

    if (!bgSource && fallbackEnabled && ambienceKey) {
      // Try to find a matching background from constants
      // First try exact match
      if (BACKGROUND_IMAGES[ambienceKey]) {
        bgSource = BACKGROUND_IMAGES[ambienceKey];
        isFallback = true;
      }
      // If no exact match, try to find by partial match or default to fantasy
      else {
        // Simple fallback logic: check if ambience contains key words
        const ambienceLower = ambienceKey.toLowerCase();
        const foundKey = Object.keys(BACKGROUND_IMAGES).find((key) =>
          ambienceLower.includes(key),
        );
        if (foundKey) {
          bgSource = BACKGROUND_IMAGES[foundKey];
          isFallback = true;
        }
      }
    }

    // If we have a background source, set it directly
    // We skip imageLoader to avoid CORS issues with external providers (like pollinations.ai)
    // CSS background-image handles cross-origin resources more gracefully than JS Image objects
    if (bgSource) {
      setLoadedBgSource(bgSource);
    } else {
      // If no background, we might want to keep the old one or clear it?
      // Clearing it might cause a flash to black/transparent.
      // Let's clear it if explicitly null.
      setLoadedBgSource(null);
    }
  }, [backgroundImage, fallbackEnabled, resolvedAtmosphere]);

  // Double buffering for smooth transitions
  const [bg1, setBg1] = useState<string | null>(null);
  const [bg2, setBg2] = useState<string | null>(null);
  const [activeLayer, setActiveLayer] = useState<1 | 2>(1);

  useEffect(() => {
    // When a new background is loaded, switch layers
    if (activeLayer === 1) {
      if (bg1 !== loadedBgSource) {
        setBg2(loadedBgSource);
        setActiveLayer(2);
      }
    } else {
      if (bg2 !== loadedBgSource) {
        setBg1(loadedBgSource);
        setActiveLayer(1);
      }
    }
  }, [loadedBgSource]);

  // Derived intensity based on specific weather string
  const weather = resolvedAtmosphere.weather;
  const isHeavyRain = ["heavy_rain", "storm", "thunderstorm"].includes(weather || "");
  const isLightRain = weather === "drizzle";
  const isHeavySnow = ["heavy_snow", "blizzard"].includes(weather || "");
  const isLightSnow = weather === "light_snow";
  const isHeavyFog = ["fog", "overcast"].includes(weather || "");
  const isLightFog = ["mist", "haze", "partly_cloudy"].includes(weather || "");
  const isSandstorm = ["sandstorm", "dust_storm"].includes(weather || "");

  return (
    <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
      {/* Background Layer 1 - Using img element for proper CORS handling */}
      {bg1 && (
        <img
          src={bg1}
          alt=""
          crossOrigin="anonymous"
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ease-in-out ${
            activeLayer === 1 ? "opacity-30" : "opacity-0"
          }`}
          style={{
            filter: "blur(8px) brightness(0.6)",
          }}
        />
      )}
      {/* Background Layer 2 - Using img element for proper CORS handling */}
      {bg2 && (
        <img
          src={bg2}
          alt=""
          crossOrigin="anonymous"
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ease-in-out ${
            activeLayer === 2 ? "opacity-30" : "opacity-0"
          }`}
          style={{
            filter: "blur(8px) brightness(0.6)",
          }}
        />
      )}

      {!effectsDisabled && effect === "rain" && (
        <div className="w-full h-full">
          {[...Array(isHeavyRain ? 80 : isLightRain ? 20 : 40)].map((_, i) => (
            <div
              key={i}
              className="weather-rain"
              style={{
                left: `${Math.random() * 100}%`,
                animationDuration: `${(0.5 + Math.random() * 0.3) * (isHeavyRain ? 0.7 : 1)}s`,
                animationDelay: `${Math.random() * 2}s`,
                opacity: (0.1 + Math.random() * 0.3) * (isHeavyRain ? 1.5 : 1),
                height: isHeavyRain ? `${15 + Math.random() * 15}px` : undefined,
              }}
            />
          ))}
        </div>
      )}

      {!effectsDisabled && effect === "snow" && (
        <div className="w-full h-full">
          {[...Array(isHeavySnow ? 100 : isLightSnow ? 20 : 50)].map((_, i) => (
            <div
              key={i}
              className="weather-snow"
              style={{
                left: `${Math.random() * 100}%`,
                animationDuration: `${(3 + Math.random() * 5) * (isHeavySnow ? 0.5 : 1)}s`,
                animationDelay: `${Math.random() * 5}s`,
                width: `${2 + Math.random() * 4}px`,
                height: `${2 + Math.random() * 4}px`,
                opacity: isHeavySnow ? 0.8 : undefined,
              }}
            />
          ))}
        </div>
      )}

      {!effectsDisabled && effect === "fog" && (
        <>
          {/* Multiple fog layers for depth */}
          <div
            className="weather-fog"
            style={{ top: "0%", opacity: isHeavyFog ? 0.3 : isLightFog ? 0.1 : 0.15 }}
          ></div>
          <div
            className="weather-fog"
            style={{
              top: "30%",
              animationDirection: "reverse",
              opacity: isHeavyFog ? 0.4 : isLightFog ? 0.15 : 0.2,
              animationDuration: "80s",
            }}
          ></div>
          <div
            className="weather-fog"
            style={{ top: "60%", opacity: isHeavyFog ? 0.2 : isLightFog ? 0.05 : 0.1, animationDuration: "100s" }}
          ></div>
        </>
      )}

      {!effectsDisabled && effect === "embers" && (
        <div className="w-full h-full">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="weather-ember"
              style={{
                left: `${Math.random() * 100}%`,
                animationDuration: `${2 + Math.random() * 3}s`,
                animationDelay: `${Math.random() * 2}s`,
              }}
            />
          ))}
        </div>
      )}

      {!effectsDisabled && effect === "flicker" && (
        <div className="absolute inset-0 bg-black/20 weather-flicker mix-blend-multiply"></div>
      )}

      {!effectsDisabled && effect === "sunny" && (
        <div className="w-full h-full">
          {[...Array(15)].map((_, i) => (
            <div
              key={i}
              className="weather-particle"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDuration: `${4 + Math.random() * 4}s`,
                animationDelay: `${Math.random() * 2}s`,
              }}
            />
          ))}
        </div>
      )}

      {!effectsDisabled && effect === "dust" && (
        <div className="w-full h-full pointer-events-none">
          {/* Dust tint */}
          <div className={`absolute inset-0 bg-yellow-900/10 ${isSandstorm ? 'bg-orange-700/20' : ''}`}></div>
          {/* Dust particles */}
          {[...Array(isSandstorm ? 40 : 20)].map((_, i) => (
            <div
              key={i}
              className="absolute rounded-full bg-orange-100/30 blur-[1px]"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                width: `${2 + Math.random() * 3}px`,
                height: `${2 + Math.random() * 3}px`,
                animation: `float ${10 + Math.random() * 10}s linear infinite`,
                animationDelay: `-${Math.random() * 10}s`,
                opacity: 0.2 + Math.random() * 0.3,
              }}
            />
          ))}
          {/* Horizontal wind for sandstorm */}
           {isSandstorm && [...Array(10)].map((_, i) => (
             <div
               key={`wind-${i}`}
               className="weather-fog"
               style={{
                 top: `${Math.random() * 100}%`,
                 opacity: 0.15,
                 height: '20%',
                 background: 'linear-gradient(90deg, transparent, rgba(160, 82, 45, 0.2), transparent)',
                 animationDuration: `${2 + Math.random()}s`,
               }}
             />
           ))}
        </div>
      )}
    </div>
  );
};
