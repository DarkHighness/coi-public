import { AISettings, ModelInfo } from "../../types";

export type Tab = "credentials" | "models" | "audio" | "appearance" | "data";

export type FunctionKey =
  | "story"
  | "image"
  | "video"
  | "audio"
  | "translation"
  | "lore"
  | "script";

export interface SettingsTabProps {
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
}

export interface SettingsAppearanceProps {
  themeMode?: "day" | "night" | "system";
  onSetThemeMode?: (mode: "day" | "night" | "system") => void;
}

export interface SettingsDataProps {
  saveCount?: number;
  onResetSettings?: () => void;
  onClearAllSaves?: () => Promise<boolean>;
  showToast: (msg: string, type?: "info" | "error") => void;
}

export interface SettingsCredentialsProps {
  currentSettings: AISettings;
  onUpdateSettings: (settings: AISettings) => void;
  showToast: (msg: string, type?: "info" | "error") => void;
  onLoadModels: (force?: boolean) => void;
}

export interface SettingsModelsProps {
  currentSettings: AISettings;
  onUpdateSettings: (settings: AISettings) => void;
  loadingModels: boolean;
  onLoadModels: (force?: boolean) => void;
  geminiModels: ModelInfo[];
  openaiModels: ModelInfo[];
  openrouterModels: ModelInfo[];
  showToast: (msg: string, type?: "info" | "error") => void;
}

export interface SettingsAudioProps {
  currentSettings: AISettings;
  onUpdateSettings: (settings: AISettings) => void;
}
