import React from "react";
import { useTranslation } from "react-i18next";
import { SettingsAudioProps, FunctionKey } from "./types";

export const SettingsAudio: React.FC<SettingsAudioProps> = ({
  currentSettings,
  onUpdateSettings,
}) => {
  const { t } = useTranslation();

  const updateFunction = (func: FunctionKey, field: string, value: any) => {
    const newSettings = {
      ...currentSettings,
      [func]: { ...currentSettings[func], [field]: value },
    };
    onUpdateSettings(newSettings);
  };

  return (
    <div className="p-6 space-y-8 overflow-y-auto custom-scrollbar">
      {/* Environment Audio */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-bold text-theme-primary uppercase tracking-widest">
            {t("audioSettings.environment")}
          </h3>
          <button
            onClick={() =>
              onUpdateSettings({
                ...currentSettings,
                audioVolume: {
                  ...currentSettings.audioVolume,
                  bgmMuted: !currentSettings.audioVolume?.bgmMuted,
                },
              })
            }
            className={`px-3 py-1 rounded text-xs font-bold uppercase tracking-widest border transition-colors ${
              currentSettings.audioVolume?.bgmMuted
                ? "bg-red-500/20 border-red-500 text-red-500"
                : "bg-theme-primary/20 border-theme-primary text-theme-primary"
            }`}
          >
            {currentSettings.audioVolume?.bgmMuted
              ? t("audioSettings.muted")
              : t("audioSettings.active")}
          </button>
        </div>
        <div
          className={`space-y-2 ${
            currentSettings.audioVolume?.bgmMuted ? "opacity-75" : ""
          }`}
        >
          <div className="flex justify-between text-xs text-theme-muted">
            <span>{t("audioSettings.volume")}</span>
            <span>
              {Math.round(
                (currentSettings.audioVolume?.bgmVolume ?? 0.5) * 100,
              )}
              %
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={currentSettings.audioVolume?.bgmVolume ?? 0.5}
            onChange={(e) =>
              onUpdateSettings({
                ...currentSettings,
                audioVolume: {
                  ...currentSettings.audioVolume,
                  bgmVolume: parseFloat(e.target.value),
                },
              })
            }
            className="w-full accent-theme-primary"
          />
        </div>
      </div>

      {/* TTS Audio */}
      <div className="space-y-4 pt-6 border-t border-theme-border">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-bold text-theme-primary uppercase tracking-widest">
            {t("audioSettings.voice")}
          </h3>
          <button
            onClick={() =>
              onUpdateSettings({
                ...currentSettings,
                audioVolume: {
                  ...currentSettings.audioVolume,
                  ttsMuted: !currentSettings.audioVolume?.ttsMuted,
                },
              })
            }
            className={`px-3 py-1 rounded text-xs font-bold uppercase tracking-widest border transition-colors ${
              currentSettings.audioVolume?.ttsMuted
                ? "bg-red-500/20 border-red-500 text-red-500"
                : "bg-theme-primary/20 border-theme-primary text-theme-primary"
            }`}
          >
            {currentSettings.audioVolume?.ttsMuted
              ? t("audioSettings.muted")
              : t("audioSettings.active")}
          </button>
        </div>
        <div
          className={`space-y-2 ${
            currentSettings.audioVolume?.ttsMuted ? "opacity-75" : ""
          }`}
        >
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-theme-muted">
              <span>{t("audioSettings.ttsVolume")}</span>
              <span>
                {Math.round(
                  (currentSettings.audioVolume?.ttsVolume ?? 1) * 100,
                )}
                %
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={currentSettings.audioVolume?.ttsVolume ?? 1}
              onChange={(e) =>
                onUpdateSettings({
                  ...currentSettings,
                  audioVolume: {
                    ...currentSettings.audioVolume,
                    ttsVolume: parseFloat(e.target.value),
                  },
                })
              }
              className="w-full accent-theme-primary"
            />
          </div>

          {/* Voice Selection */}
          <div className="space-y-2 pt-4 border-t border-theme-border/50">
            <label className="text-xs font-bold text-theme-muted uppercase tracking-widest">
              {t("audioSettings.voice")}
            </label>
            <select
              value={currentSettings.audio.voice || "alloy"}
              onChange={(e) => updateFunction("audio", "voice", e.target.value)}
              className="w-full bg-theme-bg border border-theme-border rounded p-2 text-theme-text text-xs focus:border-theme-primary outline-none"
            >
              {currentSettings.audio.provider === "openai" ||
              currentSettings.audio.provider === "openrouter" ? (
                <>
                  <option value="alloy">Alloy (Neutral)</option>
                  <option value="echo">Echo (Male)</option>
                  <option value="fable">Fable (British Male)</option>
                  <option value="onyx">Onyx (Deep Male)</option>
                  <option value="nova">Nova (Female)</option>
                  <option value="shimmer">Shimmer (Female)</option>
                  <option value="ash">Ash (Neutral)</option>
                  <option value="coral">Coral (Female)</option>
                  <option value="sage">Sage (Female)</option>
                </>
              ) : (
                <>
                  {/* Gemini Voices */}
                  <option value="Kore">Kore (Female)</option>
                  <option value="Fenrir">Fenrir (Male)</option>
                  <option value="Luna">Luna (Female)</option>
                  <option value="Puck">Puck (Male)</option>
                  <option value="Enceladus">Enceladus (Male)</option>
                </>
              )}
            </select>
          </div>

          {/* Speed Control */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-theme-muted">
              <span>{t("audioSettings.speed")}</span>
              <span>{currentSettings.audio.speed || 1.0}x</span>
            </div>
            <input
              type="range"
              min="0.25"
              max="4.0"
              step="0.25"
              value={currentSettings.audio.speed || 1.0}
              onChange={(e) =>
                updateFunction("audio", "speed", parseFloat(e.target.value))
              }
              className="w-full accent-theme-primary"
            />
          </div>

          {/* Format Selection */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-theme-muted uppercase tracking-widest">
              {t("audioSettings.format")}
            </label>
            <select
              value={currentSettings.audio.format || "mp3"}
              onChange={(e) =>
                updateFunction("audio", "format", e.target.value)
              }
              className="w-full bg-theme-bg border border-theme-border rounded p-2 text-theme-text text-xs focus:border-theme-primary outline-none"
            >
              <option value="mp3">MP3 (Default)</option>
              <option value="opus">Opus (Low Latency)</option>
              <option value="aac">AAC (Standard)</option>
              <option value="flac">FLAC (Lossless)</option>
              <option value="wav">WAV (Uncompressed)</option>
              <option value="pcm">PCM (Raw)</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
};
