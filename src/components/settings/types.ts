export type Tab =
  | "providers"
  | "models"
  | "embedding"
  | "audio"
  | "appearance"
  | "data"
  | "memory"
  | "skills"
  | "extra";

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

export interface SettingsDataProps {
  saveCount?: number;
  onResetSettings?: () => void;
  onClearAllSaves?: () => Promise<boolean>;
  showToast: (msg: string, type?: "info" | "error") => void;
}
