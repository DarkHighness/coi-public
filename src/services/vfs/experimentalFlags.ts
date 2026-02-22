import type { AISettings } from "../../types";

export const isExperimentalVfsVmEnabled = (
  settings: Pick<AISettings, "extra"> | null | undefined,
): boolean => settings?.extra?.vfsVmExperimentalEnabled === true;
