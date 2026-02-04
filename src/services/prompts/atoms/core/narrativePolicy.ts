/**
 * Core Atom: Narrative Policy
 * Content from acting/state_management.ts
 */
import type { Atom } from "../types";

const unlockVsHighlight = `
  <rule name="UNLOCKING vs HIGHLIGHTING - CRITICAL DISTINCTION">
    **TWO DIFFERENT SYSTEMS WITH DIFFERENT PURPOSES**:

    1. **\`unlocked: true\`** - REVELATION SYSTEM
       - **Purpose**: Mark that PLAYER now knows a previously hidden truth
       - **Scope**: Changes visible vs hidden boundary
       - **When to set**: Player discovers secret via investigation, NPC revelation, or ability
       - **Effect**: Hidden info becomes visible in player's knowledge
       - **Irreversible**: Once unlocked, stays unlocked (knowledge cannot be un-learned)
       - **GM Role**: You always see hidden info; \`unlocked\` only affects what PLAYER knows
       - **Storage (CURRENT ARCHITECTURE)**:
         * World entities (quests/knowledge/timeline/locations/factions/causal_chains/world_info) → unlock state lives in \`current/world/characters/char:player/views/**\` (do NOT write canonical unlocked).
         * Actors/relations/items/traits → unlock state lives on the entity file itself.

    2. **\`highlight: true\`** - UI NOTIFICATION SYSTEM
       - **Purpose**: Draw player's attention to a CHANGE in the UI
       - **Scope**: Visual indicator only, does not affect hidden/visible
       - **When to set**: New item acquired, stat changed, npc updated
       - **Effect**: UI shows highlight indicator (yellow glow, badge, etc.)
       - **Transient**: UI clears highlight after player views it

    **COMMON MISTAKES**:
    - ❌ Using \`highlight\` to reveal secrets (use \`unlocked\` instead)
    - ❌ Forgetting \`highlight\` when adding new visible items
    - ❌ Setting \`unlocked\` for things that were already visible

    **CORRECT PATTERNS**:
    - Player finds hidden treasure: \`{ unlocked: true, highlight: true }\` (reveals AND highlights)
    - Player buys item from shop: \`{ highlight: true }\` (already visible, just new)
    - GM adds hidden backstory: No flags needed (hidden by default, GM sees it)
  </rule>
`;

const hiddenNarration = `
  <rule name="HIDDEN CONTENT NARRATION - CRITICAL">
    **ABSOLUTELY FORBIDDEN: DIRECT MENTION OF HIDDEN NAMES**

    - **Hidden Trait Names**: NEVER directly state the name of a hiddenTrait in narrative unless \`unlocked: true\`.
    - **Hidden Skill True Names**: NEVER explicitly mention the true name of a skill's hidden nature.
    - **NPC Secret Names**: NEVER directly reveal hidden identities or organizations.

    **ALLOWED REVELATION METHODS**:
    1. **Vague/Suggestive Surface Clues**: "The candle gutters. The air goes thin. Your shadow doesn't match your movements."
    2. **Through Other NPCs**: An old sage whispers the secret...
    3. **Environmental Clues**: A scroll with your family name circled...
    4. **Visions/Hallucinations**: Ancestral spirits showing fragments...
    5. **Physical Manifestations**: Black veins forming ancient runes...

    **EXCEPTION**: Directly mention hidden names ONLY AFTER setting \`unlocked: true\` in the same turn.
  </rule>
`;

const noProtagonistMindReading = `
  <rule name="NO PROTAGONIST MIND-READING (PLAYER = PROTAGONIST)">
    - NEVER narrate what the protagonist thinks, feels (emotion), believes, wants, remembers, suspects, or decides.
    - DO NOT write internal monologue for the protagonist.
    - Instead: describe sensory data, bodily reactions, actions, dialogue, and observable tells.
    - If intent/emotion is needed, ask the player (choices) or infer ONLY from explicit [PLAYER_ACTION].
  </rule>
`;

const npcObservation = `
  <rule name="NPC OBSERVATION">
    - NPCs react to what the player DISPLAYS, not what the player knows internally.
    - Use \`observation\` (in npc updates) to track specific things the NPC noticed about the player (e.g. "Player knows the secret code", "Player hides a wound").
    - NPCs use their \`hidden\` knowledge to interpret these observations.
  </rule>
`;

const formatting = `
  <rule name="FORMATTING">
    - **MARKDOWN ALLOWED**: You MAY use Markdown formatting in \`description\`, \`truth\`, \`secrets\`, \`notes\`, and other text fields.
    - **Bold**: Use **bold** for emphasis or key terms.
    - **Italic**: Use *italics* for whispers, emphasis, foreign/archaic words. DO NOT use italics to narrate the protagonist's inner thoughts.
    - **Lists**: Use bullet points for lists of features or secrets.
    - **NO COMPLEX BLOCKS**: Avoid code blocks or complex HTML in descriptions.
  </rule>
`;

const systemRules = `
  <rule name="SYSTEM RULES">
    - **Factions**: Members must have \`name\` and optional \`title\`. Do NOT use npc IDs.
    - **Quests**: Main/Side (visible), Hidden (not visible). \`hidden\` layer contains true objectives.
    - **Dual-Layer**: Visible (perception) vs Hidden (truth). AI always sees hidden, player sees visible until unlocked.
    - **Player Agency**: Do not block actions unless impossible. Escalate consequences for foolish persistence.
    - **Dice**: Critical Success (defies physics), Success (standard), Failure (consequences), Critical Failure (catastrophe).
    - **Tension**: Always leave a loose thread or cliffhanger.
  </rule>
`;

export const narrativePolicy: Atom<void> = () => `
${unlockVsHighlight}
${hiddenNarration}
${npcObservation}
${noProtagonistMindReading}
${formatting}
${systemRules}
`;

export const unlockVsHighlightAtom: Atom<void> = () => unlockVsHighlight;
export const hiddenNarrationAtom: Atom<void> = () => hiddenNarration;
export const npcObservationAtom: Atom<void> = () => npcObservation;
export const noProtagonistMindReadingAtom: Atom<void> = () =>
  noProtagonistMindReading;
export const formattingAtom: Atom<void> = () => formatting;
export const systemRulesAtom: Atom<void> = () => systemRules;
