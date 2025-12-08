/**
 * WebAudio API based audio manager for ambient sound playback.
 * Solves mobile browser autoplay restrictions by using a shared AudioContext
 * that can be unlocked once through user interaction.
 */

import { ambienceSchema } from "@/services/zodSchemas";

export const ENVIRONMENTS = ambienceSchema.options;

export type Environment = (typeof ENVIRONMENTS)[number];

interface AudioTrack {
  buffer: AudioBuffer | null;
  source: AudioBufferSourceNode | null;
  gainNode: GainNode | null;
  isPlaying: boolean;
}

class WebAudioManager {
  private context: AudioContext | null = null;
  private audioTracks: Map<string, AudioTrack> = new Map();
  private masterGain: GainNode | null = null;
  private isUnlocked: boolean = false;
  private loadingPromise: Promise<void> | null = null;
  private currentEnvironment: string | null = null;
  private fadeInterval: NodeJS.Timeout | null = null;
  /** Target volume - preserved when paused/muted */
  private targetVolume: number = 0.5;
  /** Whether audio is currently paused (muted) */
  private isPaused: boolean = false;
  /** Lock to prevent concurrent play operations */
  private playLock: Promise<boolean> | null = null;
  /** The environment that is currently being switched to (to prevent duplicate switches) */
  private pendingEnvironment: string | null = null;

  /**
   * Initialize or get the AudioContext.
   * On mobile, AudioContext starts in "suspended" state until user interaction.
   */
  private getContext(): AudioContext {
    if (!this.context) {
      this.context = new (window.AudioContext ||
        (window as any).webkitAudioContext)();
      this.masterGain = this.context.createGain();
      this.masterGain.connect(this.context.destination);
    }
    return this.context;
  }

  /**
   * Unlock the AudioContext - MUST be called from a user interaction event.
   * Returns true if successfully unlocked.
   */
  async unlock(): Promise<boolean> {
    const ctx = this.getContext();

    if (ctx.state === "running") {
      this.isUnlocked = true;
      return true;
    }

    try {
      await ctx.resume();
      // After resume(), state should be "running" but TypeScript doesn't know that
      this.isUnlocked = (ctx.state as string) === "running";
      console.log(
        `[WebAudioManager] AudioContext ${this.isUnlocked ? "unlocked" : "still suspended"}`,
      );
      return this.isUnlocked;
    } catch (e) {
      console.warn("[WebAudioManager] Failed to unlock AudioContext:", e);
      return false;
    }
  }

  /**
   * Check if the AudioContext is unlocked and ready to play.
   */
  get isReady(): boolean {
    return this.isUnlocked && this.context?.state === "running";
  }

  /**
   * Preload all environment audio files.
   */
  async preload(onProgress?: (progress: number) => void): Promise<void> {
    if (this.loadingPromise) return this.loadingPromise;

    const ctx = this.getContext();
    let loadedCount = 0;
    const total = ENVIRONMENTS.length;

    const updateProgress = () => {
      loadedCount++;
      onProgress?.(Math.round((loadedCount / total) * 100));
    };

    this.loadingPromise = Promise.all(
      ENVIRONMENTS.map(async (env) => {
        if (this.audioTracks.has(env) && this.audioTracks.get(env)!.buffer) {
          updateProgress();
          return;
        }

        try {
          const response = await fetch(`/audio/${env}/ambience.mp3`);
          if (!response.ok) throw new Error(`HTTP ${response.status}`);

          const arrayBuffer = await response.arrayBuffer();
          const audioBuffer = await ctx.decodeAudioData(arrayBuffer);

          this.audioTracks.set(env, {
            buffer: audioBuffer,
            source: null,
            gainNode: null,
            isPlaying: false,
          });
        } catch (e) {
          console.warn(`[WebAudioManager] Failed to preload ${env}:`, e);
          // Still add to tracks map with null buffer
          this.audioTracks.set(env, {
            buffer: null,
            source: null,
            gainNode: null,
            isPlaying: false,
          });
        }
        updateProgress();
      }),
    ).then(() => {
      console.log("[WebAudioManager] Preload complete");
    });

    return this.loadingPromise;
  }

  /**
   * Clear any pending fade operations.
   */
  private clearFade(): void {
    if (this.fadeInterval) {
      clearInterval(this.fadeInterval);
      this.fadeInterval = null;
    }
  }

  /**
   * Fade the gain of a track.
   */
  private fadeGain(
    gainNode: GainNode,
    targetVolume: number,
    duration: number = 500,
    onComplete?: () => void,
  ): void {
    this.clearFade();

    const ctx = this.getContext();
    const startVolume = gainNode.gain.value;
    const startTime = ctx.currentTime;
    const endTime = startTime + duration / 1000;

    // Use exponential ramp for smoother fade
    gainNode.gain.cancelScheduledValues(startTime);
    gainNode.gain.setValueAtTime(startVolume, startTime);

    if (targetVolume <= 0.001) {
      // Fade to near-zero, then set to 0
      gainNode.gain.exponentialRampToValueAtTime(0.001, endTime);
      gainNode.gain.setValueAtTime(0, endTime);
    } else {
      gainNode.gain.exponentialRampToValueAtTime(
        Math.max(0.001, targetVolume),
        endTime,
      );
    }

    // Call onComplete after duration
    if (onComplete) {
      setTimeout(onComplete, duration);
    }
  }

  /**
   * Play an environment track with optional crossfade from current.
   * Uses a lock to prevent concurrent play operations from causing dual audio.
   */
  async play(
    env: string,
    volume: number = 0.5,
    fadeIn: boolean = true,
  ): Promise<boolean> {
    const normalizedEnv = env.toLowerCase().trim();

    // Validate environment
    if (!ENVIRONMENTS.includes(normalizedEnv as Environment)) {
      console.warn(`[WebAudioManager] Unknown environment: ${env}`);
      return false;
    }

    // If already playing this environment, just adjust volume
    if (this.currentEnvironment === normalizedEnv) {
      const track = this.audioTracks.get(normalizedEnv);
      if (track?.gainNode) {
        this.fadeGain(track.gainNode, volume, 200);
      }
      return true;
    }

    // If this environment is already pending, skip duplicate requests
    if (this.pendingEnvironment === normalizedEnv) {
      console.log(
        `[WebAudioManager] Already switching to ${normalizedEnv}, skipping duplicate request`,
      );
      return true;
    }

    // If there's an ongoing play operation, wait for it to complete first
    if (this.playLock) {
      console.log(
        `[WebAudioManager] Waiting for previous play operation to complete...`,
      );
      await this.playLock;
    }

    // Mark this environment as pending
    this.pendingEnvironment = normalizedEnv;

    // Create a new lock for this play operation
    let resolveLock: (value: boolean) => void;
    this.playLock = new Promise((resolve) => {
      resolveLock = resolve;
    });

    try {
      return await this.playInternal(normalizedEnv, volume, fadeIn);
    } finally {
      // Clear the pending environment and release the lock
      this.pendingEnvironment = null;
      this.playLock = null;
      resolveLock!(true);
    }
  }

  /**
   * Internal play implementation (called with lock held).
   */
  private async playInternal(
    normalizedEnv: string,
    volume: number,
    fadeIn: boolean,
  ): Promise<boolean> {
    const ctx = this.getContext();

    // Check if context is ready
    if (ctx.state !== "running") {
      console.warn(
        "[WebAudioManager] AudioContext not running, attempting unlock...",
      );
      const unlocked = await this.unlock();
      if (!unlocked) {
        console.warn(
          "[WebAudioManager] Could not unlock AudioContext, playback blocked",
        );
        return false;
      }
    }

    // Stop current track immediately (no fade) to prevent overlapping audio
    // The new track will fade in, providing a smooth transition
    if (this.currentEnvironment) {
      this.stop(this.currentEnvironment, false);
    }

    // Get or load the track
    let track = this.audioTracks.get(normalizedEnv);
    if (!track?.buffer) {
      // Try to load on-demand
      try {
        const response = await fetch(`/audio/${normalizedEnv}/ambience.mp3`);
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
        track = {
          buffer: audioBuffer,
          source: null,
          gainNode: null,
          isPlaying: false,
        };
        this.audioTracks.set(normalizedEnv, track);
      } catch (e) {
        console.error(`[WebAudioManager] Failed to load ${normalizedEnv}:`, e);
        return false;
      }
    }

    if (!track.buffer) {
      console.error(
        `[WebAudioManager] No buffer available for ${normalizedEnv}`,
      );
      return false;
    }

    // Create new source and gain nodes
    const source = ctx.createBufferSource();
    source.buffer = track.buffer;
    source.loop = true;

    const gainNode = ctx.createGain();
    gainNode.gain.value = fadeIn ? 0.001 : volume; // Start quiet for fade in

    source.connect(gainNode);
    gainNode.connect(this.masterGain!);

    // Clean up previous source if any
    if (track.source) {
      try {
        track.source.stop();
        track.source.disconnect();
      } catch (e) {
        // Ignore errors from already stopped sources
      }
    }

    // Update track state
    track.source = source;
    track.gainNode = gainNode;
    track.isPlaying = true;

    // Start playback
    source.start(0);
    this.currentEnvironment = normalizedEnv;

    // Fade in
    if (fadeIn) {
      this.fadeGain(gainNode, volume, 500);
    }

    console.log(
      `[WebAudioManager] Playing ${normalizedEnv} at volume ${volume}`,
    );
    return true;
  }

  /**
   * Stop a specific environment track or the current one.
   */
  stop(env?: string, fadeOut: boolean = true): void {
    const targetEnv = env?.toLowerCase().trim() || this.currentEnvironment;
    if (!targetEnv) return;

    const track = this.audioTracks.get(targetEnv);
    if (!track?.source || !track.isPlaying) return;

    const stopTrack = () => {
      try {
        track.source?.stop();
        track.source?.disconnect();
      } catch (e) {
        // Ignore
      }
      track.source = null;
      track.gainNode = null;
      track.isPlaying = false;

      if (this.currentEnvironment === targetEnv) {
        this.currentEnvironment = null;
      }
    };

    if (fadeOut && track.gainNode) {
      this.fadeGain(track.gainNode, 0, 300, stopTrack);
    } else {
      stopTrack();
    }
  }

  /**
   * Stop all tracks.
   */
  stopAll(fadeOut: boolean = true): void {
    this.audioTracks.forEach((_, env) => {
      this.stop(env, fadeOut);
    });
    this.currentEnvironment = null;
  }

  /**
   * Set volume for the currently playing track.
   * If paused/muted, stores the volume for when audio resumes.
   */
  setVolume(volume: number): void {
    // Always save the target volume
    this.targetVolume = volume;

    // If paused, don't apply the volume now - it will be applied on resume
    if (this.isPaused) {
      console.log(
        `[WebAudioManager] Volume set to ${volume} (will apply on resume)`,
      );
      return;
    }

    if (!this.currentEnvironment) return;

    const track = this.audioTracks.get(this.currentEnvironment);
    if (track?.gainNode) {
      this.fadeGain(track.gainNode, volume, 200);
    }
  }

  /**
   * Pause all audio (for muting).
   */
  pause(): void {
    this.isPaused = true;
    if (this.currentEnvironment) {
      const track = this.audioTracks.get(this.currentEnvironment);
      if (track?.gainNode) {
        this.fadeGain(track.gainNode, 0, 300, () => {
          // Keep the source running but at 0 volume
          // This allows instant resume without re-triggering play()
        });
      }
    }
    console.log(`[WebAudioManager] Paused (muted)`);
  }

  /**
   * Resume audio (for unmuting).
   * Uses the stored targetVolume if no volume is explicitly provided.
   */
  resume(volume?: number): void {
    this.isPaused = false;
    // Use provided volume or fall back to stored targetVolume
    const effectiveVolume = volume ?? this.targetVolume;

    if (this.currentEnvironment) {
      const track = this.audioTracks.get(this.currentEnvironment);
      if (track?.gainNode && track.isPlaying) {
        this.fadeGain(track.gainNode, effectiveVolume, 300);
      }
    }
    console.log(`[WebAudioManager] Resumed at volume ${effectiveVolume}`);
  }

  /**
   * Get the currently playing environment.
   */
  getCurrentEnvironment(): string | null {
    return this.currentEnvironment;
  }

  /**
   * Get the current target volume.
   */
  getVolume(): number {
    return this.targetVolume;
  }

  /**
   * Check if audio is currently paused (muted).
   */
  getIsPaused(): boolean {
    return this.isPaused;
  }

  /**
   * Dispose of all resources.
   */
  dispose(): void {
    this.clearFade();
    this.stopAll(false);

    if (this.context) {
      this.context.close();
      this.context = null;
    }

    this.masterGain = null;
    this.audioTracks.clear();
    this.isUnlocked = false;
    this.loadingPromise = null;
  }
}

// Singleton instance
export const webAudioManager = new WebAudioManager();

// Legacy compatibility exports
export const preloadAudio = (
  onProgress?: (progress: number) => void,
): Promise<void> => {
  return webAudioManager.preload(onProgress);
};

export const getAudioTrack = (env: string): null => {
  // This function is deprecated - use webAudioManager.play() instead
  console.warn(
    "[WebAudioManager] getAudioTrack is deprecated, use webAudioManager.play()",
  );
  return null;
};

export const stopAllAudio = (): void => {
  webAudioManager.stopAll();
};
