export const ENVIRONMENTS = [
  "cave",
  "city",
  "combat",
  "desert",
  "dungeon",
  "forest",
  "market",
  "mystical",
  "ocean",
  "quiet",
  "rain",
  "snow",
  "storm",
  "tavern",
];

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

export const getAudioTrack = (env: string): HTMLAudioElement | null => {
  if (audioCache.has(env)) {
    const audio = audioCache.get(env)!;
    // Reset state just in case
    audio.currentTime = 0;
    audio.volume = 0;
    return audio;
  }

  // Fallback if not preloaded
  console.warn(`Audio track for ${env} was not preloaded.`);
  const audio = new Audio(`/audio/${env}/ambience.mp3`);
  audio.loop = true;
  audioCache.set(env, audio);
  return audio;
};
