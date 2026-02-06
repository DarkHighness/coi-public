export interface RuntimeMetaState {
  runtimeRevision: number;
  lastMutationReason: string | null;
}

export type RuntimeAction =
  | { type: "domain/mutated"; reason?: string | null }
  | { type: "ui/mutated"; reason?: string | null }
  | { type: "rag/mutated"; reason?: string | null }
  | { type: "async/mutated"; reason?: string | null }
  | { type: "lifecycle/mutated"; reason?: string | null }
  | { type: "lifecycle/reset" };

export const initialRuntimeMetaState: RuntimeMetaState = {
  runtimeRevision: 0,
  lastMutationReason: null,
};

export const runtimeActionCreators = {
  domainMutated: (reason?: string | null): RuntimeAction => ({
    type: "domain/mutated",
    reason,
  }),
  uiMutated: (reason?: string | null): RuntimeAction => ({
    type: "ui/mutated",
    reason,
  }),
  ragMutated: (reason?: string | null): RuntimeAction => ({
    type: "rag/mutated",
    reason,
  }),
  asyncMutated: (reason?: string | null): RuntimeAction => ({
    type: "async/mutated",
    reason,
  }),
  lifecycleMutated: (reason?: string | null): RuntimeAction => ({
    type: "lifecycle/mutated",
    reason,
  }),
  reset: (): RuntimeAction => ({ type: "lifecycle/reset" }),
};
