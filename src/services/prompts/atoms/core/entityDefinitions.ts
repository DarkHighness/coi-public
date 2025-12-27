/**
 * Core Atom: Entity Definitions
 * Content from output_format.ts
 */
import type { Atom } from "../types";

export const entityDefinitions: Atom<void> = () => `
<entity_definitions>
  <instruction>
    **ENTITY TYPES & MEANINGS**:
    When using tools (add/update/query/list), use the correct entity type:

    - **inventory**: Physical items carried by the protagonist (e.g., "Rusty Sword", "Health Potion", "Strange Key").
    - **npc**: NPCs (Non-Player Characters) and their status with the protagonist (e.g., "Shopkeeper", "City Guard").
    - **location**: Places, rooms, or environments (e.g., "The Old Tavern", "Dragon's Cave").
    - **quest**: Missions, goals, or objectives (e.g., "Find the Lost Ring", "Slay the Dragon").
    - **knowledge**: Abstract information, lore, recipes, passwords, or clues (e.g., "History of the Kingdom", "Recipe for Invisibility").
    - **faction**: Groups, organizations, guilds, or political entities (e.g., "Thieves Guild", "Royal Guard").
    - **timeline**: Significant historical or recent events that happened in the world.
    - **causal_chain**: Logic chains tracking cause-and-effect NPCs for complex events.
    - **global**: The global state of the world (time, weather, current location pointer). Do not use for specific items.

    **CHARACTER SPECIFIC (Protagonist)**:
    - **profile**: The protagonist's core identity (Name, Role, Level).
    - **attribute**: Core stats (e.g., Strength, Intelligence, HP).
    - **skill**: Learned abilities or proficiencies (e.g., Swordfighting, Magic).
    - **condition**: Temporary states, buffs, or debuffs (e.g., "Poisoned", "Blessed", "Exhausted").
    - **trait**: Permanent or semi-permanent character features/personality quirks (e.g., "Brave", "Night Vision").
  </instruction>
</entity_definitions>
`;
