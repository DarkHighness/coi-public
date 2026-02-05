/**
 * ============================================================================
 * Entity Rendering Atoms Index
 * ============================================================================
 */

// NPC
export {
  renderNpcVisible,
  renderNpcHidden,
  renderNpcFull,
  type RenderNpcInput,
} from "./npc";

// Location
export {
  renderLocationVisible,
  renderLocationHidden,
  renderLocationFull,
  type RenderLocationInput,
} from "./location";

// Item
export {
  renderItemVisible,
  renderItemHidden,
  renderItemFull,
  type RenderItemInput,
} from "./item";

// Quest
export {
  renderQuestVisible,
  renderQuestHidden,
  renderQuestFull,
  type RenderQuestInput,
} from "./quest";

// Faction
export {
  renderFactionVisible,
  renderFactionHidden,
  renderFactionFull,
  type RenderFactionInput,
} from "./faction";

// Knowledge
export {
  renderKnowledgeVisible,
  renderKnowledgeHidden,
  renderKnowledgeFull,
  type RenderKnowledgeInput,
} from "./knowledge";

// Timeline
export {
  renderTimelineVisible,
  renderTimelineHidden,
  renderTimelineFull,
  type RenderTimelineInput,
} from "./timeline";

// Condition
export {
  renderConditionVisible,
  renderConditionHidden,
  renderConditionFull,
  type RenderConditionInput,
} from "./condition";

// CausalChain
export {
  renderCausalChainVisible,
  renderCausalChainHidden,
  renderCausalChainFull,
  type RenderCausalChainInput,
} from "./causalChain";

// Character
export {
  renderCharacterVisible,
  renderCharacterHidden,
  renderCharacterFull,
  type RenderCharacterInput,
} from "./character";

// World Foundation
export {
  renderWorldFoundation,
  renderGodMode,
  type RenderWorldFoundationInput,
} from "./worldFoundation";

// Entity Context (for turn context injection)
export {
  renderEntityContext,
  renderEntityContextPrimer,
  type EntityContextInput,
  type EntityEntry,
  type NpcEntry,
} from "./entityContext";
