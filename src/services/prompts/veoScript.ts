import { GameState, StorySegment } from "../../types";
import { getCulturalAdaptationInstruction } from "./common";
import {
  cinematographerRole,
  perspectiveInstruction,
  visualContinuityRules,
  veoOutputStructure,
  veoPromptRequirements,
  veoFinalDirective,
  shotBreakdownTemplate,
  mandatoryKeywords,
  avoidList,
} from "./atoms/veo";

// --- VEO Script Prompt ---

export const getVeoScriptPrompt = (
  gameState: GameState,
  history: StorySegment[],
  language: string = "English",
): string => {
  // Build recent narrative flow in XML format (no truncation)
  const recentHistoryXml = history
    .slice(-20)
    .filter((h) => h.role === "user" || h.role === "system")
    .map((h) => `<turn role="${h.role}">${h.text}</turn>`)
    .join("\n");

  // Build detailed XML-formatted game state
  const currentLocationName = gameState.currentLocation || "Unknown Location";
  const locationObj = gameState.locations?.find(
    (l) =>
      String(l.id).toLowerCase() ===
        String(gameState.currentLocation).toLowerCase() ||
      l.name?.toLowerCase() === gameState.currentLocation?.toLowerCase(),
  );

  // Character details
  const characterRace = gameState.character?.race || "Unknown";
  const characterProfession = gameState.character?.profession || "Wanderer";
  const characterAppearance =
    gameState.character?.appearance || "Mysterious figure";
  const characterStatus = gameState.character?.status || "Normal";

  // Inventory with full descriptions (not just names, no truncation)
  const inventoryXml =
    gameState.inventory && gameState.inventory.length > 0
      ? gameState.inventory
          .map(
            (i) =>
              `<item>
                <name>${i.name}</name>
                <description>${i.visible?.description || "Unknown item"}</description>
                <sensory>${i.visible?.sensory ? `texture: ${i.visible.sensory.texture || ""}, weight: ${i.visible.sensory.weight || ""}, smell: ${i.visible.sensory.smell || ""}` : ""}</sensory>
                <hidden_truth>${i.hidden?.truth || "None"}</hidden_truth>
              </item>`,
          )
          .join("\n")
      : "<none>No items carried</none>";

  // Key NPCs with details (no truncation)
  const npcXml =
    gameState.npcs && gameState.npcs.length > 0
      ? gameState.npcs
          .slice(0, 5) // Top 5 most relevant NPCs
          .map(
            (r) =>
              `<npc>
                <name>${r.visible.name}</name>
                <true_name>${r.hidden.trueName}</true_name>
                <description>${r.visible.description}</description>
                <appearance>${r.visible.appearance || "Unknown appearance"}</appearance>
                <status>${r.visible.npcType}</status>
                <notes>${r.notes || ""}</notes>
                <hidden_truth>Real Personality: ${r.hidden.realPersonality}; True Motives: ${r.hidden.realMotives}; True Status: ${r.hidden.npcType}</hidden_truth>
              </npc>`,
          )
          .join("\n")
      : "    <none>No NPCs present</none>";

  // Current scene narrative (NO TRUNCATION)
  const currentNarrative =
    gameState.nodes[gameState.activeNodeId || ""]?.text ||
    "An epic moment unfolds";

  const fullContextXml = `
<veo_context>
  <game_state>
    <theme>${gameState.theme}</theme>
    <location>
      <name>${currentLocationName}</name>
      <description>${locationObj?.visible?.description || "Unknown location"}</description>
      <environment>${locationObj?.visible?.environment || "N/A"}</environment>
      <notes>${locationObj?.notes || ""}</notes>
      <sensory>${locationObj?.visible?.sensory ? `smell: ${locationObj.visible.sensory.smell || ""}, sound: ${locationObj.visible.sensory.sound || ""}, lighting: ${locationObj.visible.sensory.lighting || ""}, temperature: ${locationObj.visible.sensory.temperature || ""}` : ""}</sensory>
    </location>
    <protagonist>
      <race>${characterRace}</race>
      <profession>${characterProfession}</profession>
      <appearance>${characterAppearance}</appearance>
      <status>${characterStatus}</status>
    </protagonist>
    <inventory>
${inventoryXml}
    </inventory>
    <npcs_present>
${npcXml}
    </npcs_present>
    <current_scene>
${currentNarrative}
    </current_scene>
  </game_state>
  <recent_narrative_flow>
${recentHistoryXml}
  </recent_narrative_flow>
</veo_context>`;

  return `
${cinematographerRole()}

**CRITICAL PERSPECTIVE INSTRUCTION:**
${perspectiveInstruction()}
${getCulturalAdaptationInstruction(language)}

═══════════════════════════════════════════════════════════════

${fullContextXml}

═══════════════════════════════════════════════════════════════

**YOUR CREATIVE MANDATE:**

Transform this narrative moment into a MASTERPIECE-LEVEL cinematic experience. Every frame must be meticulously crafted with the precision of a Roger Deakins shot, the atmosphere of Denis Villeneuve's vision, and the dynamism of Christopher Nolan's storytelling.

**CRITICAL: VISUAL CONTINUITY & COHERENCE**
${visualContinuityRules()}

**REQUIRED OUTPUT STRUCTURE:**

${veoOutputStructure()}

**4. PROFESSIONAL SHOT BREAKDOWN**
${shotBreakdownTemplate()}

**5. MASTER VEO VIDEO GENERATION PROMPT**

${veoPromptRequirements()}

**MANDATORY KEYWORDS:**
${mandatoryKeywords()}

**AVOID:**
${avoidList()}

═══════════════════════════════════════════════════════════════

**FINAL DIRECTIVE:**
${veoFinalDirective()}
`;
};
