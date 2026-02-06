import type { GameState } from "../../types";
import type { RuntimeActions, RuntimeMutationOptions } from "../state";

export function applyPersistedMutation(
  actions: RuntimeActions,
  nextState: GameState,
  options?: RuntimeMutationOptions,
) {
  actions.applyVfsMutation(nextState, options);
}
