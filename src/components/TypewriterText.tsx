import React, { useState, useEffect, useRef } from "react";
import { MarkdownText } from "./render/MarkdownText";

interface TypewriterTextProps {
  text: string;
  speed?: number;
  onComplete?: () => void;
  instant?: boolean;
  enableMarkdown?: boolean;
}

export const TypewriterText: React.FC<TypewriterTextProps> = ({
  text,
  speed = 50,
  onComplete,
  instant = false,
  enableMarkdown = false,
}) => {
  const [displayedLength, setDisplayedLength] = useState(
    instant ? text.length : 0,
  );
  const onCompleteRef = useRef(onComplete);
  const textRef = useRef(text);

  // Keep ref updated
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    textRef.current = text;
  }, [text]);

  // Handle instant mode changes
  useEffect(() => {
    if (instant) {
      setDisplayedLength(text.length);
    }
  }, [instant, text.length]);

  // Typing animation
  useEffect(() => {
    if (instant) return;

    const timer = setInterval(() => {
      setDisplayedLength((prev) => {
        const currentTextLength = textRef.current.length;
        if (prev < currentTextLength) {
          return prev + 1;
        }
        return prev;
      });
    }, speed);

    return () => clearInterval(timer);
  }, [speed, instant]);

  // Completion check with debounce
  // Only trigger onComplete if we've been at the end of the text for a moment
  // This prevents marking as "read" prematurely during streaming
  useEffect(() => {
    if (displayedLength >= text.length && !instant) {
      const timeout = setTimeout(() => {
        onCompleteRef.current?.();
      }, 500);
      return () => clearTimeout(timeout);
    }
  }, [displayedLength, text.length, instant]);

  const displayedText = text.slice(0, displayedLength);

  return (
    <div className="story-text text-theme-text">
      {enableMarkdown ? (
        <MarkdownText content={displayedText} />
      ) : (
        <div className="whitespace-pre-line">{displayedText}</div>
      )}
      {!instant && displayedLength < text.length && (
        <span className="inline-block w-1.5 h-5 ml-0.5 align-middle bg-theme-primary animate-pulse"></span>
      )}
    </div>
  );
};
