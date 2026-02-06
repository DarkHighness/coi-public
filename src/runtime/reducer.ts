import {
  initialRuntimeMetaState,
  type RuntimeAction,
  type RuntimeMetaState,
} from "./actions";

export function runtimeReducer(
  state: RuntimeMetaState,
  action: RuntimeAction,
): RuntimeMetaState {
  switch (action.type) {
    case "domain/mutated":
    case "ui/mutated":
    case "rag/mutated":
    case "async/mutated":
    case "lifecycle/mutated":
      return {
        runtimeRevision: state.runtimeRevision + 1,
        lastMutationReason: action.reason ?? action.type,
      };
    case "lifecycle/reset":
      return initialRuntimeMetaState;
    default:
      return state;
  }
}

export { initialRuntimeMetaState };
