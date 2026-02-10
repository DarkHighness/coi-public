import React, { useEffect, useState, useMemo } from "react";
import { getButterflyColor } from "./butterflyColors";

interface Butterfly {
  id: number;
  left: number; // %
  top: number; // %
  scale: number;
  rotation: number;
  duration: number; // seconds
  delay: number;
  color: string;
  flyOutDelay?: number; // For finale animation
}

interface InitializingButterfliesProps {
  /** Current phase number (0-10) */
  currentPhase: number;
  /** Total number of phases */
  totalPhases: number;
  /** Whether all phases are complete - triggers finale animation */
  isComplete?: boolean;
}

export const buildButterflyContainerStyle = (
  butterfly: Butterfly,
  finaleTriggered: boolean,
): React.CSSProperties => {
  const base: React.CSSProperties = {
    left: `${butterfly.left}%`,
    top: `${butterfly.top}%`,
    transform: `rotate(${butterfly.rotation}deg) scale(${butterfly.scale})`,
  };

  if (!finaleTriggered) {
    return base;
  }

  return {
    ...base,
    animationName: "butterfly-fly-out",
    animationDuration: "0.8s",
    animationTimingFunction: "ease-in",
    animationFillMode: "forwards",
    animationDelay: `${butterfly.flyOutDelay ?? 0}s`,
  };
};

export const buildButterflyInnerStyle = (
  butterfly: Butterfly,
  finaleTriggered: boolean,
): React.CSSProperties => {
  const base: React.CSSProperties = {
    position: "relative",
  };

  if (finaleTriggered) {
    return base;
  }

  return {
    ...base,
    animationName: "butterfly-float",
    animationDuration: `${butterfly.duration}s`,
    animationTimingFunction: "linear",
    animationIterationCount: "infinite",
    animationDelay: `${butterfly.delay}s`,
  };
};

/**
 * Butterflies that increase in count as phases progress
 * When complete, triggers a finale effect where butterflies fly off screen
 */
export const InitializingButterflies: React.FC<
  InitializingButterfliesProps
> = ({ currentPhase, totalPhases, isComplete = false }) => {
  const [butterflies, setButterflies] = useState<Butterfly[]>([]);
  const [finaleTriggered, setFinaleTriggered] = useState(false);

  // Calculate butterfly count based on phase progress
  // Start with 5 butterflies, grow to 40 as phases complete
  const targetCount = useMemo(() => {
    const minCount = 5;
    const maxCount = 40;
    const progress = currentPhase / totalPhases;
    return Math.floor(minCount + (maxCount - minCount) * progress);
  }, [currentPhase, totalPhases]);

  // Create butterflies gradually as count increases
  useEffect(() => {
    if (butterflies.length < targetCount) {
      // Add new butterflies
      const newButterflies: Butterfly[] = [];
      for (let i = butterflies.length; i < targetCount; i++) {
        newButterflies.push({
          id: i,
          left: Math.random() * 100,
          top: Math.random() * 100,
          scale: 0.4 + Math.random() * 0.6,
          rotation: Math.random() * 360,
          duration: 12 + Math.random() * 18,
          delay: Math.random() * -20,
          color: getButterflyColor(i),
        });
      }
      setButterflies([...butterflies, ...newButterflies]);
    }
  }, [targetCount, butterflies.length]);

  // Trigger finale animation when complete
  useEffect(() => {
    if (isComplete && !finaleTriggered) {
      setFinaleTriggered(true);
      // Assign fly-out delays to butterflies for staggered exit
      setButterflies((prev) =>
        prev.map((b, i) => ({
          ...b,
          flyOutDelay: i * 0.05 + Math.random() * 0.1,
        })),
      );
    }
  }, [isComplete, finaleTriggered]);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-1">
      {butterflies.map((b) => (
        <div
          key={b.id}
          className="absolute"
          style={buildButterflyContainerStyle(b, finaleTriggered)}
        >
          <div
            className="butterfly"
            style={buildButterflyInnerStyle(b, finaleTriggered)}
          >
            <div className="butterfly-wings text-theme-primary/60">
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="currentColor"
                style={{ color: b.color }}
              >
                {/* Body */}
                <path
                  d="M12 3v18"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
                {/* Wings */}
                <path
                  d="M12 5c-4-3-8 0-8 5s4 6 8 2c4 4 8-1 8-2s-4-8-8-5zm0 8c-3 1-6 4-5 7s5 2 5-2c0 4 6 3 5-7z"
                  fillOpacity="0.8"
                />
              </svg>
            </div>
          </div>
        </div>
      ))}

      {/* CSS for fly-out animation */}
      <style>{`
        @keyframes butterfly-fly-out {
          0% {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
          50% {
            opacity: 0.8;
          }
          100% {
            opacity: 0;
            transform: scale(1.5) translateY(-150vh) rotate(${Math.random() * 360}deg);
          }
        }
      `}</style>
    </div>
  );
};
