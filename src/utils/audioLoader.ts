/**
 * audioLoader.ts - Legacy compatibility layer for WebAudioManager
 *
 * This module now wraps webAudioManager for backward compatibility.
 * New code should import directly from webAudioManager.
 */

export {
  ENVIRONMENTS,
  preloadAudio,
  stopAllAudio,
  webAudioManager,
} from "./webAudioManager";

// Legacy function - deprecated
export const getAudioTrack = (env: string): null => {
  console.warn(
    "[audioLoader] getAudioTrack is deprecated, use webAudioManager.play()",
  );
  return null;
};
