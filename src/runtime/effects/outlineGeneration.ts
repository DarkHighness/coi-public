import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import type { TFunction } from "i18next";
import type { OutlinePhaseProgress } from "../../services/aiService";
import { writeOutlineProgress } from "../../services/vfs/outline";
import type {
  AISettings,
  GameState,
  OutlineConversationState,
  SavePresetProfile,
} from "../../types";
import type { VfsSession } from "../../services/vfs/vfsSession";

let aiServiceModulePromise: Promise<typeof import("../../services/aiService")> | null =
  null;

const loadAiService = async () => {
  if (!aiServiceModulePromise) {
    aiServiceModulePromise = import("../../services/aiService");
  }
  return aiServiceModulePromise;
};

interface RunOutlineGenerationParams {
  theme: string;
  language: string;
  customContext?: string;
  t: TFunction;
  aiSettings: AISettings;
  slotId: string;
  vfsSession: VfsSession;
  setGameState: Dispatch<SetStateAction<GameState>>;
  gameStateRef: MutableRefObject<GameState>;
  saveToSlot: (slotId: string, state: GameState) => Promise<boolean>;
  onPhaseProgress?: (progress: OutlinePhaseProgress) => void;
  resumeFrom?: OutlineConversationState;
  seedImageBase64?: string;
  protagonistFeature?: string;
  presetProfile?: SavePresetProfile;
  sessionTag?: string;
  logPrefix: string;
}

export async function runOutlineGenerationPhased({
  theme,
  language,
  customContext,
  t,
  aiSettings,
  slotId,
  vfsSession,
  setGameState,
  gameStateRef,
  saveToSlot,
  onPhaseProgress,
  resumeFrom,
  seedImageBase64,
  protagonistFeature,
  presetProfile,
  sessionTag,
  logPrefix,
}: RunOutlineGenerationParams) {
  const { generateStoryOutlinePhased } = await loadAiService();
  return generateStoryOutlinePhased(theme, language, customContext, t, {
    onPhaseProgress,
    resumeFrom,
    settings: aiSettings,
    vfsSession,
    slotId,
    seedImageBase64,
    protagonistFeature,
    presetProfile,
    sessionTag,
    onToolCallsUpdate: (toolCalls) => {
      setGameState((prev) => ({
        ...prev,
        liveToolCalls: toolCalls,
      }));
    },
    onSaveCheckpoint: async (conversationState: OutlineConversationState) => {
      const updatedState = {
        ...gameStateRef.current,
        outlineConversation: conversationState,
        liveToolCalls: conversationState.liveToolCalls || [],
      };
      setGameState(updatedState);
      gameStateRef.current = updatedState;
      writeOutlineProgress(vfsSession, conversationState);
      await saveToSlot(slotId, updatedState);
      console.log(
        `[${logPrefix}] Saved conversation state at phase ${conversationState.currentPhase}`,
      );
    },
  });
}

export async function blobToDataUrl(blob: Blob): Promise<string> {
  const reader = new FileReader();
  return new Promise<string>((resolve, reject) => {
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
