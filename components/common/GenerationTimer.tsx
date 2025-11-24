import React, { useEffect, useState } from "react";

interface GenerationTimerProps {
  isActive: boolean;
  className?: string;
}

export const GenerationTimer: React.FC<GenerationTimerProps> = ({
  isActive,
  className = "",
}) => {
  const [elapsedTime, setElapsedTime] = useState(0);

  useEffect(() => {
    let timer: NodeJS.Timeout;

    if (isActive) {
      // Reset timer when it becomes active
      setElapsedTime(0);
      timer = setInterval(() => {
        setElapsedTime((prev) => prev + 1);
      }, 1000);
    } else {
      setElapsedTime(0);
    }

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isActive]);

  if (!isActive) return null;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className={`font-mono text-xs opacity-70 ${className}`}>
      {formatTime(elapsedTime)}
    </div>
  );
};
