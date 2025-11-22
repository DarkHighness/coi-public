import { useEffect, useRef, useState } from "react";

export const useAmbience = (
  environment?: string,
  volume: number = 0.5,
  muted: boolean = false,
  onPlay?: (env: string) => void,
) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [currentEnv, setCurrentEnv] = useState<string | undefined>(undefined);
  const onPlayRef = useRef(onPlay);

  useEffect(() => {
    onPlayRef.current = onPlay;
  }, [onPlay]);

  // Update volume/mute for active track
  useEffect(() => {
    if (audioRef.current) {
      if (muted) {
        audioRef.current.pause();
      } else {
        audioRef.current.volume = volume;
        // Only resume if it was supposed to be playing (i.e., we have an active environment)
        if (currentEnv && audioRef.current.paused) {
          audioRef.current.play().catch((e) => {
            console.warn("Resume failed:", e);
          });
        }
      }
    }
  }, [volume, muted, currentEnv]);

  useEffect(() => {
    // If environment is undefined or "Unknown", fade out current track and stop
    if (!environment || environment === "Unknown") {
      if (audioRef.current) {
        const oldAudio = audioRef.current;
        // Clear ref immediately to prevent race conditions
        audioRef.current = null;

        const fadeOutInterval = setInterval(() => {
          if (oldAudio.volume > 0.05) {
            oldAudio.volume -= 0.05;
          } else {
            oldAudio.volume = 0;
            oldAudio.pause();
            clearInterval(fadeOutInterval);
          }
        }, 100);
      }

      // Always reset currentEnv if environment is missing, even if audioRef was null
      if (currentEnv !== undefined) {
        setCurrentEnv(undefined);
      }
      return;
    } // If it's the same as current, do nothing
    if (environment === currentEnv) return;

    const playNewTrack = async () => {
      try {
        // 1. Create new audio element
        const newAudio = new Audio(`/audio/${environment}/ambience.mp3`);
        newAudio.loop = true;
        newAudio.volume = 0; // Start silent for fade-in

        // 2. Start playing ONLY if not muted
        if (!muted) {
          try {
            await newAudio.play();
          } catch (e) {
            console.warn("Audio autoplay blocked or failed:", e);
          }
        }

        // 3. Fade out old track if it exists
        if (audioRef.current) {
          const oldAudio = audioRef.current;
          const fadeOutInterval = setInterval(() => {
            if (oldAudio.volume > 0.05) {
              oldAudio.volume -= 0.05;
            } else {
              oldAudio.volume = 0;
              oldAudio.pause();
              clearInterval(fadeOutInterval);
            }
          }, 100);
        }

        // 4. Fade in new track (only if not muted)
        if (!muted) {
          const targetVolume = volume;
          const fadeInInterval = setInterval(() => {
            if (newAudio.volume < targetVolume - 0.05) {
              newAudio.volume += 0.05;
            } else {
              newAudio.volume = targetVolume;
              clearInterval(fadeInInterval);
            }
          }, 100);
        }

        // 5. Update ref and state
        audioRef.current = newAudio;
        setCurrentEnv(environment);
        if (onPlayRef.current) {
          onPlayRef.current(environment);
        }
      } catch (error) {
        console.warn(`Failed to play ambience for ${environment}:`, error);
      }
    };

    playNewTrack();

    // Cleanup on unmount (stop all audio)
    return () => {
      // We don't stop audio here because we want it to persist across re-renders unless environment changes
    };
  }, [environment, currentEnv]); // Removed volume/muted from dependency to avoid restarting track on volume change

  // Cleanup on full unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);
};
