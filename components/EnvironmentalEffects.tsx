import React, { useEffect, useState } from "react";

interface EnvironmentalEffectsProps {
  currentText: string;
  imagePrompt?: string;
  theme: string;
  environment?: string;
  backgroundImage?: string;
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
  theme,
  environment,
  backgroundImage,
}) => {
  const [effect, setEffect] = useState<EffectType>(null);

  useEffect(() => {
    // Combine texts for analysis
    const analysisText =
      `${currentText} ${imagePrompt || ""} ${environment || ""}`.toLowerCase();

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

  return (
    <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
      {/* Background Image Layer */}
      <div
        className={`absolute inset-0 bg-cover bg-center transition-opacity duration-1000 ${backgroundImage ? "opacity-30" : "opacity-0"}`}
        style={{
          backgroundImage: backgroundImage ? `url(${backgroundImage})` : "none",
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
          <div className="weather-fog" style={{ top: "60%" }}></div>
          <div
            className="weather-fog"
            style={{ top: "30%", animationDirection: "reverse", opacity: 0.2 }}
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
