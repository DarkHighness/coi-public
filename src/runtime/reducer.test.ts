import { describe, expect, it } from "vitest";
import {
  initialRuntimeMetaState,
  runtimeActionCreators,
  type RuntimeMetaState,
} from "./actions";
import { runtimeReducer } from "./reducer";

function reduce(actions: ReturnType<(typeof runtimeActionCreators)[keyof typeof runtimeActionCreators]>[]): RuntimeMetaState {
  return actions.reduce(runtimeReducer, initialRuntimeMetaState);
}

describe("runtimeReducer", () => {
  it("increments revision for domain/ui/rag/async/lifecycle mutations", () => {
    const state = reduce([
      runtimeActionCreators.domainMutated("domain.patch"),
      runtimeActionCreators.uiMutated("ui.update"),
      runtimeActionCreators.ragMutated("rag.switch"),
      runtimeActionCreators.asyncMutated("async.pending"),
      runtimeActionCreators.lifecycleMutated("lifecycle.init"),
    ]);

    expect(state.runtimeRevision).toBe(5);
    expect(state.lastMutationReason).toBe("lifecycle.init");
  });

  it("falls back to action type when reason is missing", () => {
    const state = runtimeReducer(
      initialRuntimeMetaState,
      runtimeActionCreators.uiMutated(),
    );

    expect(state.runtimeRevision).toBe(1);
    expect(state.lastMutationReason).toBe("ui/mutated");
  });

  it("resets runtime revision and reason", () => {
    const dirty = reduce([
      runtimeActionCreators.domainMutated("first"),
      runtimeActionCreators.ragMutated("second"),
    ]);

    const reset = runtimeReducer(dirty, runtimeActionCreators.reset());

    expect(reset).toEqual(initialRuntimeMetaState);
  });
});
