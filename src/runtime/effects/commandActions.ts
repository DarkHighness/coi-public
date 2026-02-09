import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import type { TFunction } from "i18next";
import { generateEntityCleanup, generateForceUpdate } from "../../services/aiService";
import { deriveGameStateFromVfs } from "../../services/vfs/derivations";
import { deriveHistory } from "../../utils/storyUtils";
import { LANG_MAP } from "../../utils/constants";
import { createFork, createStateSnapshot } from "../../utils/snapshotManager";
import { mergeDerivedViewState } from "../../hooks/vfsViewState";
import { rebuildSessionsAfterHeavyMutation } from "../../hooks/gameActionHelpers";
import {
  normalizeAtmosphere,
  type AtmosphereObject,
} from "../../utils/constants/atmosphere";
import { forkConversation, writeForkTree } from "../../services/vfs/conversation";
import { getRAGService } from "../../services/rag";
import { updateRAGDocumentsBackground } from "./ragDocuments";
import type {
  AISettings,
  ForkTree,
  GameState,
  LanguageCode,
  StorySegment,
  TurnContext,
} from "../../types";
import type { VfsSession } from "../../services/vfs/vfsSession";
import { vfsElevationTokenManager } from "../../services/vfs/core/elevation";

type ShowToast = (
  message: string,
  type?: "success" | "error" | "info" | "warning",
  duration?: number,
) => void;

interface CommandActionsDeps {
  aiSettings: AISettings;
  language: LanguageCode;
  currentSlotId: string | null;
  gameStateRef: MutableRefObject<GameState>;
  setGameState: Dispatch<SetStateAction<GameState>>;
  showToast: ShowToast;
  t: TFunction;
  vfsSession: VfsSession;
  restoreVfsToTurn: (
    slotId: string,
    forkId: number,
    turnNumber: number,
  ) => Promise<boolean>;
  saveToSlot: (slotId: string, state: GameState) => Promise<boolean>;
  triggerSave: () => void;
}

export function createCommandActions({
  aiSettings,
  language,
  currentSlotId,
  gameStateRef,
  setGameState,
  showToast,
  t,
  vfsSession,
  restoreVfsToTurn,
  saveToSlot,
  triggerSave,
}: CommandActionsDeps) {
  const requireNonEmptyVfsSnapshot = (operation: string) => {
    const snapshot = vfsSession.snapshot() ?? {};
    if (Object.keys(snapshot).length === 0) {
      throw new Error(
        `VFS snapshot is empty after ${operation}. Ensure tools wrote state files.`,
      );
    }
    return snapshot;
  };

  const getParentSummaryState = (parentId: string | null | undefined) => {
    const parentNode = parentId ? gameStateRef.current.nodes[parentId] : undefined;
    const baseSummaries = parentNode?.summaries || [];
    const baseIndex = parentNode?.summarizedIndex || 0;
    const nextSegmentIdx = (parentNode?.segmentIdx ?? -1) + 1;

    return { baseSummaries, baseIndex, nextSegmentIdx };
  };

  const sanitizeNodeChoices = (choices: any, fallbackChoice: string) => {
    if (!Array.isArray(choices) || choices.length === 0) {
      return [fallbackChoice];
    }

    const normalized = choices.map((choice: any) => {
      if (typeof choice === "string") {
        return choice;
      }

      if (typeof choice === "object" && choice !== null) {
        return {
          text: choice.text || choice.choice || choice.label || "Continue",
          consequence: choice.consequence,
        };
      }

      return String(choice);
    });

    return normalized.length > 0 ? normalized : [fallbackChoice];
  };

  const emitRecoveryNotice = (
    mode: "sudo" | "cleanup",
    recovery?: { recovered?: boolean; kind?: string; finalLevel?: number; attempts?: unknown[]; durationMs?: number },
  ) => {
    if (!recovery?.recovered) return;

    console.info("[TurnRecovery][Command]", {
      mode,
      kind: recovery.kind,
      finalLevel: recovery.finalLevel,
      attemptCount: Array.isArray(recovery.attempts) ? recovery.attempts.length : 0,
      durationMs: recovery.durationMs,
      recovered: recovery.recovered,
    });

    showToast(
      t("game.info.autoRecoverySuccess", {
        defaultValue:
          "Auto-recovery succeeded. Continued from the latest stable checkpoint.",
      }),
      "info",
      3500,
    );
  };

  const confirmRecoveryAction = ({
    type: _type,
    message,
  }: {
    type: "turn_retry_boost" | "session_rebuild";
    message: string;
  }) =>
    typeof window !== "undefined" ? window.confirm(message) : false;

  const buildSystemNode = ({
    id,
    parentId,
    text,
    choices,
    atmosphere,
    narrativeTone,
    segmentIdx,
    baseSummaries,
    baseIndex,
    derivedState,
    viewState,
  }: {
    id: string;
    parentId: string | null;
    text: string;
    choices: any[];
    atmosphere: AtmosphereObject;
    narrativeTone?: string;
    segmentIdx: number;
    baseSummaries: any[];
    baseIndex: number;
    derivedState: GameState;
    viewState: GameState;
  }): StorySegment => ({
    segmentIdx,
    id,
    parentId,
    text,
    choices,
    imagePrompt: "",
    role: "system",
    timestamp: Date.now(),
    atmosphere,
    narrativeTone,
    ending: "continue",
    summaries: baseSummaries,
    summarizedIndex: baseIndex,
    stateSnapshot: createStateSnapshot(derivedState, {
      summaries: baseSummaries,
      lastSummarizedIndex: baseIndex,
      currentLocation: derivedState.currentLocation,
      time: derivedState.time,
      atmosphere,
      veoScript: viewState.veoScript,
      uiState: viewState.uiState,
    }),
  });

  const navigateToNode = async (
    nodeId: string,
    isFork: boolean = false,
  ): Promise<void> => {
    const match = /fork-(\d+)\/turn-(\d+)/.exec(nodeId);
    if (!match) {
      setGameState((prev) => ({
        ...prev,
        activeNodeId: nodeId,
        currentFork: deriveHistory(prev.nodes, nodeId),
      }));
      return;
    }

    const forkId = Number(match[1]);
    const turn = Number(match[2]);
    if (!Number.isFinite(forkId) || !Number.isFinite(turn)) {
      showToast(t("tree.errors.invalidNodeId", { nodeId }), "error", 4000);
      return;
    }

    if (!currentSlotId) {
      showToast(t("tree.errors.noActiveSaveSlot"), "error", 4000);
      return;
    }

    setGameState((prev) => ({
      ...prev,
      isProcessing: true,
      error: null,
      liveToolCalls: [],
    }));

    try {
      const restored = await restoreVfsToTurn(currentSlotId, forkId, turn);
      if (!restored) {
        throw new Error(
          `Snapshot not found for save=${currentSlotId}, fork=${forkId}, turn=${turn}`,
        );
      }

      if (isFork) {
        const baseDerived = deriveGameStateFromVfs(vfsSession.snapshot());
        const forkResult = createFork(
          baseDerived.forkId ?? forkId,
          baseDerived.forkTree,
          nodeId,
          turn,
        );

        forkConversation(vfsSession, {
          sourceForkId: forkId,
          sourceTurnNumber: turn,
          newForkId: forkResult.newForkId,
        });
        writeForkTree(vfsSession, forkResult.newForkTree);

        const derived = deriveGameStateFromVfs(vfsSession.snapshot());
        const nextState = mergeDerivedViewState(gameStateRef.current, derived, {
          resetRuntime: true,
        });

        gameStateRef.current = nextState;
        setGameState(nextState);
        await saveToSlot(currentSlotId, nextState);

        if (aiSettings.embedding?.enabled) {
          const ragService = getRAGService();
          if (ragService) {
            ragService
              .switchSave(
                currentSlotId,
                forkResult.newForkId,
                forkResult.newForkTree as ForkTree,
              )
              .catch((error) => {
                console.error("[RAG] Failed to switch fork context:", error);
              });
          }
        }

        return;
      }

      const derived = deriveGameStateFromVfs(vfsSession.snapshot());
      let nextState = mergeDerivedViewState(gameStateRef.current, derived, {
        resetRuntime: true,
      });

      if (nextState.nodes[nodeId]) {
        nextState = {
          ...nextState,
          activeNodeId: nodeId,
          currentFork: deriveHistory(nextState.nodes, nodeId),
        };
      }

      gameStateRef.current = nextState;
      setGameState(nextState);

      if (aiSettings.embedding?.enabled) {
        const ragService = getRAGService();
        if (ragService) {
          ragService
            .switchSave(currentSlotId, nextState.forkId, nextState.forkTree)
            .catch((error) => {
              console.error("[RAG] Failed to switch save context:", error);
            });
        }
      }
    } catch (error) {
      console.error("[NavigateToNode] Failed:", error);
      const message = t("tree.errors.navigateFailed");
      showToast(message, "error", 5000);
      setGameState((prev) => ({
        ...prev,
        isProcessing: false,
        liveToolCalls: [],
        error: message,
      }));
    }
  };

  const handleForceUpdate = async (prompt: string) => {
    if (gameStateRef.current.isProcessing) return;

    setGameState((prev) => ({
      ...prev,
      isProcessing: true,
      error: null,
      liveToolCalls: [],
    }));

    try {
      const fullHistory = deriveHistory(
        gameStateRef.current.nodes,
        gameStateRef.current.activeNodeId,
        true,
      );

      const sudoElevationToken = vfsElevationTokenManager.issueAiElevationToken({
        intent: "sudo_command",
        scopeTemplateIds: "all_elevated",
      });

      const context: TurnContext = {
        recentHistory: fullHistory,
        userAction: prompt,
        language: LANG_MAP[language],
        themeKey: gameStateRef.current.theme,
        tFunc: t,
        settings: aiSettings,
        slotId: currentSlotId || "default",
        vfsSession,
        onToolCallsUpdate: (toolCalls) => {
          setGameState((prev) => ({
            ...prev,
            liveToolCalls: toolCalls,
          }));
        },
        vfsMode: "sudo",
        vfsElevationToken: sudoElevationToken,
        vfsElevationIntent: "sudo_command",
        vfsElevationScopeTemplateIds: "all_elevated",
        confirmRecoveryAction,
      };

      const { response, logs, recovery } = await generateForceUpdate(
        prompt,
        gameStateRef.current,
        context,
      );

      await rebuildSessionsAfterHeavyMutation(
        aiSettings,
        currentSlotId || "default",
        gameStateRef.current.forkId ?? 0,
      );

      if (logs && logs.length > 0) {
        setGameState((prev) => ({
          ...prev,
          logs: [...logs, ...(prev.logs || [])].slice(0, 100),
        }));
      }

      const vfsSnapshot = requireNonEmptyVfsSnapshot("force update");
      const derivedState = deriveGameStateFromVfs(vfsSnapshot);
      const viewState = mergeDerivedViewState(gameStateRef.current, derivedState);

      const responseAtmosphere: AtmosphereObject = normalizeAtmosphere(
        response.atmosphere || gameStateRef.current.atmosphere,
      );

      const newSegmentId = Date.now().toString();
      const commandNodeId = `command-${newSegmentId}`;
      const parentId = gameStateRef.current.activeNodeId;
      const parentSummaryState = getParentSummaryState(parentId);

      const commandNode: StorySegment = {
        segmentIdx: parentSummaryState.nextSegmentIdx,
        id: commandNodeId,
        parentId,
        text: prompt,
        choices: [],
        imagePrompt: "",
        role: "command",
        timestamp: Date.now(),
        atmosphere: gameStateRef.current.atmosphere,
        ending: "continue",
        summaries: parentSummaryState.baseSummaries,
        summarizedIndex: parentSummaryState.baseIndex,
        stateSnapshot: createStateSnapshot(gameStateRef.current, {
          summaries: parentSummaryState.baseSummaries,
          lastSummarizedIndex: parentSummaryState.baseIndex,
          currentLocation: gameStateRef.current.currentLocation,
          time: gameStateRef.current.time,
          atmosphere: gameStateRef.current.atmosphere,
          veoScript: gameStateRef.current.veoScript,
          uiState: gameStateRef.current.uiState,
        }),
      };

      const resultNodeId = `system-${newSegmentId}`;
      const resultNode = buildSystemNode({
        id: resultNodeId,
        parentId: commandNodeId,
        text: response.narrative,
        choices: sanitizeNodeChoices(response.choices, t("continue")),
        atmosphere: responseAtmosphere,
        narrativeTone: response.narrativeTone,
        segmentIdx: parentSummaryState.nextSegmentIdx + 1,
        baseSummaries: parentSummaryState.baseSummaries,
        baseIndex: parentSummaryState.baseIndex,
        derivedState,
        viewState,
      });

      setGameState((prev) => {
        const mergedBase = mergeDerivedViewState(prev, derivedState);
        const newNodes = {
          ...mergedBase.nodes,
          [commandNodeId]: commandNode,
          [resultNodeId]: resultNode,
        };

        return {
          ...mergedBase,
          nodes: newNodes,
          activeNodeId: resultNodeId,
          currentFork: deriveHistory(newNodes, resultNodeId),
          atmosphere: responseAtmosphere,
          isProcessing: false,
          liveToolCalls: [],
        };
      });

      emitRecoveryNotice("sudo", recovery);
      triggerSave();
      return { success: true };
    } catch (error: unknown) {
      console.error("Force update failed:", error);
      const errorMsg =
        error instanceof Error ? error.message : "Force update failed";
      setGameState((prev) => ({
        ...prev,
        isProcessing: false,
        liveToolCalls: [],
        error: errorMsg,
      }));
      return { success: false, error: errorMsg };
    }
  };

  const handleCleanupEntities = async () => {
    if (gameStateRef.current.isProcessing) return;

    setGameState((prev) => ({
      ...prev,
      isProcessing: true,
      liveToolCalls: [],
      error: null,
    }));

    try {
      const baselineConversationFiles = (() => {
        const snapshot = vfsSession.snapshot();
        const baseline: Record<
          string,
          { content: string; contentType: (typeof snapshot)[string]["contentType"] }
        > = {};

        for (const [path, file] of Object.entries(snapshot)) {
          if (
            path.startsWith("conversation/") ||
            path.startsWith("current/conversation/")
          ) {
            baseline[path] = { content: file.content, contentType: file.contentType };
          }
        }

        return baseline;
      })();

      const fullHistory = deriveHistory(
        gameStateRef.current.nodes,
        gameStateRef.current.activeNodeId,
        true,
      );

      const context: TurnContext = {
        recentHistory: fullHistory,
        userAction: "[CLEANUP]",
        language: LANG_MAP[language],
        themeKey: gameStateRef.current.theme,
        tFunc: t,
        settings: aiSettings,
        slotId: `${currentSlotId || "default"}:cleanup`,
        vfsSession,
        onToolCallsUpdate: (toolCalls) => {
          setGameState((prev) => ({
            ...prev,
            liveToolCalls: toolCalls,
          }));
        },
        vfsMode: "normal",
        confirmRecoveryAction,
      };

      const { response, logs, changedEntities, recovery } = await generateEntityCleanup(
        gameStateRef.current,
        context,
      );

      await rebuildSessionsAfterHeavyMutation(
        aiSettings,
        currentSlotId || "default",
        gameStateRef.current.forkId ?? 0,
      );

      const afterCleanupSnapshot = vfsSession.snapshot();
      for (const path of Object.keys(afterCleanupSnapshot)) {
        if (
          (path.startsWith("conversation/") ||
            path.startsWith("current/conversation/")) &&
          !baselineConversationFiles[path]
        ) {
          try {
            vfsSession.deleteFile(path);
          } catch (error) {
            console.warn("[Cleanup] Failed to delete conversation file:", path, error);
          }
        }
      }
      for (const [path, file] of Object.entries(baselineConversationFiles)) {
        vfsSession.writeFile(path, file.content, file.contentType);
      }

      if (logs && logs.length > 0) {
        setGameState((prev) => ({
          ...prev,
          logs: [...logs, ...(prev.logs || [])].slice(0, 100),
        }));
      }

      const vfsSnapshot = requireNonEmptyVfsSnapshot("cleanup");
      const derivedState = deriveGameStateFromVfs(vfsSnapshot);
      const viewState = mergeDerivedViewState(gameStateRef.current, derivedState);

      const newSegmentId = Date.now().toString();
      const cleanupNodeId = `cleanup-${newSegmentId}`;
      const parentId = gameStateRef.current.activeNodeId;
      const parentSummaryState = getParentSummaryState(parentId);

      const cleanupNode = buildSystemNode({
        id: cleanupNodeId,
        parentId,
        text: response.narrative || "Entity cleanup completed.",
        choices: sanitizeNodeChoices(response.choices, t("continue")),
        atmosphere: gameStateRef.current.atmosphere,
        segmentIdx: parentSummaryState.nextSegmentIdx,
        baseSummaries: parentSummaryState.baseSummaries,
        baseIndex: parentSummaryState.baseIndex,
        derivedState,
        viewState,
      });

      setGameState((prev) => {
        const mergedBase = mergeDerivedViewState(prev, derivedState);
        const newNodes = {
          ...mergedBase.nodes,
          [cleanupNodeId]: cleanupNode,
        };

        return {
          ...mergedBase,
          nodes: newNodes,
          activeNodeId: cleanupNodeId,
          currentFork: deriveHistory(newNodes, cleanupNodeId),
          isProcessing: false,
          liveToolCalls: [],
        };
      });

      if (changedEntities.length > 0 && aiSettings.embedding?.enabled) {
        const stateWithSaveInfo = {
          ...gameStateRef.current,
          saveId: currentSlotId || "default",
          forkId: gameStateRef.current.forkId,
          turnNumber: gameStateRef.current.turnNumber,
        };
        updateRAGDocumentsBackground(changedEntities, stateWithSaveInfo).catch(
          (error) => console.error("[Cleanup] RAG update failed:", error),
        );
      }

      emitRecoveryNotice("cleanup", recovery);
      triggerSave();
      return { success: true };
    } catch (error: unknown) {
      console.error("Entity cleanup failed:", error);
      const errorMsg =
        error instanceof Error ? error.message : "Entity cleanup failed";
      setGameState((prev) => ({
        ...prev,
        isProcessing: false,
        liveToolCalls: [],
        error: errorMsg,
      }));
      return { success: false, error: errorMsg };
    }
  };

  return {
    navigateToNode,
    handleForceUpdate,
    handleCleanupEntities,
  };
}
