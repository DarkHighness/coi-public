import { BACKGROUND_IMAGES } from "../utils/constants";
import {
  getEffectForAtmosphere,
  normalizeAtmosphere,
  type VisualEffect,
  type AtmosphereObject,
} from "../utils/constants/atmosphere";

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
  const [effect, setEffect] = useState<EffectType>(null);
  const [loadedBgSource, setLoadedBgSource] = useState<string | null>(null);

  // Normalize the atmosphere to get the unified object
  const resolvedAtmosphere = normalizeAtmosphere(atmosphere);

  useEffect(() => {
    // ... effect detection logic (unchanged)
    // Get default effect from atmosphere
    const atmosphereEffect = getEffectForAtmosphere(resolvedAtmosphere);

    // Combine texts for additional analysis (can override atmosphere default)
    const analysisText = `${currentText} ${imagePrompt || ""}`.toLowerCase();

    // Priority Detection Logic - text-based overrides
    let detectedEffect: EffectType = atmosphereEffect;

    // 1. Check for explicit weather enum from AI (Highest Priority)
    if (resolvedAtmosphere.weather) {
      if (resolvedAtmosphere.weather === "none") {
        detectedEffect = null;
      } else {
        detectedEffect = resolvedAtmosphere.weather as EffectType;
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

  return (
    <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
      {/* Background Layer 1 */}
      <div
        className={`absolute inset-0 bg-cover bg-center transition-opacity duration-1000 ease-in-out ${
          activeLayer === 1 ? "opacity-30" : "opacity-0"
        }`}
        style={{
          backgroundImage: bg1 ? `url(${bg1})` : "none",
          filter: "blur(8px) brightness(0.6)",
        }}
      />
      {/* Background Layer 2 */}
      <div
        className={`absolute inset-0 bg-cover bg-center transition-opacity duration-1000 ease-in-out ${
          activeLayer === 2 ? "opacity-30" : "opacity-0"
        }`}
        style={{
          backgroundImage: bg2 ? `url(${bg2})` : "none",
          filter: "blur(8px) brightness(0.6)",
        }}
      />

      {effect === "rain" && (
        <div className="w-full h-full">
          {[...Array(40)].map((_, i) => (
            <div
              key={i}
              className="weather-rain"
              style={{
                left: `${Math.random() * 100}%`,
                animationDuration: `${0.5 + Math.random() * 0.3}s`,
                animationDelay: `${Math.random() * 2}s`,
                opacity: 0.1 + Math.random() * 0.3,
              }}
            />
          ))}
        </div>
      )}

      {effect === "snow" && (
        <div className="w-full h-full">
          {[...Array(50)].map((_, i) => (
            <div
              key={i}
              className="weather-snow"
              style={{
                left: `${Math.random() * 100}%`,
                animationDuration: `${3 + Math.random() * 5}s`,
                animationDelay: `${Math.random() * 5}s`,
                width: `${2 + Math.random() * 4}px`,
                height: `${2 + Math.random() * 4}px`,
              }}
            />
          ))}
        </div>
      )}

      {effect === "fog" && (
        <>
          {/* Multiple fog layers for depth */}
          <div
            className="weather-fog"
            style={{ top: "0%", opacity: 0.15 }}
          ></div>
          <div
            className="weather-fog"
            style={{
              top: "30%",
              animationDirection: "reverse",
              opacity: 0.2,
              animationDuration: "80s",
            }}
          ></div>
          <div
            className="weather-fog"
            style={{ top: "60%", opacity: 0.1, animationDuration: "100s" }}
          ></div>
        </>
      )}

      {effect === "embers" && (
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

      {effect === "flicker" && (
        <div className="absolute inset-0 bg-black/20 weather-flicker mix-blend-multiply"></div>
      )}

      {effect === "sunny" && (
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
    </div>
  );
};
