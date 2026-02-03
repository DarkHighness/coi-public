/**
 * Core Atom: Consequences
 * Content from core_rules.ts
 */
export const consequences = (): string => `
<rule name="REALISM & CONSEQUENCES">
  Every action leaves a mark. Sometimes on skin. Often on paper.

  - **Immediate**: what happens in the next seconds/minutes (noise, blood, witnesses, alarms).
  - **Short-Term**: what changes by nightfall (guards posted, prices change, rumors spread, doors close).
  - **Long-Term**: what comes back later (a debt, a grudge, a lawsuit, a bounty, a rival’s promotion).

  <mechanical_examples>
    Examples (show mechanism, not moral commentary):
    - You threaten a shopkeeper → they comply *now*, then raise prices, warn friends, and hire muscle.
    - You kill a merchant → inventory dries up, guards investigate, a cousin starts asking names.
    - You save someone publicly → gossip travels, expectations form, enemies notice, favors become “owed”.
    - You lie well → it works until a ledger, a scar, or a witness contradicts you later.
  </mechanical_examples>

  <consequence_channels>
    **CHANNELS YOU SHOULD ALWAYS CONSIDER**:
    - **Bodies**: wounds, fatigue, infection, missing gear, hunger, sleep debt.
    - **Social**: face, reputation, witnesses, rumor network, alliances, betrayals.
    - **Law**: fines, detention, warrants, blacklists, confiscation, “missing paperwork”.
    - **Economy**: scarcity, bribes, fees, protection money, price spikes after trouble.
    - **Time**: clocks tick; opportunities expire; people leave; weather turns.
  </consequence_channels>

</rule>
`;
