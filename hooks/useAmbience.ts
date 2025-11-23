import { useEffect, useRef, useState } from "react";
import { getAudioTrack } from "../utils/audioLoader";

export const useAmbience = (
  environment?: string,
  volume: number = 0.5,
  muted: boolean = false,
  onPlay?: (env: string) => void,
) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [currentEnv, setCurrentEnv] = useState<string | undefined>(undefined);
  const onPlayRef = useRef(onPlay);

  // Track latest values to handle async race conditions
  const latestEnvRef = useRef(environment);
  const latestMutedRef = useRef(muted);

  useEffect(() => {
    onPlayRef.current = onPlay;
  }, [onPlay]);

  useEffect(() => {
    latestEnvRef.current = environment;
  }, [environment]);

  useEffect(() => {
    latestMutedRef.current = muted;
  }, [muted]);

  // Update volume/mute for active track
  useEffect(() => {
    if (audioRef.current) {
      if (muted) {
        audioRef.current.pause();
      } else {
        audioRef.current.volume = volume;
        // Only resume if it was supposed to be playing (i.e., we have an active environment)
        // AND if the current environment matches what we expect
        if (
          currentEnv &&
          audioRef.current.paused &&
          currentEnv === latestEnvRef.current
        ) {
          audioRef.current.play().catch((e) => {
            console.warn("Resume failed:", e);
          });
        }
      }
    }
  }, [volume, muted, currentEnv]);

  useEffect(() => {
    let isCancelled = false;

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
    }

    // If it's the same as current, do nothing
    if (environment === currentEnv) return;

    const playNewTrack = async () => {
      try {
        // 1. Get cached audio element
        const newAudio = getAudioTrack(environment);
        if (!newAudio) return; // Should not happen with fallback

        // Reset volume just in case
        newAudio.volume = 0;

        // 2. Start playing ONLY if not muted AND not cancelled
        // We check latestMutedRef because 'muted' prop might have changed while we were setting up
        if (!latestMutedRef.current && !isCancelled) {
          try {
            await newAudio.play();
          } catch (e) {
            console.warn("Audio autoplay blocked or failed:", e);
          }
        }

        if (isCancelled) {
          newAudio.pause();
          return;
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
        if (!latestMutedRef.current && !isCancelled) {
          const targetVolume = volume;
          const fadeInInterval = setInterval(() => {
            if (isCancelled) {
              clearInterval(fadeInInterval);
              return;
            }
            if (newAudio.volume < targetVolume - 0.05) {
              newAudio.volume += 0.05;
            } else {
              newAudio.volume = targetVolume;
              clearInterval(fadeInInterval);
            }
          }, 100);
        }

        // 5. Update ref and state
        if (!isCancelled) {
          audioRef.current = newAudio;
          setCurrentEnv(environment);
          if (onPlayRef.current) {
            onPlayRef.current(environment);
          }
        }
      } catch (error) {
        console.warn(`Failed to play ambience for ${environment}:`, error);
      }
    };

    playNewTrack();

    // Cleanup on unmount or dependency change
    return () => {
      isCancelled = true;
      // Note: We don't stop audioRef.current here immediately because we want the fade-out logic
      // in the NEXT effect run to handle it (or the fade-out block above).
      // However, if we are unmounting completely, we should stop it.
      // But this cleanup runs on every dependency change (env change).
      // The "fade out old track" logic in the next run handles the transition.
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
