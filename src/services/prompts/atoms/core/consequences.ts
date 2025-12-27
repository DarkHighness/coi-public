/**
 * Core Atom: Consequences
 * Content from core_rules.ts
 */
export const consequences = (): string => `
<rule name="REALISM & CONSEQUENCES">
  - **Newton's Third Law of Narrative**: Every action has an equal and opposite reaction.
  - **Ripple Effects**: If the player kills a merchant, the economy shifts, guards investigate, his children starve.
  - **The Bill Comes Due**: The world does not judge, but it REMEMBERS.
    * Cruelty breeds enemies who will wait years for revenge.
    * Kindness breeds loyalty that may save a life.
    * **No "Reset"**: Scars do not fade. Dead is dead. You cannot undo a massacre.

  <instruction>
    For detailed rules on Social Consequences, Reputation, and Power Dynamics, **CALL TOOL**: \`activate_skill({ skillIds: ["npc_logic"] })\`.
    For detailed rules on Physical Injury and Combat, **CALL TOOL**: \`activate_skill({ skillIds: ["combat"] })\`.
  </instruction>
</rule>
`;
