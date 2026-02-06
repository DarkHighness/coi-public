import type { GameState, ResolvedThemeConfig } from "../../types";
import { getRAGService } from "../../services/rag";
import { extractDocumentsFromState } from "../../services/rag/documentExtraction";

interface SaveAwareGameState extends GameState {
  saveId?: string;
}

export async function updateRAGDocumentsBackground(
  changedEntities: Array<{ id: string; type: string }>,
  state: SaveAwareGameState,
): Promise<void> {
  if (changedEntities.length === 0) return;

  try {
    const ragService = getRAGService();
    if (!ragService) return;

    const entityIds = changedEntities.map((entity) => entity.id);
    console.log(
      `[RAG Update] Updating ${entityIds.length} entities:`,
      entityIds,
    );

    const documents = extractDocumentsFromState(state, entityIds);
    if (documents.length === 0) return;

    await ragService.addDocuments(
      documents.map((doc) => ({
        ...doc,
        saveId: state.saveId || "unknown",
        forkId: state.forkId || 0,
        turnNumber: state.turnNumber || 0,
      })),
    );
    console.log(`[RAG Update] Updated ${documents.length} documents`);
  } catch (error) {
    console.error("[RAG Update] Failed:", error);
  }
}

function extractXmlTagValue(
  input: string | undefined,
  tagName: string,
): string | undefined {
  if (!input) return undefined;
  const regex = new RegExp(`<${tagName}>\\s*([\\s\\S]*?)\\s*<\\/${tagName}>`, "i");
  const match = input.match(regex);
  const value = match?.[1]?.trim();
  return value ? value : undefined;
}

export function applyCustomContextThemeOverrides(
  themeConfig: ResolvedThemeConfig,
  customContext?: string,
): ResolvedThemeConfig {
  const narrativeStyleOverride = extractXmlTagValue(
    customContext,
    "narrative_style",
  );
  if (!narrativeStyleOverride) return themeConfig;
  return { ...themeConfig, narrativeStyle: narrativeStyleOverride };
}

export async function indexInitialEntities(
  state: GameState,
  saveId: string,
): Promise<void> {
  try {
    const ragService = getRAGService();
    if (!ragService) return;

    console.log(`[RAG Init] Indexing initial entities for save: ${saveId}`);

    await ragService.switchSave(saveId, state.forkId || 0, state.forkTree);
    console.log(`[RAG Init] Switched to save context: ${saveId}`);

    const initialEntityIds: string[] = [];

    if (state.outline) {
      initialEntityIds.push("outline:full");
      initialEntityIds.push("outline:world");
      initialEntityIds.push("outline:goal");
      initialEntityIds.push("outline:premise");
      initialEntityIds.push("outline:character");
    }

    state.inventory?.forEach((item) => initialEntityIds.push(item.id));
    state.npcs?.forEach((npc) => initialEntityIds.push(npc.id));
    state.locations?.forEach((location) => initialEntityIds.push(location.id));
    state.quests?.forEach((quest) => initialEntityIds.push(quest.id));
    state.knowledge?.forEach((knowledge) => initialEntityIds.push(knowledge.id));
    state.factions?.forEach((faction) => initialEntityIds.push(faction.id));
    state.timeline?.forEach((event) => initialEntityIds.push(event.id));

    if (initialEntityIds.length === 0) return;

    const documents = extractDocumentsFromState(state, initialEntityIds);
    if (documents.length === 0) return;

    await ragService.addDocuments(
      documents.map((doc) => ({
        ...doc,
        saveId,
        forkId: state.forkId || 0,
        turnNumber: state.turnNumber || 0,
      })),
    );
    console.log(
      `[RAG Init] Indexed ${documents.length} initial documents for save: ${saveId}`,
    );
  } catch (error) {
    console.error("[RAG Init] Failed:", error);
  }
}
