import type { GameState } from "../types";
import { loadMetadata, saveMetadata } from "../utils/indexedDB";
import {
  normalizeLogs,
  normalizeTokenUsage,
  parseRuntimeStats,
  type RuntimeStatsSnapshot,
} from "./runtimeStatsPersistence";

export const runtimeStatsKey = (slotId: string): string =>
  `runtime_stats:${slotId}`;

export const persistRuntimeStats = async (
  slotId: string,
  state: Pick<GameState, "tokenUsage" | "logs">,
): Promise<void> => {
  await saveMetadata(runtimeStatsKey(slotId), {
    tokenUsage: normalizeTokenUsage(state.tokenUsage),
    logs: normalizeLogs(state.logs),
    updatedAt: Date.now(),
  });
};

export const loadRuntimeStats = async (
  slotId: string,
): Promise<RuntimeStatsSnapshot> => {
  const raw = await loadMetadata(runtimeStatsKey(slotId));
  return parseRuntimeStats(raw);
};

