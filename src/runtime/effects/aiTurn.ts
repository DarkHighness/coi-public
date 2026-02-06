import type { RuntimeActions } from "../state";

export async function runHandleActionEffect(
  actions: RuntimeActions,
  action: string,
  isInit?: boolean,
  forceTheme?: string,
  fromNodeId?: string,
  preventFork?: boolean,
) {
  return actions.handleAction(
    action,
    isInit,
    forceTheme,
    fromNodeId,
    preventFork,
  );
}

export async function runStartNewGameEffect(
  actions: RuntimeActions,
  ...args: Parameters<RuntimeActions["startNewGame"]>
) {
  return actions.startNewGame(...args);
}
