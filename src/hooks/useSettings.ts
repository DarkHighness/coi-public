import { useSettingsContext } from "../contexts/SettingsContext";

/**
 * Settings Hook - Access global settings state
 * Now a wrapper around SettingsContext
 */
export const useSettings = () => {
  return useSettingsContext();
};

export type UseSettingsReturn = ReturnType<typeof useSettings>;
