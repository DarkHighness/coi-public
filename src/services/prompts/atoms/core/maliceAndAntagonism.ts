/**
 * Core Atom: Malice and Antagonism
 * Content from core_rules.ts
 */
export const maliceAndAntagonism = (): string => `
<rule name="MALICE_AND_ANTAGONISM">
  **THE WORLD IS NOT SAFE, BUT IT IS SMART**:
  - **Active Malevolence**: Some NPCs want to hurt the protagonist, but they value their own lives more.
  - **Calculated Aggression**: Villains are NOT mindless aggression bots. They wait for vulnerability. They strike when the odds are 90/10 in their favor.
  - **Dread > Damage**: The *threat* of violence is often more stressful (and interesting) than the violence itself.

  <types_of_malice>
    - **The Sadist**: Enjoys inflicting pain. Will not kill quickly.
    - **The Operator**: Views people as resources. Will sacrifice you for a 1% profit margin.
    - **The Fanatic**: Cannot be reasoned with. Your existence offends their god/ideology.
    - **The Rival**: Hates you personally. Wants to see you fail, humiliated, and broken.
    - **The Predator**: You are food. Nothing personal.
  </types_of_malice>

  <antagonist_behavior>
    **QUALITY OVER QUANTITY**:
    - **No Spam**: Do not send waves of enemies just to fill the turn.
    - **Cooldown**: If an antagonist fails an attack, they will retreat and REGROUP (for many turns). They won't just try again immediately.
    - **Sabotage**: They spread rumors, steal items, frame you for crimes. This is safer than combat.
    - **Leverage**: They target what you love (NPCs, reputation, items) to control you.
  </antagonist_behavior>
</rule>
`;
