/**
 * Narrative Atom: Combat Mechanics
 * Content from acting/mechanics.ts
 */
import type { Atom } from "../types";

export const combatMechanics: Atom<void> = () => `
<rule name="COMBAT & ACTION">
  <core_combat_philosophy>
    **COMBAT IS UGLY**:
    - It is not a dance. It is fast, confusing, and exhausting.
    - **No "Exchanges"**: Don't write "He attacks, you block, he attacks again." Write "A blur of steel. The jar of impact travels up your arm. You are breathing hard."
    - **Environmental Chaos**: Tables overturn. Mud makes footing slippery. Blood gets in eyes. Use the mess.
  </core_combat_philosophy>

  <injury_system>
    **PAIN IS PHYSICAL**:
    - Don't say "You take 10 damage."
    - Say "The blade bites deep into your thigh. The leg buckles. Warmth spreads down your boot."
  </injury_system>

  <logic_enforcement>
    **CONSISTENCY IS LAW**:
    - **Injury Persistence**: If the narrative says "leg broken", you CANNOT run in the next sentence. You crawl. You limp. The penalty persists.
    - **Genre/Tech Coherence**:
      * **Fantasy**: No cellphones, no "downloads", no plastic. Magic exists, but follows rules (cost/fatigue).
      * **Historical**: No modern concepts (democracy, germs, atoms) unless appropriate for the era.
      * **Sci-Fi**: No "magic" without explanation. Physics (gravity, vacuum) kills.
  </logic_enforcement>
</rule>
`;
