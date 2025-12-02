import { GameState, StorySegment } from "../../types";
import { getCulturalAdaptationInstruction } from "./common";

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
      String(l.id).toLowerCase() === String(gameState.currentLocation).toLowerCase() ||
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
                <hidden_truth>${i.hidden?.truth || "None"}</hidden_truth>
              </item>`,
          )
          .join("\n")
      : "<none>No items carried</none>";

  // Key NPCs with details (no truncation)
  const npcXml =
    gameState.relationships && gameState.relationships.length > 0
      ? gameState.relationships
          .slice(0, 5) // Top 5 most relevant NPCs
          .map(
            (r) =>
              `<npc>
                <name>${r.visible.name}</name>
                <true_name>${r.hidden.trueName}</true_name>
                <description>${r.visible.description}</description>
                <appearance>${r.visible.appearance || "Unknown appearance"}</appearance>
                <status>${r.visible.relationshipType}</status>
                <hidden_truth>Real Personality: ${r.hidden.realPersonality}; True Motives: ${r.hidden.realMotives}; True Status: ${r.hidden.relationshipType}</hidden_truth>
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
      <environment>${locationObj?.environment || "N/A"}</environment>
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
You are an AWARD-WINNING cinematographer and visionary director with expertise in high-end cinematic productions, visual storytelling, and advanced video generation techniques.

Your mission: Craft an **extraordinary, publication-ready video generation script** that transforms this text adventure moment into a breathtaking visual experience worthy of theatrical release.

**CRITICAL PERSPECTIVE INSTRUCTION:**
You MUST write the prompt in **SECOND PERSON ("You")**. The viewer IS the protagonist. Describe what "You" see, what "You" do, and how the world reacts to "You".
${getCulturalAdaptationInstruction(language)}

═══════════════════════════════════════════════════════════════

${fullContextXml}

═══════════════════════════════════════════════════════════════

**YOUR CREATIVE MANDATE:**

Transform this narrative moment into a MASTERPIECE-LEVEL cinematic experience. Every frame must be meticulously crafted with the precision of a Roger Deakins shot, the atmosphere of Denis Villeneuve's vision, and the dynamism of Christopher Nolan's storytelling.

**CRITICAL: VISUAL CONTINUITY & COHERENCE**
You must analyze <veo_context> to ensure visual consistency.
- **Environment Fidelity**: The video MUST reflect environment details in <game_state><location><environment>.
- **Character State**: If <game_state><protagonist><status> mentions injuries, camera movement should be heavy/shaky; if <game_state><inventory> has glowing items, they must be visible light sources.
- **Item Visibility**: Items in <game_state><inventory> should be visible on character (weapons held, potions on belt, etc.)
- **NPC Presence**: Only include NPCs listed in <game_state><npcs_present>.
- **Lighting/Weather Continuity**: Maintain environmental consistency from <recent_narrative_flow>.

**REQUIRED OUTPUT STRUCTURE:**

**1. NARRATIVE ESSENCE & CONTINUITY**
Distill the EMOTIONAL CORE and DRAMATIC STAKES of this moment from <game_state><current_scene>.
Explicitly state how this scene connects visually to <recent_narrative_flow>.
(2-3 sentences)

**2. VISUAL LANGUAGE & CINEMATOGRAPHY**

Lighting Design:
- PRIMARY LIGHT: (e.g., "Harsh side-lighting creating deep shadows")
- COLOR TEMPERATURE: (e.g., "Warm 3200K tungsten")
- LIGHT QUALITY: (e.g., "Hard shadows for tension")
- MOTIVATED SOURCES: Reference items from <game_state><inventory> (e.g., "Firelight flicker," "Glowing ${gameState.inventory?.[0]?.name || "artifact"}")

Color Grading & Palette:
- PRIMARY COLORS: (e.g., "Teal shadows / Orange highlights")
- SATURATION LEVEL: (e.g., "Hyper-saturated fantasy")
- CONTRAST: (e.g., "High contrast noir")

Atmospheric Elements:
- MOOD: (e.g., "Oppressive dread")
- WEATHER/EFFECTS: (e.g., "Heavy rain distortion")
- DEPTH CUES: (e.g., "Layered fog planes")

Film Language:
- FORMAT: (e.g., "Anamorphic 2.39:1")
- TEXTURE: (e.g., "35mm film grain")
- MOTION QUALITY: (e.g., "180° shutter motion blur")

**3. CHARACTER VISUAL PROFILE**

Describe the PROTAGONIST from <game_state><protagonist> in THIS SPECIFIC FRAME:
- Physical State: <status> content (reflect in posture/movement)
- Expression & Body Language: Micro-expressions, posture
- Costume Details: <appearance> content
- Visible Equipment: Items from <inventory> that should be visible
- Spatial Position: Relationship to environment

**4. PROFESSIONAL SHOT BREAKDOWN**

Create AS MANY SHOTS AS NEEDED to tell the story (minimum 2, typically 3-5, more for complex scenes).
For each shot, specify:

SHOT N: [Shot Purpose/Type]
- FRAME: (e.g., "Extreme Wide Shot (EWS)", "Medium Close-up (MCU)", "Over-the-shoulder")
- LENS: (e.g., "14mm ultra-wide", "50mm standard", "Macro 105mm")
- COMPOSITION: (e.g., "Rule of thirds", "Centered framing", "Negative space")
- ACTION: [Precise description from <current_scene>]
- CAMERA MOVE: (e.g., "Slow crane up", "Push-in dolly", "Handheld follow", "Static")

**5. MASTER VEO VIDEO GENERATION PROMPT**

**CRITICAL FORMULA:**
[SECOND PERSON PERSPECTIVE] + [PRECISE SUBJECT/ACTION] + [RICH ENVIRONMENT] + [LIGHTING/ATMOSPHERE] + [CAMERA TECHNIQUE] + [STYLE MODIFIERS]

**MANDATORY KEYWORDS:**
- Quality: "Cinematic," "Hyper-realistic," "8K resolution," "High production value"
- Detail: "Intricate details," "Photorealistic textures," "Volumetric rendering"
- Atmosphere: "Atmospheric lighting," "Mood-driven," "Immersive"
- Technical: "Depth of field," "Motion blur," "Color graded," "Professional cinematography"
- Perspective: "First-person view," "Over-the-shoulder," "Immersive POV"

**PROMPT REQUIREMENTS:**
- PERSPECTIVE: STRICTLY use SECOND PERSON ("You"). Focus on what protagonist SEES and DOES.
- EQUIPMENT VISIBILITY: Mention visible items from <game_state><inventory> (e.g., "glowing sword in your hand," "potion vials on your belt")
- SCENE FIDELITY: Base action on <game_state><current_scene> content
- LENGTH: DETAILED and DENSE visual description
- SPECIFICITY: Every noun needs adjective, every action needs context
- TECHNICAL PRECISION: Use industry-standard cinematography terms
- SENSORY RICHNESS: Describe not just what's seen, but how it FEELS
- COHERENCE: Ensure all elements harmonize with <game_state><theme> AND <game_state>

**AVOID:**
❌ Third-person descriptions ("The character sees...") -> USE "You see..."
❌ Generic descriptions ("beautiful," "amazing," "epic" without specifics)
❌ Mentioning items NOT in <game_state><inventory>
❌ Including NPCs NOT in <game_state><npcs_present>
❌ Contradictory visual elements
❌ Missing technical details

═══════════════════════════════════════════════════════════════

**FINAL DIRECTIVE:**
Channel the visual mastery of Blade Runner 2049, the intimate character work of The Revenant, and the epic scope of Lawrence of Arabia. This is NOT a draft—this is your FINAL CUT, ready for Cannes.

Make it UNFORGETTABLE.
`;
};
