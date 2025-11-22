import { useState, useRef, useEffect } from "react";
import { generateSpeech } from "../services/aiService";
import { loadAudio, saveAudio } from "../utils/indexedDB";

export const useStoryAudio = (
  text: string,
  volume: number = 1.0,
  muted: boolean = false,
  onWarning?: (msg: string) => void,
  narrativeTone?: string,
  segmentId?: string,
  audioKey?: string,
  onAudioGenerated?: (key: string) => void,
) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);

  useEffect(() => {
    return () => {
      stopAudio();
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  // Update volume dynamically if playing
  useEffect(() => {
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = muted ? 0 : volume;
    }
  }, [volume, muted]);

  const stopAudio = () => {
    if (sourceNodeRef.current) {
      sourceNodeRef.current.stop();
      sourceNodeRef.current = null;
    }
    setIsPlaying(false);
  };

  const playAudio = async () => {
    if (muted) {
      onWarning?.("Voice is muted in settings.");
      return;
    }

    if (isPlaying) {
      stopAudio();
      return;
    }

    setIsLoadingAudio(true);

    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext ||
          (window as any).webkitAudioContext)({ sampleRate: 24000 });
        gainNodeRef.current = audioContextRef.current.createGain();
        gainNodeRef.current.connect(audioContextRef.current.destination);
      }

      if (gainNodeRef.current) {
        gainNodeRef.current.gain.value = volume;
      }

      if (audioContextRef.current.state === "suspended") {
        await audioContextRef.current.resume();
      }

      let audioData: Uint8Array | null = null;

      // 1. Try loading from cache if we have a key
      if (audioKey) {
        const blob = await loadAudio(audioKey);
        if (blob) {
          const arrayBuffer = await blob.arrayBuffer();
          audioData = new Uint8Array(arrayBuffer);
        }
      }

      // 2. If not found or no key, generate
      if (!audioData) {
        const arrayBuffer = await generateSpeech(
          text,
          undefined,
          narrativeTone,
        );

        if (arrayBuffer) {
          audioData = new Uint8Array(arrayBuffer);

          // 3. Save if we have a segmentId
          if (segmentId) {
            // Convert to Blob for storage
            // Note: We should ideally know the mime type from the format setting, but for now we default to audio/mpeg or similar.
            // Since we don't know the exact format here easily without checking settings, we can just store as generic binary or assume based on default.
            // However, Blob type isn't strictly required for IndexedDB storage, but helpful.
            const blob = new Blob([arrayBuffer], { type: "audio/mpeg" });
            await saveAudio(segmentId, blob);
            if (onAudioGenerated) {
              onAudioGenerated(segmentId);
            }
          }
        }
      }

      if (!audioData) {
        console.error("No audio data available to play.");
        setIsLoadingAudio(false);
        return;
      }

      const audioBuffer = await audioContextRef.current.decodeAudioData(
        audioData.buffer as ArrayBuffer,
      );

      const source = audioContextRef.current.createBufferSource();
      source.buffer = audioBuffer;

      // Connect to gain node instead of destination
      if (gainNodeRef.current) {
        source.connect(gainNodeRef.current);
      } else {
        source.connect(audioContextRef.current.destination);
      }

      source.onended = () => {
        setIsPlaying(false);
      };

      source.start();
      sourceNodeRef.current = source;
      setIsPlaying(true);
    } catch (error) {
      console.error("Failed to play audio:", error);
    } finally {
      setIsLoadingAudio(false);
    }
  };

  return {
    isPlaying,
    isLoadingAudio,
    playAudio,
    stopAudio,
  };
};
