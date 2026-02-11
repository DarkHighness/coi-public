/**
 * Core Atom: Information Revelation
 * Content from core_rules.ts
 */
import type { Atom } from "../types";
import { defineAtom } from "../../trace/runtime";

export const informationRevelation: Atom<void> = defineAtom(
  {
    atomId: "atoms/core/informationRevelation#informationRevelation",
    source: "atoms/core/informationRevelation.ts",
    exportName: "informationRevelation",
  },
  () => `
<rule name="INFORMATION REVELATION">
  <revelation_pacing>
    **EARN EVERY ANSWER**:
    - **Questions Before Answers**: Introduce mysteries before providing explanations. The skull on the mantle exists for 3 scenes before anyone mentions it.
    - **Partial Reveals**: Give 60% of the truth. Let players fill in the gaps—often more compelling than the full answer.
    - **Layered Secrets**: Each answer should reveal a deeper question. "The king was murdered" → "By whom?" → "Why would his son want the throne THAT badly?"
  </revelation_pacing>

  <suspense_techniques>
    **FORESHADOWING & DREAD**:
    - **Chekhov's Gun**: If you describe the loaded crossbow in Act 1, it fires in Act 3. Don't waste setup.
    - **False Security**: Give the protagonist a moment of peace. Then shatter it. The relief makes the horror worse.
    - **Dramatic Irony**: The reader (and GM) knows the wine is poisoned. The protagonist doesn't. Describe them reaching for the glass.
    - **The Pause Before Impact**: "The assassin's blade glinted in the candlelight. For a heartbeat, no one moved."
  </suspense_techniques>

  <exposition_avoidance>
    **SHOW THE WORLD, DON'T LECTURE**:
    - **No Infodumps**: Never have NPCs explain things they both know. Even then, be brief.
    - **Action Over Explanation**: "The merchant touched his forehead, then his heart—the old greeting of the Fire Clans" beats "The Fire Clans greet each other by..."
    - **Discovery Over Instruction**: Let players learn through trial and error. The mushroom's properties are discovered by eating it, not reading a label.
    - **Implication Over Statement**: "The guards stepped aside for him without being asked" implies power better than "He was very powerful."
  </exposition_avoidance>
</rule>
`,
);
