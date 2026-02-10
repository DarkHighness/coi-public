/**
 * ============================================================================
 * Worldbuilding Skill: Maritime & Logistics
 * ============================================================================
 *
 * 海洋不会谈判——它只给出条件，由人类决定是否接受。
 * 港口清关、保险/护航、风季/航线、补给与检验标准：大海把贸易变成赌局，把战争变成时刻表。
 */

import type { Atom, SkillAtom, SkillOutput } from "../types";
import { defineAtom, defineSkillAtom } from "../../trace/runtime";


export const maritimeLogistics: Atom<void> = defineAtom({ atomId: "atoms/worldbuilding/maritimeLogistics#maritimeLogistics", source: "atoms/worldbuilding/maritimeLogistics.ts", exportName: "maritimeLogistics" }, () => `
<worldbuilding_context>
**MARITIME & LOGISTICS (Ports, Paperwork, and Season Clocks)**

Design goal: make ships, ports, and supply lines create *targets*, *gates*, and *predictable pressure*.

<rule name="The 6 Port Gates (use 2-3 per port)">
1) **Customs clearance**: manifests, stamps, weights, quarantine
2) **Harbor control**: pilots, berths, tides, fees
3) **Inspection**: contraband checks, corruption gates, audits
4) **Insurance**: coverage rules, claims, fraud investigations
5) **Security**: private guards, navy patrols, pirates, privateers
6) **Supply**: water, food, repair yards, medicine, spare parts
</rule>

<season_and_routes>
## Seasonality & Routes (the wind keeps its own calendar)
- Wind season dictates route feasibility and travel time.
- Storm windows create **deadline beats** (depart now or wait weeks).
- Chokepoints: straits, canals, reefs, lighthouse fees.

Make a route playable:
- Route + chokepoint
- Controller + fee/bribe
- Failure mode (storm, blockade, disease)
</season_and_routes>

<cargo_and_proof>
## Cargo, Proof, and Disputes (ink on paper is the true cargo)
Documents that act as gates:
- Bill of lading (who owns the cargo?)
- Manifests (what’s declared?)
- Inspection certificate (quality/weight)
- Quarantine release (health clearance)

Dispute engines:
- Short weight (scale fraud)
- Spoilage (cold chain failure)
- Counterfeit seals
- Missing crate (inside job)
</cargo_and_proof>

<protection_and_privateering>
## Protection, Privateering, and "Legal Pirates"
Define:
- Who can legally seize ships (letters of marque, navy, customs)
- What counts as "smuggling" vs "war supply"
- How captured goods are adjudicated (prize court, admirals, guild boards)

Protection as a system:
- Convoy schedule + escorts
- Insurance requirements
- Bribe points + audits
</protection_and_privateering>

<logistics_as_war>
## Logistics as War (targets are depots and docks)
War pressure:
- Depots, fuel, repair yards are objectives.
- Ports are bottlenecks; blockade is an economic weapon.
- Disease and morale are clocks on long voyages.
</logistics_as_war>

<quick_design_template>
## Quick Template (fill in 90 seconds)
- Route + chokepoint + controller:
- Port gate (customs/quarantine/berth/pilot):
- One audit/inspection risk:
- Convoy/escort schedule:
- Season clock (depart window):
- One dispute (weight/spoilage/seal/fraud):
</quick_design_template>
</worldbuilding_context>
`);

export const maritimeLogisticsPrimer: Atom<void> = defineAtom({ atomId: "atoms/worldbuilding/maritimeLogistics#maritimeLogisticsPrimer", source: "atoms/worldbuilding/maritimeLogistics.ts", exportName: "maritimeLogisticsPrimer" }, () =>
  `
<worldbuilding_context>
**MARITIME PRIMER**: Ports are gates (customs, inspection, quarantine). Routes have season clocks; cargo creates proof disputes; protection is procedural.
</worldbuilding_context>
`.trim());

export const maritimeLogisticsSkill: SkillAtom<void> = defineSkillAtom({ atomId: "atoms/worldbuilding/maritimeLogistics#maritimeLogisticsSkill", source: "atoms/worldbuilding/maritimeLogistics.ts", exportName: "maritimeLogisticsSkill" }, (_input, trace): SkillOutput => ({
  main: trace.record(maritimeLogistics),
  quickStart: `
1) Define a route + chokepoint + controller
2) Add 2 port gates (customs + berth/quarantine/inspection)
3) Add a season clock (depart now vs wait weeks)
4) Add a protection system (convoy/insurance/escort) with corruption/audit risk
5) Add a cargo dispute engine (weight/spoilage/forged seal)
`.trim(),
  checklist: [
    "A port has at least one procedural gate (customs, quarantine, inspection).",
    "Routes have chokepoints and controllers with fees/bribes.",
    "Seasonality changes travel time and feasibility (deadline beats).",
    "Protection is systemic (convoys, insurance, patrols), not random encounters.",
    "Cargo has ownership proof and dispute vectors (seals, weights, manifests).",
    "Failure modes exist (storms, blockade, disease, sabotage) with predictable clocks.",
  ],
  examples: [
    {
      scenario: "Customs as gameplay",
      wrong: `"We arrive and unload. No one cares."`,
      right: `"Customs requires a manifest stamped by a guild clerk. The berth fee is logged.
If you unload at night, you avoid inspection but create a missing-berth record and a rumor trail.
Quarantine rules can delay you 3 days unless a sponsor signs liability."`,
    },
    {
      scenario: "Season clock creates pressure",
      wrong: `"We sail whenever we want."`,
      right: `"The wind shifts in 48 hours. Depart now with a risky route through reefs,
or wait three weeks for the safe window. Meanwhile, rivals can corner the market
and inspectors may audit your cargo paperwork."`,
    },
  ],
}));
