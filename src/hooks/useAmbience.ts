import { useEffect, useRef, useState, useCallback } from "react";
import { getAudioTrack } from "../utils/audioLoader";
import {
  type AtmosphereObject,
  type Ambience,
} from "../utils/constants/atmosphere";

/**
 * useAmbience - Manages background ambient audio with proper lifecycle handling
 *
 * FIXES:
 * 1. Prevents multiple audio tracks from playing simultaneously
 * 2. Properly handles mute/unmute without restarting track
 * 3. Smooth fade transitions between environments
 * 4. Mobile-friendly with proper cleanup
 *
 * @param atmosphere - The atmosphere object containing envTheme and ambience
 * @param volume - Volume level (0-1)
 * @param muted - Whether audio is muted
 * @param onPlay - Callback when a new ambience starts playing
 */
export const useAmbience = (
  atmosphere?: AtmosphereObject,
  volume: number = 0.5,
  muted: boolean = false,
  onPlay?: (ambience: Ambience) => void,
) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [currentEnv, setCurrentEnv] = useState<Ambience | undefined>(undefined);
  const onPlayRef = useRef(onPlay);
  const fadeIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  // Extract ambience key from atmosphere object
  const environment: Ambience | undefined = atmosphere?.ambience;

  // Keep callback ref updated
  useEffect(() => {
    onPlayRef.current = onPlay;
  }, [onPlay]);

  // Cleanup fade interval helper
  const clearFadeInterval = useCallback(() => {
    if (fadeIntervalRef.current) {
      clearInterval(fadeIntervalRef.current);
      fadeIntervalRef.current = null;
    }
  }, []);

  // Fade out and stop helper
  const fadeOutAndStop = useCallback(
    (audio: HTMLAudioElement, callback?: () => void) => {
      clearFadeInterval();

      if (audio.volume <= 0.01) {
        audio.pause();
        audio.currentTime = 0;
        callback?.();
        return;
      }

      fadeIntervalRef.current = setInterval(() => {
        if (audio.volume > 0.05) {
          audio.volume = Math.max(0, audio.volume - 0.05);
        } else {
          audio.volume = 0;
          audio.pause();
          audio.currentTime = 0;
          clearFadeInterval();
          callback?.();
        }
      }, 50);
    },
    [clearFadeInterval],
  );

  // Fade in helper
  const fadeIn = useCallback(
    (audio: HTMLAudioElement, targetVolume: number) => {
      clearFadeInterval();

      fadeIntervalRef.current = setInterval(() => {
        if (!isMountedRef.current) {
          clearFadeInterval();
          return;
        }
        if (audio.volume < targetVolume - 0.05) {
          audio.volume = Math.min(targetVolume, audio.volume + 0.05);
        } else {
          audio.volume = targetVolume;
          clearFadeInterval();
        }
      }, 50);
    },
    [clearFadeInterval],
  );

  // Handle volume changes (without restarting)
  useEffect(() => {
    if (audioRef.current && !muted && currentEnv) {
      audioRef.current.volume = volume;
    }
  }, [volume, currentEnv, muted]);

  // Handle mute/unmute
  useEffect(() => {
    if (!audioRef.current || !currentEnv) return;

    if (muted) {
      // Fade out when muted
      clearFadeInterval();
      fadeIntervalRef.current = setInterval(() => {
        if (audioRef.current && audioRef.current.volume > 0.05) {
          audioRef.current.volume = Math.max(0, audioRef.current.volume - 0.1);
        } else if (audioRef.current) {
          audioRef.current.volume = 0;
          audioRef.current.pause();
          clearFadeInterval();
        }
      }, 50);
    } else {
      // Resume and fade in when unmuted
      if (audioRef.current.paused) {
        audioRef.current.volume = 0;
        audioRef.current.play().catch((e) => console.warn("Resume failed:", e));
      }
      fadeIn(audioRef.current, volume);
    }
  }, [muted, currentEnv, volume, fadeIn, clearFadeInterval]);

  // Handle environment changes
  useEffect(() => {
    // No environment means stop
    if (!environment) {
      if (audioRef.current) {
        fadeOutAndStop(audioRef.current, () => {
          audioRef.current = null;
        });
      }
      setCurrentEnv(undefined);
      return;
    }

    // Same environment, do nothing
    if (environment === currentEnv) return;

    const playNewTrack = async () => {
      // Get the new audio element
      const newAudio = getAudioTrack(environment);
      if (!newAudio || !isMountedRef.current) return;

      // Prepare new audio
      newAudio.volume = 0;
      newAudio.currentTime = 0;

      // Fade out old track first if exists
      if (audioRef.current && audioRef.current !== newAudio) {
        const oldAudio = audioRef.current;
        fadeOutAndStop(oldAudio);
      }

      // Set new audio as current
      audioRef.current = newAudio;

      // Start playing if not muted
      if (!muted) {
        try {
          await newAudio.play();
          if (isMountedRef.current) {
            fadeIn(newAudio, volume);
          }
        } catch (e) {
          console.warn("Audio autoplay blocked:", e);
        }
      }

      // Update state and notify
      if (isMountedRef.current) {
        setCurrentEnv(environment);
        onPlayRef.current?.(environment);
      }
    };

    playNewTrack();
  }, [environment, currentEnv, muted, volume, fadeOutAndStop, fadeIn]);

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
      clearFadeInterval();
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.volume = 0;
        audioRef.current = null;
      }
    };
  }, [clearFadeInterval]);

  return { currentEnv };
};
