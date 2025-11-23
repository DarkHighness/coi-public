import { GameState, GameResponse, TimelineEvent } from "../../types";
import { processInventoryActions } from "./processInventoryActions";
import { processRelationshipActions } from "./processRelationshipActions";
import { processQuestActions } from "./processQuestActions";
import { processKnowledgeActions } from "./processKnowledgeActions";
import { processLocationActions } from "./processLocationActions";
import { processCharacterActions } from "./processCharacterActions";
import { processWorldEvents } from "./processWorldEvents";
import { processCausalChains } from "./processCausalChains";

export interface ProcessedState {
  inventory: GameState["inventory"];
  relationships: GameState["relationships"];
  quests: GameState["quests"];
  knowledge: GameState["knowledge"];
  locations: GameState["locations"];
  currentLocation: string;
  character: GameState["character"];
  timeline: GameState["timeline"];
  nextIds: GameState["nextIds"];
  time: string;
  causalChains: GameState["causalChains"];
}

/**
 * Aggregate function to process all entity actions from AI response
 */
export function processAllActions(
  gameState: GameState,
  response: GameResponse,
): ProcessedState {
  let nextIds = { ...gameState.nextIds };

  // --- Time Management ---
  let currentTimeString = gameState.time;
  if (response.timeUpdate) {
    currentTimeString = response.timeUpdate;
  }
  // -----------------------

  // Process inventory
  const { inventory, nextIds: inventoryNextIds } = processInventoryActions(
    gameState.inventory,
    response.inventoryActions,
    nextIds,
    currentTimeString,
  );
  nextIds = inventoryNextIds;

  // Process relationships
  const { relationships, nextIds: relationshipsNextIds } =
    processRelationshipActions(
      gameState.relationships,
      response.relationshipActions,
      nextIds,
    );
  nextIds = relationshipsNextIds;

  // Process quests
  const { quests, nextIds: questsNextIds } = processQuestActions(
    gameState.quests,
    response.questActions,
    nextIds,
  );
  nextIds = questsNextIds;

  // Process knowledge
  const { knowledge, nextIds: knowledgeNextIds } = processKnowledgeActions(
    gameState.knowledge,
    response.knowledgeActions,
    nextIds,
    currentTimeString,
  );
  nextIds = knowledgeNextIds;

  // Process locations
  const {
    locations,
    currentLocation,
    nextIds: locationsNextIds,
  } = processLocationActions(
    gameState.locations,
    gameState.currentLocation,
    response.locationActions,
    nextIds,
  );
  nextIds = locationsNextIds;

  // Process character
  const character = processCharacterActions(
    gameState.character,
    response.characterUpdates,
  );

  // Process world events (AI generated)
  let timeline = processWorldEvents(
    gameState.timeline,
    response.worldEvents,
    currentTimeString,
  );

  // Process Causal Chains (Simulation)
  let causalChains = gameState.causalChains || [];

  const chainResult = processCausalChains(
    causalChains,
    timeline,
    currentTimeString,
  );
  causalChains = chainResult.causalChains;
  timeline = chainResult.timeline;

  return {
    inventory,
    relationships,
    quests,
    knowledge,
    locations,
    currentLocation,
    character,
    timeline,
    nextIds,
    time: currentTimeString,
    causalChains,
  };
}
