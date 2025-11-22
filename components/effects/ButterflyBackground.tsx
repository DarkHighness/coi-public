import React, { useEffect, useState } from "react";

interface Butterfly {
  id: number;
  left: number;
  top: number;
  scale: number;
  rotation: number;
  duration: number;
  delay: number;
  color: string;
}

export const ButterflyBackground: React.FC = () => {
  const [butterflies, setButterflies] = useState<Butterfly[]>([]);

  useEffect(() => {
    const count = 15;
    const newButterflies: Butterfly[] = [];

    for (let i = 0; i < count; i++) {
      newButterflies.push({
        id: i,
        left: Math.random() * 100, // %
        top: Math.random() * 100, // %
        scale: 0.5 + Math.random() * 0.5,
        rotation: Math.random() * 360,
        duration: 15 + Math.random() * 15, // Slower: 15-30s
        delay: Math.random() * -30,
        color: Math.random() > 0.5 ? "#ffd700" : "#ffffff", // Gold or White
      });
    }
    setButterflies(newButterflies);
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      {butterflies.map((b) => (
        <div
          key={b.id}
          className="absolute"
          style={{
            left: `${b.left}%`,
            top: `${b.top}%`,
            transform: `rotate(${b.rotation}deg) scale(${b.scale})`,
          }}
        >
          <div
            className="butterfly"
            style={{
              position: "relative", // Override absolute from class if needed, or just rely on wrapper
              animation: `butterfly-float ${b.duration}s linear infinite`,
              animationDelay: `${b.delay}s`,
            }}
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
    </div>
  );
};
