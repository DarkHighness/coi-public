import type { AISettings } from "@/types";
import type { VfsSession } from "./vfsSession";
import {
  GLOBAL_SOUL_CANONICAL_PATH,
  GLOBAL_SOUL_LOGICAL_PATH,
  normalizeSoulMarkdown,
} from "./soulTemplates";

const GLOBAL_SOUL_PATH_CANDIDATES = [
  GLOBAL_SOUL_CANONICAL_PATH,
  GLOBAL_SOUL_LOGICAL_PATH,
  `current/${GLOBAL_SOUL_LOGICAL_PATH}`,
];

const readSoulMarkdownFromSnapshot = (
  snapshot: ReturnType<VfsSession["snapshot"]>,
): string | null => {
  for (const path of GLOBAL_SOUL_PATH_CANDIDATES) {
    const file = snapshot[path];
    if (!file) continue;
    if (
      file.contentType === "text/markdown" ||
      file.contentType === "text/plain"
    ) {
      return normalizeSoulMarkdown("global", file.content);
    }
  }
  return null;
};

export const syncSettingsFromGlobalSoulAfterTurn = (params: {
  snapshot: ReturnType<VfsSession["snapshot"]>;
  settings: AISettings;
  updateSettings: (next: AISettings) => void;
}): void => {
  const globalSoul = readSoulMarkdownFromSnapshot(params.snapshot);
  if (!globalSoul) return;
  if (globalSoul === params.settings.playerProfile) return;

  params.updateSettings({
    ...params.settings,
    playerProfile: globalSoul,
  });
};

export const reconcileGlobalSoulWithSettingsOnLoad = (params: {
  vfsSession: VfsSession;
  settings: AISettings;
  updateSettings: (next: AISettings) => void;
}): void => {
  const snapshot = params.vfsSession.snapshot();
  const mirrorSoul = readSoulMarkdownFromSnapshot(snapshot);
  const settingsSoul = params.settings.playerProfile;

  const hasSettingsSoul =
    typeof settingsSoul === "string" && settingsSoul.trim().length > 0;
  const hasMirrorSoul = typeof mirrorSoul === "string" && mirrorSoul.length > 0;

  if (!hasSettingsSoul && hasMirrorSoul) {
    params.updateSettings({
      ...params.settings,
      playerProfile: mirrorSoul,
    });
    return;
  }

  if (hasSettingsSoul && settingsSoul !== mirrorSoul) {
    params.vfsSession.writeFile(
      GLOBAL_SOUL_LOGICAL_PATH,
      normalizeSoulMarkdown("global", settingsSoul),
      "text/markdown",
    );
  }
};
