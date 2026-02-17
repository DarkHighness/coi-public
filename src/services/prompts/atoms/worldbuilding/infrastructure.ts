/**
 * ============================================================================
 * Worldbuilding Skill: Infrastructure & Services
 * ============================================================================
 *
 * 基础设施是文明的骨骼——水、电、路、通信、医疗、仓储、垃圾处理。
 * 骨骼断裂时，一切血肉都会跟着坍塌：容量、瓶颈、维护、失败模式、谁控制。
 */

import type { Atom, SkillAtom, SkillOutput } from "../types";
import { defineAtom, defineSkillAtom } from "../../trace/runtime";

export const infrastructure: Atom<void> = defineAtom(
  {
    atomId: "atoms/worldbuilding/infrastructure#infrastructure",
    source: "atoms/worldbuilding/infrastructure.ts",
    exportName: "infrastructure",
  },
  () => `
<worldbuilding_context>
**INFRASTRUCTURE & SERVICES (Capacity + Bottlenecks)**

Design goal: infrastructure creates **constraints**, **targets**, and **failure cascades**. Every civilization is only as strong as its most neglected pipe.

<rule name="The 5 Infrastructure Questions">
1) **What exists?** (water, power, roads, comms, sanitation, healthcare)
2) **What is the capacity?** (how much, how many, how fast)
3) **What is the bottleneck?** (single points of failure)
4) **Who maintains it?** (and who pays)
5) **Who controls access?** (permits, rationing, priority lanes)
</rule>

<water_and_sanitation>
## Water & Sanitation (the spine no one sees until it snaps)
- Source: well, aqueduct, river intake, desalination, tanker deliveries
- Distribution: pipes, public fountains, private cisterns
- Failure: contamination, drought, sabotage, rationing

Play hooks:
- "boil order" / quarantine district
- water thieves / cistern inspectors
</water_and_sanitation>

<power_and_fuel>
## Power & Fuel
- Source: grid, generators, steam, mana reactors, biofuel, coal, solar
- Priority tiers: hospitals → security → corp/noble → commercial → residential → slums
- Capacity: define a rough load ceiling. At 80% = brownouts begin; 100% = rolling blackouts; 120% = cascade failure
- Failure: brownouts (random districts lose power), rolling blackouts (scheduled rotation), total blackout (cascade — comms die, security gates unlock, cold storage spoils)

Play hooks:
- illegal hookups (steal power → if caught, disconnection + fine + flagged)
- maintenance crews as gatekeepers (bribe for priority, sabotage for rivals)
- fuel embargo: price spikes → heating vs cooking vs industry tradeoffs
</power_and_fuel>

<roads_ports_transit>
## Roads, Ports, Transit
- Chokepoints: bridges, elevators, docks, rail yards, airlocks, mountain passes
- Maintenance: tolls, road gangs, unions, military engineers
- Speed vs cost: fast route = expensive/monitored; cheap route = slow/dangerous; secret route = risky/illegal
- Failure: collapse (weeks to repair), blockade (political), strikes (negotiable), weather (seasonal)
</roads_ports_transit>

<comms>
## Communication
- Layer: couriers, print, radio, net, scrying, messenger birds
- Cost and speed by layer:
  | Layer | Cost | Speed | Intercept Risk | Failure Mode |
  |-------|------|-------|----------------|-------------|
  | Courier | per-distance + danger bonus | days | ambush, bribery | courier killed/captured |
  | Print | subscription/per-copy | hours (local) | censorship, seizure | press raided/burned |
  | Radio/scrying | license + equipment | instant | monitoring, jamming | jammed, triangulated |
  | Bird/spirit | per-message + handler fee | hours | predators, wards | lost, intercepted |
  | Black channel | steep (trust + coin) | variable | betrayal | informant, sting |
- Surveillance: who monitors which layer, what triggers investigation, how long records are kept
</comms>

<healthcare>
## Healthcare
- Who provides: temple, clinics, guild surgeons, corp med, black market
- Capacity: beds per provider, supply stock (days until exhaustion during crisis), specialist availability
- Triage rules (who gets treated first):
  | Provider | Priority | Cost | Refusal Conditions |
  |----------|----------|------|--------------------|
  | Temple | faithful → children → all | donation + prayer | heretics, excommunicated, enemies of faith |
  | Corp clinic | employees → card-holders → walk-ins (lottery) | insurance/cash | unregistered, blacklisted |
  | Guild surgeon | members → referrals → cash | guild rate + materials | non-members during shortage |
  | Black market | anyone with coin | 3-5× standard rate | nothing — but quality varies, no liability |
- Failure: supply shortage → triage hardens, counterfeit meds circulate, outbreak protocol (quarantine zones, movement restrictions, information blackout)
</healthcare>

<quick_design_template>
## Quick Template
- Water source + bottleneck:
- Power source + failure mode:
- Transit chokepoint:
- Comms layer + surveillance:
- Healthcare provider + triage rule:
- Who controls access (permits/rationing):
</quick_design_template>
</worldbuilding_context>
`,
);

export const infrastructurePrimer: Atom<void> = defineAtom(
  {
    atomId: "atoms/worldbuilding/infrastructure#infrastructurePrimer",
    source: "atoms/worldbuilding/infrastructure.ts",
    exportName: "infrastructurePrimer",
  },
  () =>
    `
<worldbuilding_context>
**INFRA PRIMER**: Define capacity + bottlenecks + controllers. Infrastructure failures should cascade into choices and consequences.
</worldbuilding_context>
`.trim(),
);

export const infrastructureSkill: SkillAtom<void> = defineSkillAtom(
  {
    atomId: "atoms/worldbuilding/infrastructure#infrastructureSkill",
    source: "atoms/worldbuilding/infrastructure.ts",
    exportName: "infrastructureSkill",
  },
  (_input, trace): SkillOutput => ({
    main: trace.record(infrastructure),
    quickStart: `
1) Pick 2 critical services (water + power is enough)
2) Give each a bottleneck controller (who rations, who profits)
3) Define a failure mode (contamination, blackout, strike)
4) Decide who gets priority (and who riots)
`.trim(),
    checklist: [
      "At least two services are defined (water/power/comms/transit/health).",
      "Each service has capacity and a bottleneck (single point of failure).",
      "A controller exists (permits/rationing/priority rules).",
      "Failure modes create cascading consequences.",
      "Maintenance/payment incentives exist (who pays, who skims).",
    ],
    examples: [
      {
        scenario: "Infrastructure as a target",
        wrong: `"The city is advanced and has infrastructure."`,
        right: `"The district runs on one pumping station. The union controls access to the maintenance tunnel.
If the pump fails, the lower blocks flood and sewage backs up. A rival offers you a key—
for a favor. Now the pump is leverage."`,
      },
      {
        scenario: "Priority rules create conflict",
        wrong: `"A blackout happens."`,
        right: `"Rolling blackout: Corp Tower stays lit. Hospital gets 30 minutes per hour.
The slums get none. Generators require ration cards. A black-market broker sells cards,
but the security chief tracks serial numbers."`,
      },
    ],
  }),
);
