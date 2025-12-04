import { useEffect, useRef, useState, useCallback } from "react";
import { webAudioManager } from "../utils/webAudioManager";
import {
  type AtmosphereObject,
  type Ambience,
} from "../utils/constants/atmosphere";

/**
 * useAmbience - Manages background ambient audio using WebAudio API
 *
 * Features:
 * 1. Uses WebAudio API for better mobile browser support
 * 2. Properly handles mute/unmute without blocking
 * 3. Smooth fade transitions between environments
 * 4. Mobile-friendly with unlockAudio for user interaction requirements
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
  const [currentEnv, setCurrentEnv] = useState<Ambience | undefined>(undefined);
  const onPlayRef = useRef(onPlay);
  const isMountedRef = useRef(true);
  const lastEnvironmentRef = useRef<Ambience | undefined>(undefined);

  // Extract ambience key from atmosphere object
  const environment: Ambience | undefined = atmosphere?.ambience;

  // Keep callback ref updated
  useEffect(() => {
    onPlayRef.current = onPlay;
  }, [onPlay]);

  // Handle volume changes - always update the manager's target volume
  useEffect(() => {
    // Always set the volume in the manager (it will handle muted state internally)
    webAudioManager.setVolume(volume);
  }, [volume]);

  // Handle mute/unmute
  useEffect(() => {
    if (!currentEnv) return;

    if (muted) {
      webAudioManager.pause();
    } else {
      // Resume will use the stored targetVolume from setVolume
      webAudioManager.resume();
    }
  }, [muted, currentEnv]);

  // Handle environment changes
  useEffect(() => {
    // No environment means stop
    if (!environment) {
      if (currentEnv) {
        webAudioManager.stop();
        setCurrentEnv(undefined);
        lastEnvironmentRef.current = undefined;
      }
      return;
    }

    // Same environment, do nothing
    if (environment === lastEnvironmentRef.current) return;

    // Play the new environment
    const playEnvironment = async () => {
      // Don't play if muted, but track the environment
      if (muted) {
        if (isMountedRef.current) {
          setCurrentEnv(environment);
          lastEnvironmentRef.current = environment;
          onPlayRef.current?.(environment);
        }
        return;
      }

      const success = await webAudioManager.play(environment, volume, true);

      if (success && isMountedRef.current) {
        setCurrentEnv(environment);
        lastEnvironmentRef.current = environment;
        onPlayRef.current?.(environment);
      }
    };

    playEnvironment();
  }, [environment, muted, volume]);

  /**
   * Unlock audio playback - MUST be called from a user interaction event handler.
   * On mobile browsers, this is required before any audio can play.
   * Returns true if successfully unlocked.
   */
  const unlockAudio = useCallback(async (): Promise<boolean> => {
    const success = await webAudioManager.unlock();

    // If we have a pending environment to play and we're not muted, play it now
    if (success && lastEnvironmentRef.current && !muted) {
      await webAudioManager.play(lastEnvironmentRef.current, volume, true);
    }

    return success;
  }, [muted, volume]);

  /**
   * Resume audio playback - useful when unmuting from a user interaction.
   * This ensures the AudioContext is unlocked before resuming.
   */
  const resumeAudio = useCallback(async (): Promise<void> => {
    // First ensure the context is unlocked
    await webAudioManager.unlock();

    // If we have an environment and we're not muted, resume/play
    if (lastEnvironmentRef.current && !muted) {
      const currentPlaying = webAudioManager.getCurrentEnvironment();
      if (currentPlaying === lastEnvironmentRef.current) {
        // Just resume the volume (will use stored targetVolume)
        webAudioManager.resume();
      } else {
        // Need to start playing
        await webAudioManager.play(lastEnvironmentRef.current, volume, true);
      }
    }
  }, [muted, volume]);

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
      // Don't stop audio on unmount - let it continue if user navigates
      // The audio will be stopped when explicitly requested or on page unload
    };
  }, []);

  return { currentEnv, unlockAudio, resumeAudio };
};
