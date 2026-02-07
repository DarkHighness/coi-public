import type { GameState } from "../types";
import type { RuntimeStatsSnapshot } from "./runtimeStatsPersistence";
import { mergeDerivedViewState } from "./vfsViewState";

interface BuildRestoredGameStateParams {
  previous: GameState;
  derived: GameState;
  storedUiState: unknown;
  runtimeStats: RuntimeStatsSnapshot;
  mergeUiState: (
    base: GameState["uiState"],
    stored: unknown,
  ) => GameState["uiState"];
}

export const buildRestoredGameState = ({
  previous,
  derived,
  storedUiState,
  runtimeStats,
  mergeUiState,
}: BuildRestoredGameStateParams): GameState => {
  // Restore precedence (highest -> lowest):
  // 1) runtime_stats metadata (tokenUsage/logs)
  // 2) derived VFS view state for world/story fields
  // 3) previous in-memory runtime leftovers (reset by mergeDerivedViewState)
  const merged = mergeDerivedViewState(
    {
      ...previous,
      uiState: mergeUiState(previous.uiState, storedUiState),
    },
    derived,
    { resetRuntime: true },
  );

  return {
    ...merged,
    tokenUsage: runtimeStats.tokenUsage,
    logs: runtimeStats.logs,
    unlockMode: runtimeStats.unlockMode,
    godMode: runtimeStats.godMode,
  };
};
