import { BACKGROUND_IMAGES } from "../utils/constants";
import React, { useEffect, useState } from "react";

interface EnvironmentalEffectsProps {
  currentText: string;
  imagePrompt?: string;
  envTheme: string;
  environment?: string;
  backgroundImage?: string;
  fallbackEnabled?: boolean;
}

type EffectType =
  | "rain"
  | "snow"
  | "fog"
  | "flicker"
  | "embers"
  | "sunny"
  | null;

export const EnvironmentalEffects: React.FC<EnvironmentalEffectsProps> = ({
  currentText,
  imagePrompt,
  envTheme,
  environment,
  backgroundImage,
  fallbackEnabled = true,
}) => {
  const [effect, setEffect] = useState<EffectType>(null);
  const [loadedBgSource, setLoadedBgSource] = useState<string | null>(null);

  useEffect(() => {
    // Combine texts for analysis
    const analysisText =
      `${currentText} ${imagePrompt || ""} ${environment || ""} ${envTheme || ""}`.toLowerCase();

    // Priority Detection Logic
    let detectedEffect: EffectType = null;

    // 1. Flicker (Horror/Dungeon settings mostly)
    if (
      analysisText.includes("flicker") ||
      analysisText.includes("strobe") ||
      analysisText.includes("malfunctioning light") ||
      analysisText.includes("torch sputtering")
    ) {
      detectedEffect = "flicker";
    }
    // 2. Rain (Storms, Water)
    else if (
      analysisText.includes("rain") ||
      analysisText.includes("storm") ||
      analysisText.includes("downpour") ||
      analysisText.includes("drizzle")
    ) {
      detectedEffect = "rain";
    }
    // 3. Snow (Cold, Ice)
    else if (
      analysisText.includes("snow") ||
      analysisText.includes("blizzard") ||
      analysisText.includes("frozen") ||
      analysisText.includes("icy")
    ) {
      detectedEffect = "snow";
    }
    // 4. Fire/Embers (Volcano, Campfire, Destruction)
    else if (
      analysisText.includes("fire") ||
      analysisText.includes("ember") ||
      analysisText.includes("burning") ||
      analysisText.includes("lava") ||
      analysisText.includes("ash")
    ) {
      detectedEffect = "embers";
    }
    // 5. Fog (Mystery, Swamp)
    else if (
      analysisText.includes("fog") ||
      analysisText.includes("mist") ||
      analysisText.includes("haze") ||
      analysisText.includes("steam")
    ) {
      detectedEffect = "fog";
    }
    // 6. Sunny/Particles (Forest, Day)
    else if (
      analysisText.includes("sun") ||
      analysisText.includes("beam") ||
      analysisText.includes("dust mote") ||
      analysisText.includes("pollen")
    ) {
      detectedEffect = "sunny";
    }

    setEffect(detectedEffect);
  }, [currentText, imagePrompt, environment]);

  // Determine background source and preload
  useEffect(() => {
    let bgSource = backgroundImage;
    let isFallback = false;

    if (!bgSource && fallbackEnabled && environment) {
      // Try to find a matching background from constants
      // First try exact match
      if (BACKGROUND_IMAGES[environment]) {
        bgSource = BACKGROUND_IMAGES[environment];
        isFallback = true;
      }
      // If no exact match, try to find by partial match or default to fantasy
      else {
        // Simple fallback logic: check if environment contains key words
        const envLower = environment.toLowerCase();
        const foundKey = Object.keys(BACKGROUND_IMAGES).find((key) =>
          envLower.includes(key),
        );
        if (foundKey) {
          bgSource = BACKGROUND_IMAGES[foundKey];
          isFallback = true;
        }
      }
    }

    // If we have a background source, try to load it
    if (bgSource) {
      // For pollinations.ai images (fallback), preload and handle errors silently
      if (isFallback && bgSource.includes("pollinations.ai")) {
        const img = new Image();
        img.onload = () => {
          setLoadedBgSource(bgSource);
        };
        img.onerror = (e) => {
          // Silently fail on 429 or any other error from pollinations.ai
          console.warn(
            "Failed to load fallback background image (pollinations.ai):",
            e,
          );
          setLoadedBgSource(null);
        };
        img.src = bgSource;
      } else {
        // For non-fallback images, use them directly
        setLoadedBgSource(bgSource);
      }
    } else {
      setLoadedBgSource(null);
    }
  }, [backgroundImage, fallbackEnabled, environment]);

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
