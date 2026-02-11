import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useReducer,
} from "react";
import { useRuntimeEngine } from "./useRuntimeEngine";
import { useRagRuntime } from "./ragRuntime";
import { initialRuntimeMetaState, runtimeActionCreators } from "./actions";
import { runtimeReducer } from "./reducer";
import type { RuntimeContextValue, RuntimeState } from "./state";
import { useRuntimeLifecycleEffects } from "./effects/lifecycle";
import {
  useRuntimeActions as useRuntimeActionsAdapter,
  type RuntimeMutationScope,
} from "./useRuntimeActions";
import {
  buildRuntimeEngineState,
  buildRuntimeState,
  resolveRuntimeThemeConfig,
} from "./builders";
import {
  buildRuntimeEngineActionsFromSource,
  buildRuntimeEngineBaseStateFromSource,
} from "./engineBridge";

const RuntimeContext = createContext<RuntimeContextValue | null>(null);

function RuntimeBridge({ children }: { children: React.ReactNode }) {
  const engine = useRuntimeEngine();
  const ragRuntime = useRagRuntime();
  const [metaState, dispatch] = useReducer(
    runtimeReducer,
    initialRuntimeMetaState,
  );

  const currentThemeConfig = useMemo(
    () => resolveRuntimeThemeConfig(engine.gameState, engine.aiSettings),
    [
      engine.gameState.theme,
      engine.gameState.atmosphere,
      engine.aiSettings.lockEnvTheme,
      engine.aiSettings.fixedEnvTheme,
    ],
  );

  const engineState = useMemo(
    () =>
      buildRuntimeEngineState(
        buildRuntimeEngineBaseStateFromSource(engine),
        currentThemeConfig,
      ),
    [engine, currentThemeConfig],
  );

  const engineActions = useMemo(
    () => buildRuntimeEngineActionsFromSource(engine),
    [engine],
  );

  const markMutation = useCallback(
    (scope: RuntimeMutationScope, reason?: string | null) => {
      switch (scope) {
        case "domain":
          dispatch(runtimeActionCreators.domainMutated(reason));
          break;
        case "ui":
          dispatch(runtimeActionCreators.uiMutated(reason));
          break;
        case "rag":
          dispatch(runtimeActionCreators.ragMutated(reason));
          break;
        case "async":
          dispatch(runtimeActionCreators.asyncMutated(reason));
          break;
        case "lifecycle":
          dispatch(runtimeActionCreators.lifecycleMutated(reason));
          break;
      }
    },
    [],
  );

  const runtimeActions = useRuntimeActionsAdapter({
    engineActions,
    engineState,
    ragRuntime: {
      isInitialized: ragRuntime.isInitialized,
      actions: ragRuntime.actions,
    },
    markMutation,
  });

  const runtimeState: RuntimeState = useMemo(
    () =>
      buildRuntimeState(
        engineState,
        {
          isInitialized: ragRuntime.isInitialized,
          isLoading: ragRuntime.isLoading,
          status: ragRuntime.status,
          error: ragRuntime.error,
          modelMismatch: ragRuntime.modelMismatch,
          storageOverflow: ragRuntime.storageOverflow,
          currentSaveId: ragRuntime.currentSaveId,
        },
        metaState,
      ),
    [engineState, ragRuntime, metaState],
  );

  useRuntimeLifecycleEffects({ state: runtimeState, actions: runtimeActions });

  const value = useMemo(
    () => ({ state: runtimeState, actions: runtimeActions }),
    [runtimeState, runtimeActions],
  );

  return (
    <RuntimeContext.Provider value={value}>{children}</RuntimeContext.Provider>
  );
}

export function RuntimeProvider({ children }: { children: React.ReactNode }) {
  return <RuntimeBridge>{children}</RuntimeBridge>;
}

export function useRuntimeContext(): RuntimeContextValue {
  const context = useContext(RuntimeContext);
  if (!context) {
    throw new Error("useRuntimeContext must be used within a RuntimeProvider");
  }
  return context;
}

export function useOptionalRuntimeContext(): RuntimeContextValue | null {
  return useContext(RuntimeContext);
}

export function useRuntimeActions() {
  return useRuntimeContext().actions;
}

export function useRuntimeState() {
  return useRuntimeContext().state;
}
