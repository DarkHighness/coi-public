import {
  getEffectForAtmosphere,
  normalizeAtmosphere,
  type VisualEffect,
  type AtmosphereObject,
} from "../utils/constants/atmosphere";
import { useSettings } from "../hooks/useSettings";

import React, { useEffect, useMemo, useState } from "react";

interface EnvironmentalEffectsProps {
  /** Unified atmosphere object */
  atmosphere?: AtmosphereObject;
  backgroundImage?: string;
}

type EffectType = VisualEffect;

interface StyleItem {
  id: string;
  style: React.CSSProperties;
}

const rand = (min: number, max: number): number =>
  min + Math.random() * (max - min);

const resolveVisualEffect = (
  resolvedAtmosphere: AtmosphereObject,
): EffectType => {
  const atmosphereEffect = getEffectForAtmosphere(resolvedAtmosphere);
  const weather = resolvedAtmosphere.weather;

  if (!weather) {
    return atmosphereEffect;
  }
  if (weather === "none") {
    return null;
  }

  if (
    ["rain", "drizzle", "heavy_rain", "storm", "thunderstorm"].includes(weather)
  ) {
    return "rain";
  }
  if (["snow", "light_snow", "heavy_snow", "blizzard"].includes(weather)) {
    return "snow";
  }
  if (["fog", "mist", "haze", "cloudy", "overcast"].includes(weather)) {
    return "fog";
  }
  if (["sunny", "clear", "partly_cloudy"].includes(weather)) {
    return "sunny";
  }
  if (["dust", "dust_storm", "sandstorm"].includes(weather)) {
    return "dust";
  }
  if (weather === "embers") {
    return "embers";
  }
  if (weather === "flicker") {
    return "flicker";
  }

  return (
    ["rain", "snow", "fog", "embers", "flicker", "sunny", "dust"].includes(
      weather,
    )
      ? weather
      : null
  ) as EffectType;
};

const areAtmospheresEquivalent = (
  a: AtmosphereObject | undefined,
  b: AtmosphereObject | undefined,
): boolean => {
  const na = normalizeAtmosphere(a);
  const nb = normalizeAtmosphere(b);
  return (
    na.envTheme === nb.envTheme &&
    na.ambience === nb.ambience &&
    (na.weather ?? null) === (nb.weather ?? null)
  );
};

const EnvironmentalEffectsComponent: React.FC<EnvironmentalEffectsProps> = ({
  atmosphere,
  backgroundImage,
}) => {
  const { settings } = useSettings();
  const effectsDisabled = settings.disableEnvironmentalEffects;

  const resolvedAtmosphere = useMemo(
    () => normalizeAtmosphere(atmosphere),
    [atmosphere],
  );
  const weather = resolvedAtmosphere.weather;

  const effect = useMemo(
    () => resolveVisualEffect(resolvedAtmosphere),
    [resolvedAtmosphere],
  );

  const loadedBgSource = backgroundImage ?? null;

  const [backgroundLayers, setBackgroundLayers] = useState<{
    bg1: string | null;
    bg2: string | null;
    active: 1 | 2;
  }>({
    bg1: null,
    bg2: null,
    active: 1,
  });

  useEffect(() => {
    setBackgroundLayers((prev) => {
      if (prev.active === 1) {
        if (prev.bg2 === loadedBgSource) {
          return prev;
        }
        return { ...prev, bg2: loadedBgSource, active: 2 };
      }

      if (prev.bg1 === loadedBgSource) {
        return prev;
      }
      return { ...prev, bg1: loadedBgSource, active: 1 };
    });
  }, [loadedBgSource]);

  const isHeavyRain = ["heavy_rain", "storm", "thunderstorm"].includes(
    weather || "",
  );
  const isLightRain = weather === "drizzle";
  const isHeavySnow = ["heavy_snow", "blizzard"].includes(weather || "");
  const isLightSnow = weather === "light_snow";
  const isHeavyFog = ["fog", "overcast"].includes(weather || "");
  const isLightFog = ["mist", "haze", "partly_cloudy"].includes(weather || "");
  const isSandstorm = ["sandstorm", "dust_storm"].includes(weather || "");

  const rainParticles = useMemo<StyleItem[]>(() => {
    if (effectsDisabled || effect !== "rain") {
      return [];
    }
    const count = isHeavyRain ? 80 : isLightRain ? 20 : 40;
    return Array.from({ length: count }, (_, i) => ({
      id: `rain-${i}`,
      style: {
        left: `${rand(0, 100)}%`,
        animationDuration: `${rand(0.5, 0.8) * (isHeavyRain ? 0.7 : 1)}s`,
        animationDelay: `${rand(0, 2)}s`,
        opacity: (rand(0.1, 0.4) * (isHeavyRain ? 1.5 : 1)).toFixed(2),
        height: isHeavyRain ? `${rand(15, 30)}px` : undefined,
      },
    }));
  }, [effectsDisabled, effect, isHeavyRain, isLightRain]);

  const snowParticles = useMemo<StyleItem[]>(() => {
    if (effectsDisabled || effect !== "snow") {
      return [];
    }
    const count = isHeavySnow ? 100 : isLightSnow ? 20 : 50;
    return Array.from({ length: count }, (_, i) => ({
      id: `snow-${i}`,
      style: {
        left: `${rand(0, 100)}%`,
        animationDuration: `${rand(3, 8) * (isHeavySnow ? 0.5 : 1)}s`,
        animationDelay: `${rand(0, 5)}s`,
        width: `${rand(2, 6)}px`,
        height: `${rand(2, 6)}px`,
        opacity: isHeavySnow ? 0.8 : undefined,
      },
    }));
  }, [effectsDisabled, effect, isHeavySnow, isLightSnow]);

  const emberParticles = useMemo<StyleItem[]>(() => {
    if (effectsDisabled || effect !== "embers") {
      return [];
    }
    return Array.from({ length: 20 }, (_, i) => ({
      id: `ember-${i}`,
      style: {
        left: `${rand(0, 100)}%`,
        animationDuration: `${rand(2, 5)}s`,
        animationDelay: `${rand(0, 2)}s`,
      },
    }));
  }, [effectsDisabled, effect]);

  const sunParticles = useMemo<StyleItem[]>(() => {
    if (effectsDisabled || effect !== "sunny") {
      return [];
    }
    return Array.from({ length: 15 }, (_, i) => ({
      id: `sun-${i}`,
      style: {
        left: `${rand(0, 100)}%`,
        top: `${rand(0, 100)}%`,
        animationDuration: `${rand(4, 8)}s`,
        animationDelay: `${rand(0, 2)}s`,
      },
    }));
  }, [effectsDisabled, effect]);

  const dustParticles = useMemo<StyleItem[]>(() => {
    if (effectsDisabled || effect !== "dust") {
      return [];
    }
    const count = isSandstorm ? 40 : 20;
    return Array.from({ length: count }, (_, i) => ({
      id: `dust-${i}`,
      style: {
        left: `${rand(0, 100)}%`,
        top: `${rand(0, 100)}%`,
        width: `${rand(2, 5)}px`,
        height: `${rand(2, 5)}px`,
        animation: `float ${rand(10, 20)}s linear infinite`,
        animationDelay: `-${rand(0, 10)}s`,
        opacity: rand(0.2, 0.5).toFixed(2),
      },
    }));
  }, [effectsDisabled, effect, isSandstorm]);

  const sandstormWinds = useMemo<StyleItem[]>(() => {
    if (effectsDisabled || effect !== "dust" || !isSandstorm) {
      return [];
    }
    return Array.from({ length: 10 }, (_, i) => ({
      id: `wind-${i}`,
      style: {
        top: `${rand(0, 100)}%`,
        opacity: 0.15,
        height: "20%",
        background:
          "linear-gradient(90deg, transparent, rgba(160, 82, 45, 0.2), transparent)",
        animationDuration: `${rand(2, 3)}s`,
      },
    }));
  }, [effectsDisabled, effect, isSandstorm]);

  return (
    <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
      {backgroundLayers.bg1 && (
        <img
          src={backgroundLayers.bg1}
          alt=""
          crossOrigin="anonymous"
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ease-in-out ${
            backgroundLayers.active === 1 ? "opacity-30" : "opacity-0"
          }`}
          style={{
            filter: "blur(8px) brightness(0.6)",
            willChange: "opacity",
          }}
        />
      )}
      {backgroundLayers.bg2 && (
        <img
          src={backgroundLayers.bg2}
          alt=""
          crossOrigin="anonymous"
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ease-in-out ${
            backgroundLayers.active === 2 ? "opacity-30" : "opacity-0"
          }`}
          style={{
            filter: "blur(8px) brightness(0.6)",
            willChange: "opacity",
          }}
        />
      )}

      {!effectsDisabled && effect === "rain" && (
        <div className="w-full h-full">
          {rainParticles.map((item) => (
            <div key={item.id} className="weather-rain" style={item.style} />
          ))}
        </div>
      )}

      {!effectsDisabled && effect === "snow" && (
        <div className="w-full h-full">
          {snowParticles.map((item) => (
            <div key={item.id} className="weather-snow" style={item.style} />
          ))}
        </div>
      )}

      {!effectsDisabled && effect === "fog" && (
        <>
          <div
            className="weather-fog"
            style={{
              top: "0%",
              opacity: isHeavyFog ? 0.3 : isLightFog ? 0.1 : 0.15,
            }}
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
            style={{
              top: "60%",
              opacity: isHeavyFog ? 0.2 : isLightFog ? 0.05 : 0.1,
              animationDuration: "100s",
            }}
          ></div>
        </>
      )}

      {!effectsDisabled && effect === "embers" && (
        <div className="w-full h-full">
          {emberParticles.map((item) => (
            <div key={item.id} className="weather-ember" style={item.style} />
          ))}
        </div>
      )}

      {!effectsDisabled && effect === "flicker" && (
        <div className="absolute inset-0 bg-black/20 weather-flicker mix-blend-multiply"></div>
      )}

      {!effectsDisabled && effect === "sunny" && (
        <div className="w-full h-full">
          {sunParticles.map((item) => (
            <div
              key={item.id}
              className="weather-particle"
              style={item.style}
            />
          ))}
        </div>
      )}

      {!effectsDisabled && effect === "dust" && (
        <div className="w-full h-full pointer-events-none">
          <div
            className={`absolute inset-0 bg-yellow-900/10 ${isSandstorm ? "bg-orange-700/20" : ""}`}
          ></div>
          {dustParticles.map((item) => (
            <div
              key={item.id}
              className="absolute rounded-full bg-orange-100/30 blur-[1px]"
              style={item.style}
            />
          ))}
          {sandstormWinds.map((item) => (
            <div key={item.id} className="weather-fog" style={item.style} />
          ))}
        </div>
      )}
    </div>
  );
};

export const EnvironmentalEffects = React.memo(
  EnvironmentalEffectsComponent,
  (prevProps, nextProps) =>
    prevProps.backgroundImage === nextProps.backgroundImage &&
    areAtmospheresEquivalent(prevProps.atmosphere, nextProps.atmosphere),
);

EnvironmentalEffects.displayName = "EnvironmentalEffects";
