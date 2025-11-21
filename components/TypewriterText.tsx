import React, { useState, useEffect } from "react";

interface TypewriterTextProps {
  text: string;
  speed?: number;
  onComplete?: () => void;
  instant?: boolean;
}

export const TypewriterText: React.FC<TypewriterTextProps> = ({
  text,
  speed = 20,
  onComplete,
  instant = false,
}) => {
  const [displayedText, setDisplayedText] = useState(instant ? text : "");

  useEffect(() => {
    if (instant) {
      setDisplayedText(text);
      if (onComplete) onComplete();
      return;
    }

    setDisplayedText("");
    let i = 0;
    const timer = setInterval(() => {
      if (i < text.length) {
        setDisplayedText((prev) => prev + text.charAt(i));
        i++;
      } else {
        clearInterval(timer);
        if (onComplete) onComplete();
      }
    }, speed);

    return () => clearInterval(timer);
  }, [text, speed, onComplete, instant]);

  return (
    <div className="story-text text-lg leading-relaxed text-slate-200 whitespace-pre-line">
      {displayedText}
    </div>
  );
};
