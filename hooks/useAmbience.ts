import { useEffect, useRef, useState } from 'react';

export const useAmbience = (
  environment?: string,
  volume: number = 0.5,
  muted: boolean = false,
  onPlay?: (env: string) => void
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
      audioRef.current.volume = muted ? 0 : volume;
    }
  }, [volume, muted]);

  useEffect(() => {
    // If environment is undefined, fade out current track and stop
    if (!environment) {
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
    }    // If it's the same as current, do nothing
    if (environment === currentEnv) return;

    const playNewTrack = async () => {
      try {
        // 1. Create new audio element
        const newAudio = new Audio(`/audio/${environment}/ambience.mp3`);
        newAudio.loop = true;
        newAudio.volume = 0; // Start silent for fade-in

        // 2. Start playing
        // If muted, we still play but at 0 volume so it's ready when unmuted?
        // Or we just don't play? Let's play at 0 volume to keep logic simple.
        await newAudio.play();

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
        } else {
            newAudio.volume = 0;
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
