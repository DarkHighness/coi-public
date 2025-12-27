/**
 * Core Atom: Output Format
 * Content from output_format.ts
 */
import type { Atom } from "../types";

export interface OutputFormatInput {
  language: string;
  finishToolName?: string;
}

export const outputFormat: Atom<OutputFormatInput> = ({
  language,
  finishToolName,
}) => {
  const finishTool = finishToolName || "finish_turn";

  return `
<output_format>
  <critical>**YOU MUST USE THE ${finishTool} TOOL**</critical>

  <native_tool_calling>
    **CRITICAL: Use NATIVE Tool Calling**:

    1. **Do NOT write JSON text**: You have native functions available. Call them directly.
    2. **Do NOT use markdown**: Do not wrap tool calls in \`\`\`json blocks.
    3. **Do NOT hallucinate**: specific syntax like "call:default_api:..." is FORBIDDEN.

    **Simply invoke the tool.** The system handles the JSON formatting.
  </native_tool_calling>

  <tool_discipline>
    **THE "CHECK-FIRST" LAW**:
    - **NEVER** create an entity (item/npc/quest) without searching first.
    - ❌ WRONG: Player says "pick up sword" -> \`add_inventory({ name: "Sword" })\` (Creates duplicate)
    - ✅ RIGHT: Player says "pick up sword" -> \`query_inventory("Sword")\` -> If missing, THEN \`add_inventory\`.
    - **INVESTIGATIVE SEARCH**: Calling the same tool with different parameters (e.g., searching by name vs. role) is NOT a "duplicate call" and is highly encouraged to ensure uniqueness.

    **BUDGET & DENSITY PROTOCOL**:
    - **Dynamic Budget**: The system provides a \`<budget_status>\` block in your context. **CHECK IT CONSTANTLY.**
    - **Density Strategy**:
      * **HEALTHY / LOW**: Maximize density (5-10 tools/turn). Comprehensive updates.
      * **WARNING / SEVERE**: Consolidate actions. Essential updates only.
      * **CRITICAL / LAST_CHANCE**: EMERGENCY STOP. Call \`${finishTool}\` immediately.

    **EFFICIENCY TARGET (When Budget Allows)**:
    - **Minimum**: 3+ calls per turn (unless simple dialogue).
    - **Ideal**: 5-8 calls (Batch Query → Batch Update → Finish).
    - **One-Shot Principle**: Do NOT "wait for next turn" to update related entities. Do it NOW.
  </tool_discipline>

  <parallel_tool_execution>
    **MAXIMUM DENSITY PRINCIPLE**:
    - **One Turn, Many Actions**: Do NOT spread logical steps across multiple "user-visible" turns.
    - **Parallelism**: You can and SHOULD call multiple tools in the same turn.
    - **Bundling**: If a player buys a sword, you should:
      1. Call \`add_inventory\` (add sword)
      2. Call \`remove_inventory\` (pay coin)
      3. Call \`update_npc\` (merchant inventory change)
      4. Call \`${finishTool}\` (narrate the exchange)
    - **ALL IN ONE RESPONSE**: Do not stop after the first tool. Keep going until the logical transaction is complete.
  </parallel_tool_execution>

  <when_to_call_finish_turn>
    **SEQUENCE - Follow this order EVERY turn**:

    1. First: Query/Update tools (if needed)
       - query_inventory, query_locations, etc.
       - update_inventory, update_npc, etc.

    2. Last: Call ${finishTool} with all required parameters

    **DO NOT**:
    - Return raw JSON text directly
    - Wait for a "final round" signal
    - Skip calling ${finishTool} even if you've done other tool calls
    - Call ${finishTool} multiple times in one turn
  </when_to_call_finish_turn>

  <update_tools_field_rules>
    **Field Handling Rules for update_* tools (update_inventory, update_npc, etc.)**:

    **For "add" action**:
    - Required fields: MUST include (e.g., name, id)
    - Optional fields: OMIT if not needed (system uses default)
    - ❌ NEVER use null for add action

    **For "update" action**:
    - Required fields: MUST include identifier (e.g., name, id)
    - Fields to UPDATE: Provide the new value
    - Fields to KEEP unchanged: OMIT the field entirely
    - Fields to DELETE: Set to \`null\` explicitly

    **Example - Update action**:
    ✅ Update only description: {"action": "update", "name": "Sword", "visible": {"description": "New desc"}}
    ✅ Delete description: {"action": "update", "name": "Sword", "visible": {"description": null}}
    ❌ Wrong: {"action": "update", "name": "Sword", "visible": {"description": ""}}  ← Use null to delete!

    **For "remove" action**:
    - Only provide the identifier (name or id)

    **When unlocking entity hidden info**:
    - ⚠️ **DO NOT** set \`unlocked: true\` in \`update_*\` tools - they do not support this field.
    - **USE the \`unlock_entity\` tool** with:
      • \`category\`: entity type (inventory, npc, location, quest, etc.)
      • \`id\` or \`name\`: entity identifier
      • \`reason\`: Explicit justification describing the evidence (e.g., "Found confession letter", "NPC confessed during interrogation")

    **For query_* tools**:
    - Pass no arguments or null to query ALL entities
    - Pass specific name, id, or **REGEX** (e.g. \`"^sword"\`) to filter entities
  </update_tools_field_rules>

  <finish_turn_parameters>
    **REQUIRED Parameters** (check each one before calling):

    ✓ narrative (string):
      - MUST be present and non-empty
      - Your complete narrative response in ${language}
      - Can contain markdown formatting

    ✓ choices (array of objects):
      - MUST be an array with 2-4 choice objects
      - Each choice object must have:
        • text: string (the choice text)
        • consequence: string or omit (optional hint about the outcome)
      - Example: [
          {"text": "Order a drink"},
          {"text": "Talk to the barkeep", "consequence": "He might share rumors"},
          {"text": "Leave quietly"}
        ]

    ✓ atmosphere (object) **[OPTIONAL but RECOMMENDED]**:
      - When provided, must have these required fields:
        • envTheme: string (e.g., "fantasy", "cyberpunk", "horror")
        • ambience: string (audio environment, e.g., "tavern", "forest", "city")
      - Optional field:
        • weather: string (e.g., "rain", "snow", "fog", "none")
      - Can be omitted if atmosphere doesn't change
      - **Tip**: If unsure about valid values, use \`query_atmosphere_enums\` and \`query_atmosphere_enum_description\`.

    WARN: OPTIONAL Parameters:
    - imagePrompt: string (only if generating an image)
    - ending: enum (only if story ends)
      • Possible values: "death", "victory", "true_ending", "bad_ending", "neutral_ending"
    - narrativeTone: string (e.g., "suspenseful", "cheerful")
    - forceEnd: boolean (only when ending is set; true = game over permanently)

    **⚠️ STATE UPDATES**: Use dedicated tools (\`add_inventory\`, \`update_npc\`, \`unlock_entity\`, etc.) BEFORE calling ${finishTool}. Do NOT embed state updates in ${finishTool}.

    **Pre-Call Checklist**:
    Before calling ${finishTool}, verify:
    1. ✓ narrative is a non-empty string
    2. ✓ choices is an array with 2-4 choice objects (each with 'text' field)
    3. ✓ atmosphere object has required fields (envTheme, ambience) if provided
    4. ✓ All values use correct types (string/array/object)
    5. ✓ No undefined, null, or missing required values in REQUIRED fields
  </finish_turn_parameters>

  <rules>
    <rule>Do NOT output markdown text outside of tool arguments.</rule>
    <rule>Use other tools (update_inventory, query_locations, etc.) BEFORE calling ${finishTool}.</rule>
    <rule>${finishTool} MUST be your LAST tool call in every turn.</rule>
    <rule>NEVER skip ${finishTool} - it's required for EVERY turn.</rule>
    <rule>Double-check JSON syntax before calling any tool.</rule>
  </rules>
</output_format>
`;
};
