import { ENV_THEMES } from "../utils/constants/envThemes";
import { getThemeKeyForAtmosphere } from "../utils/constants/atmosphere";
import type { AISettings, GameState, ThemeConfig } from "../types";
import type { RuntimeMetaState } from "./actions";
import type { RagRuntimeState } from "./ragRuntime";
import type { RuntimeEngineState, RuntimeState } from "./state";

export type RuntimeEngineBaseState = Omit<
  RuntimeEngineState,
  "currentThemeConfig" | "themeFont"
>;

type RuntimeRagSnapshot = Pick<
  RagRuntimeState,
  | "isInitialized"
  | "isLoading"
  | "status"
  | "error"
  | "modelMismatch"
  | "storageOverflow"
  | "currentSaveId"
>;

export function resolveRuntimeThemeConfig(
  gameState: Pick<GameState, "theme" | "atmosphere">,
  aiSettings: Pick<AISettings, "lockEnvTheme" | "fixedEnvTheme">,
): ThemeConfig {
  const currentEnvThemeKey = aiSettings.lockEnvTheme
    ? aiSettings.fixedEnvTheme || gameState.atmosphere?.envTheme || "fantasy"
    : getThemeKeyForAtmosphere(
        gameState.atmosphere || { envTheme: "fantasy", ambience: "quiet" },
      );

  return ENV_THEMES[currentEnvThemeKey] || ENV_THEMES.fantasy;
}

export function buildRuntimeEngineState(
  baseState: RuntimeEngineBaseState,
  currentThemeConfig: ThemeConfig,
): RuntimeEngineState {
  return {
    ...baseState,
    currentThemeConfig,
    themeFont: currentThemeConfig.fontClass,
  };
}

export function buildRuntimeState(
  engineState: RuntimeEngineState,
  ragState: RuntimeRagSnapshot,
  metaState: RuntimeMetaState,
): RuntimeState {
  return {
    ...engineState,
    domain: {
      gameState: engineState.gameState,
      currentHistory: engineState.currentHistory,
      saveSlots: engineState.saveSlots,
      currentSlotId: engineState.currentSlotId,
      vfsSession: engineState.vfsSession,
    },
    ui: {
      themeMode: engineState.themeMode,
      isSettingsOpen: engineState.isSettingsOpen,
      isMagicMirrorOpen: engineState.isMagicMirrorOpen,
      isVeoScriptOpen: engineState.isVeoScriptOpen,
      themeFont: engineState.themeFont,
    },
    async: {
      isTranslating: engineState.isTranslating,
      isAutoSaving: engineState.isAutoSaving,
      persistenceError: engineState.persistenceError,
    },
    rag: {
      isInitialized: ragState.isInitialized,
      isLoading: ragState.isLoading,
      status: ragState.status,
      error: ragState.error,
      modelMismatch: ragState.modelMismatch,
      storageOverflow: ragState.storageOverflow,
      currentSaveId: ragState.currentSaveId,
    },
    runtimeRevision: metaState.runtimeRevision,
    lastMutationReason: metaState.lastMutationReason,
  };
}
