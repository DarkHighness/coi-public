import type {
  RuntimeAsyncState,
  RuntimeDomainState,
  RuntimeRagState,
  RuntimeState,
  RuntimeUiState,
} from "./state";

export const selectRuntimeDomain = (state: RuntimeState): RuntimeDomainState =>
  state.domain;

export const selectRuntimeUi = (state: RuntimeState): RuntimeUiState =>
  state.ui;

export const selectRuntimeAsync = (state: RuntimeState): RuntimeAsyncState =>
  state.async;

export const selectRuntimeRag = (state: RuntimeState): RuntimeRagState =>
  state.rag;

export const selectGameState = (state: RuntimeState) => state.domain.gameState;
export const selectCurrentHistory = (state: RuntimeState) =>
  state.domain.currentHistory;
