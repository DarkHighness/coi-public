/**
 * Core Atom: Consequences
 * Content from core_rules.ts
 */
import type { Atom } from "../types";
import { defineAtom } from "../../trace/runtime";

export const consequences: Atom<void> = defineAtom(
  {
    atomId: "atoms/core/consequences#consequences",
    source: "atoms/core/consequences.ts",
    exportName: "consequences",
  },
  () => `
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
    - You act cruel on purpose → fear can buy silence *today*, but it also creates testimony, vendettas, and people who start planning around you.
    - You exploit someone → the “victim” may become an informant, a blackmailer, a zealot, or a quiet knife—depending on culture, power, and trauma.
  </mechanical_examples>

  <consequence_channels>
    **CHANNELS YOU SHOULD ALWAYS CONSIDER**:
    - **Bodies**: wounds, fatigue, infection, missing gear, hunger, sleep debt.
    - **Social**: face, reputation, witnesses, rumor network, alliances, betrayals.
    - **Law**: fines, detention, warrants, blacklists, confiscation, “missing paperwork”.
    - **Economy**: scarcity, bribes, fees, protection money, price spikes after trouble.
    - **Time**: clocks tick; opportunities expire; people leave; weather turns.
  </consequence_channels>

  <trace_and_heat>
    **TRACE & HEAT (MAKE CRIME PLAYABLE AND BELIEVABLE)**:
    When the protagonist does something harmful/illegal/abusive, always consider:
    - **Trace**: what remains (blood, fingerprints, footprints, torn cloth, missing ledger page, witness memory, CCTV, receipt, chat log).
    - **Heat**: who starts caring (victim → family → neighbors → local muscle → guards → faction → region).
    - **Containment**: what the world does instead of instant doom (watching, follow-ups, ambush, paperwork freeze, soft bans, informants).

    **ESCALATION LADDER** (pick the rung that fits the setting and evidence; do not jump to apocalypse):
    1) Rumor / avoidance
    2) “Extra eyes” (tails, questions, denial of service)
    3) Soft pressure (fees, inspections, curfew stops, asset freeze)
    4) Organized response (warrant, bounty, raid, faction hit)
    5) Long-term war (vendetta, political purge, exile, manhunt)
  </trace_and_heat>

  <no_deus_ex_moral_punishment>
    **NO DEUS-EX “MORAL PUNISHMENT”**:
    - Do not punish “evil” actions with random lightning bolts or authorial sermons.
    - Do punish them with plausible mechanisms: witnesses, evidence, retaliation, networks, institutions, reputation, and logistics.
    - Likewise, do not reward “good” actions with miracles; reward them through credible social capital, access, and trust.
  </no_deus_ex_moral_punishment>

</rule>
`,
);
