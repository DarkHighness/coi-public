export const ENVIRONMENTS = [
  "cave",
  "city",
  "combat",
  "desert",
  "dungeon",
  "forest",
  "horror",
  "market",
  "mystical",
  "ocean",
  "quiet",
  "rain",
  "scifi",
  "snow",
  "storm",
  "tavern",
];

// Store preloaded audio elements - each environment has ONE dedicated audio element
const audioCache = new Map<string, HTMLAudioElement>();

let loadingPromise: Promise<void> | null = null;

export const preloadAudio = (
  onProgress?: (progress: number) => void,
): Promise<void> => {
  if (loadingPromise) return loadingPromise;

  let loadedCount = 0;
  const total = ENVIRONMENTS.length;

  const updateProgress = () => {
    loadedCount++;
    if (onProgress) {
      onProgress(Math.round((loadedCount / total) * 100));
    }
  };

  loadingPromise = Promise.all(
    ENVIRONMENTS.map((env) => {
      return new Promise<void>((resolve) => {
        if (audioCache.has(env)) {
          updateProgress();
          resolve();
          return;
        }

        const audio = new Audio(`/audio/${env}/ambience.mp3`);
        audio.loop = true;
        audio.preload = "auto";
        audio.volume = 0; // Start silent

        const onLoaded = () => {
          updateProgress();
          resolve();
        };

        audio.addEventListener("canplaythrough", onLoaded, { once: true });
        audio.addEventListener("error", () => {
          console.warn(`Failed to preload audio for ${env}`);
          updateProgress();
          resolve();
        });

        audioCache.set(env, audio);
      });
    }),
  ).then(() => {});

  return loadingPromise;
};

/**
 * Get the audio track for an environment.
 * Returns the SAME audio element for each environment to prevent duplicate playback.
 * The caller is responsible for controlling play/pause state.
 */
export const getAudioTrack = (env: string): HTMLAudioElement | null => {
  // Normalize environment name
  const normalizedEnv = env.toLowerCase().trim();

  if (audioCache.has(normalizedEnv)) {
    return audioCache.get(normalizedEnv)!;
  }

  // Check if it's a valid environment
  if (!ENVIRONMENTS.includes(normalizedEnv)) {
    console.warn(`Unknown environment: ${env}, falling back to 'quiet'`);
    return audioCache.get('quiet') || null;
  }

  // Fallback if not preloaded (should rarely happen)
  console.warn(`Audio track for ${env} was not preloaded, loading now...`);
  const audio = new Audio(`/audio/${normalizedEnv}/ambience.mp3`);
  audio.loop = true;
  audio.volume = 0;
  audioCache.set(normalizedEnv, audio);
  return audio;
};

/**
 * Stop all audio tracks - useful for cleanup
 */
export const stopAllAudio = () => {
  audioCache.forEach((audio) => {
    audio.pause();
    audio.currentTime = 0;
    audio.volume = 0;
  });
};
