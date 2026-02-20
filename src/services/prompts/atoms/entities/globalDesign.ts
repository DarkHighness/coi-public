/**
 * ============================================================================
 * Entity Design Atom: Global State Design Context
 * ============================================================================
 *
 * Global State 设计上下文 — 用于全局状态创建和运行时管理。
 * 定义创建 Global State 时的设计哲学和质量要求。
 *
 * The global state is the invisible hand — the weather that
 * does not care whether you packed a coat, the market that
 * does not care whether you can afford bread, the war that
 * does not care whether you wanted peace. It is the world's
 * indifference made operational.
 */

import type { Atom, SkillAtom, SkillOutput } from "../types";
import { defineAtom, defineSkillAtom } from "../../trace/runtime";

export const globalDesign: Atom<void> = defineAtom(
  {
    atomId: "atoms/entities/globalDesign#globalDesign",
    source: "atoms/entities/globalDesign.ts",
    exportName: "globalDesign",
  },
  () => `
<game_system_context>
**GLOBAL DESIGN FOR REALITY RENDERING ENGINE:**

Global state is the atmosphere of the world — the macro-conditions that no individual controls but everyone lives inside. It is the weather, the economy, the political temperature, the season, the plague's progress, the army's march. The protagonist does not get to vote on global state. They get to respond to it, adapt to it, or be crushed by it. This is the First Truth — Indifference — made structural.

<global_philosophy>
**THE INVISIBLE HAND — WORLD AS WEATHER:**

Global state embodies the core philosophical principle that the world does not revolve around the protagonist. Events have momentum. Systems have inertia. A war does not pause because the hero is in the middle of a personal crisis. A famine does not ease because someone is trying to solve a mystery.

**KEY PRINCIPLE**: Global state creates the CONDITIONS within which personal stories unfold. It is the river; the protagonist is the swimmer. The river does not care about the swimmer's destination.

**TYPES OF GLOBAL STATE:**

| Type | Examples | Change Speed | Player Influence |
|------|----------|-------------|------------------|
| **Invariant Anchors** | Calendar system, physics rules, cosmology, geography | Never changes | None |
| **Glacial Systems** | Political structures, cultural norms, technological level, religious institutions | Generational | Negligible (in one story) |
| **Seasonal Rhythms** | Weather patterns, economic cycles, festival calendars, harvest seasons | Predictable cycles | None (can prepare) |
| **Active Pressures** | Wars, plagues, famines, political crises, natural disasters | Event-driven | Marginal to moderate |
| **Reactive Currents** | Public mood, market prices, rumor ecosystems, faction tensions | Continuous shift | Indirect through actions |
</global_philosophy>

<global_visibility>
**VISIBILITY POLICY — WHO KNOWS WHAT:**

Not all global state is visible. The world keeps secrets at every scale:

**PUBLIC KNOWLEDGE** — What everyone knows (or thinks they know)
- The king is sick (but not HOW sick)
- The northern border is under pressure (but not that the army is already retreating)
- Prices are rising (but not that the merchant guild is deliberately hoarding)

**INSTITUTIONAL KNOWLEDGE** — What insiders know
- The real state of the treasury
- The actual strength of the army
- The secret alliances between factions

**HIDDEN SYSTEMIC STATE** — What no one fully grasps
- The plague's true origin and vector
- The ecological collapse that will cause next year's famine
- The approaching asteroid (or magical catastrophe, or divine intervention)

**DESIGN PRINCIPLE**: The gap between PUBLIC and HIDDEN global state is where intrigue lives. The protagonist may discover hidden global truths — and this discovery itself becomes a source of power, danger, or moral burden.
</global_visibility>

<global_scene_constraint>
**HOW GLOBAL STATE CONSTRAINS LOCAL SCENES:**

Global state is not background decoration — it is the invisible hand that shapes every scene:

**ECONOMIC PRESSURE:**
- Inflation changes what money can buy in EVERY transaction
- Trade disruption means certain goods are unavailable at ANY price
- Taxation affects every merchant, every innkeeper, every beggar

**POLITICAL PRESSURE:**
- Martial law restricts movement, assembly, speech
- Political suspicion makes strangers dangerous and privacy expensive
- Regime change reshuffles every NPC's loyalties and fears

**ENVIRONMENTAL PRESSURE:**
- Weather constrains travel, combat, shelter, and mood
- Season determines available food, daylight hours, road conditions
- Natural disasters override ALL other priorities

**SOCIAL PRESSURE:**
- Public fear makes crowds volatile, merchants stingy, guards aggressive
- Cultural events (festivals, mourning, religious observance) reshape daily life
- Rumors propagate through social networks and mutate as they travel

**EXAMPLES:**
✅ GOOD global constraint: "The siege has entered its third week. The market stalls are half-empty. What remains costs triple. The baker's bread is made with sawdust now — you can taste it, a gritty sweetness that pretends to be wheat. The guards at the gate look thinner than last week. Their eyes have that flat quality — the look of men calculating whether their duty is worth dying for."

❌ BAD global constraint: "There is a siege happening. Prices are higher."
(Tells without showing. No sensory reality, no downstream effects on the scene.)
</global_scene_constraint>

<global_update_cadence>
**UPDATE CADENCE — WHEN THE WORLD SHIFTS:**

| Trigger Type | Example | Propagation |
|-------------|---------|-------------|
| **Turn-tick** | Time passes, weather shifts, conditions advance | Automatic, every turn |
| **Event-driven** | Battle outcome, assassination, natural disaster | Immediate cascade |
| **Threshold** | Food supply hits zero, public mood reaches revolt | Triggered when accumulated pressure crosses line |
| **Scheduled** | Festival, election, tax collection, harvest | Predetermined calendar events |
| **Player-caused** | Protagonist action with macro-scale consequence | Delayed ripple (actions take time to propagate) |

**IMPORTANT**: Player-caused global changes should be DELAYED and INDIRECT. The protagonist assassinates a lord → immediate local chaos → regional power vacuum (days later) → faction realignment (weeks later) → new political equilibrium (months later). Instant global consequences feel artificial.
</global_update_cadence>

<schema_field_mapping>
**WHERE TO WRITE — Global State Schema Field Paths (worldSetting / worldInfo):**
| Design Concept | → Schema Field |
|---|---|
| Common knowledge about the world | \`worldSetting.visible.description\` |
| Known rules (magic, physics, society) | \`worldSetting.visible.rules\` |
| Secret rules unknown to most | \`worldSetting.hidden.hiddenRules\` |
| World-level hidden truths | \`worldSetting.hidden.secrets[]\` |
| Formative past events | \`worldSetting.history\` |
| Adventure title | \`worldInfo.title\` |
| Inciting incident | \`worldInfo.premise\` |
| Narrative scope | \`worldInfo.narrativeScale\` (epic/intimate/balanced) |
| Apparent goal | \`mainGoal.visible.description\` + \`mainGoal.visible.conditions\` |
| True goal (GM-only) | \`mainGoal.hidden.trueDescription\` + \`mainGoal.hidden.trueConditions\` |

**FALLBACK**: Update cadence rules, propagation priorities, threshold definitions, or calendar events → write to world \`notes.md\` (\`current/world/notes.md\`).
</schema_field_mapping>
</game_system_context>
`,
);

export const globalDesignDescription: Atom<void> = defineAtom(
  {
    atomId: "atoms/entities/globalDesign#globalDesignDescription",
    source: "atoms/entities/globalDesign.ts",
    exportName: "globalDesignDescription",
  },
  () => `
<game_system_context>
**GLOBAL DESIGN**: Global state is the world's indifference made structural.
- State types (invariant anchors, glacial systems, active pressures, reactive currents)
- Visibility policy (public knowledge vs institutional vs hidden)
- Scene constraint (economic, political, environmental pressure)
- Update cadence (turn-tick, event-driven, threshold, scheduled)
- Player influence is marginal — the river doesn't care about the swimmer
</game_system_context>
`,
);

export const globalDesignSkill: SkillAtom<void> = defineSkillAtom(
  {
    atomId: "atoms/entities/globalDesign#globalDesignSkill",
    source: "atoms/entities/globalDesign.ts",
    exportName: "globalDesignSkill",
  },
  (_input, trace): SkillOutput => ({
    main: trace.record(globalDesign),
    quickStart: `
1. Define invariant anchors (calendar, physics, cosmology — things that NEVER change)
2. Define active pressures (wars, plagues, crises — event-driven dynamics)
3. Set visibility policy: what is public? institutional? hidden?
4. Map scene constraints: how does EACH global pressure affect local scenes?
5. Define update cadence: what triggers changes and how fast do they propagate?
6. Wire downstream: locations, factions, NPCs, economy, travel all respond to global shifts
`.trim(),
    checklist: [
      "Invariant anchors explicitly listed (what never changes)?",
      "Active pressures defined with their own momentum?",
      "Visibility policy separates public/institutional/hidden knowledge?",
      "Global state shown in scenes through sensory detail (not just stated)?",
      "Update cadence defined (turn-tick, event-driven, threshold)?",
      "Player-caused changes are delayed and indirect (not instant)?",
      "Every global pressure has concrete downstream effects on local scenes?",
      "Social/economic/environmental pressures all represented?",
    ],
    examples: [
      {
        scenario: "Global Constraint in Scene",
        wrong: `"There is a siege happening. Prices are higher."
(Tells. No sensory reality, no downstream effects.)`,
        right: `"The siege has entered its third week. The market stalls are
half-empty. What remains costs triple. The baker's bread is made
with sawdust now — you can taste it. The guards at the gate
look thinner. Their eyes have that flat quality — the look of
men calculating whether their duty is worth dying for."
(Siege shown through bread, guards' eyes, empty stalls.)`,
      },
      {
        scenario: "Global Change Propagation",
        wrong: `"The lord is assassinated. Everything changes immediately."
(Instant, unrealistic.)`,
        right: `"Day 1: Chaos in the castle. Guards seal the gates.
Day 3: Rumors reach the outer districts. Merchants begin hoarding.
Week 2: The neighboring duchy masses troops 'for border security.'
Month 1: Three claimants. The city splits into armed camps.
The protagonist's favorite tavern has chosen a side.
So must they."
(Delayed cascade. Each stage feels inevitable in retrospect.)`,
      },
    ],
  }),
);

export const globalLogic: Atom<void> = defineAtom(
  {
    atomId: "atoms/entities/globalDesign#globalLogic",
    source: "atoms/entities/globalDesign.ts",
    exportName: "globalLogic",
  },
  () => `
<game_system_context>
**GLOBAL LOGIC**: Global state updates are event-driven and consistency-checked.

**DETERMINISTIC ADVANCEMENT:**
- Time, weather, and atmospheric state advance deterministically from turn cadence and calendar
- Seasonal shifts follow the calendar; weather follows seasonal probability
- Economic cycles respond to supply/demand fundamentals, not narrative convenience

**MACRO-EVENT RESOLUTION:**
- Concurrent macro events resolve with precedence and conflict rules
- War + plague compound (soldiers spread disease; disease weakens armies)
- Political crisis + economic pressure compound (hungry people are restless people)
- Events that SHOULD compound MUST compound — the world does not grant respite because the protagonist needs one

**DOWNSTREAM PROPAGATION:**
- Global updates emit downstream synchronization tasks for ALL dependent entities
- Location: availability, safety, population changes
- Faction: resource pressure, strategic posture, alliance shifts
- NPC: mood, priorities, available options, survival calculus
- Economy: prices, availability, trade route status
- Travel: road conditions, border status, bandit activity

**CONSISTENCY CHECKS:**
- Reject impossible global transitions without bridge events (peace does not erupt overnight; famine does not end without harvest)
- Ensure propagation latency is realistic (news travels at the speed of horses, not telepathy)
- Verify that global state changes maintain internal world logic (if the river flooded, the bridge is gone; if the bridge is gone, trade routes shift)
</game_system_context>
`,
);

export const globalLogicDescription: Atom<void> = defineAtom(
  {
    atomId: "atoms/entities/globalDesign#globalLogicDescription",
    source: "atoms/entities/globalDesign.ts",
    exportName: "globalLogicDescription",
  },
  () => `
<game_system_context>
**GLOBAL LOGIC**: Deterministic macro updates, dependency-safe.
- Time/weather advance by calendar and probability
- Propagate to locations, factions, NPCs, economy
- Reject impossible transitions
</game_system_context>
`,
);

export const globalLogicSkill: SkillAtom<void> = defineSkillAtom(
  {
    atomId: "atoms/entities/globalDesign#globalLogicSkill",
    source: "atoms/entities/globalDesign.ts",
    exportName: "globalLogicSkill",
  },
  (_input, trace): SkillOutput => ({
    main: trace.record(globalLogic),
    quickStart: `
1. Advance global clock, weather, and atmospheric state from calendar/cadence
2. Resolve concurrent macro-events with compounding rules
3. Propagate downstream: locations, factions, NPCs, economy, travel
4. Validate transition consistency (no impossible jumps without bridge events)
5. Ensure propagation latency is realistic (news travels at horse speed)
6. Update scene constraints for the new global state
`.trim(),
    checklist: [
      "Global clock/atmosphere advanced consistently from calendar?",
      "Concurrent events compound realistically (war + plague)?",
      "All downstream entities receive propagation updates?",
      "Transition consistency checked (no impossible jumps)?",
      "Propagation latency is realistic (not telepathic)?",
      "Economic effects computed from supply/demand fundamentals?",
      "Scene constraints updated for new global conditions?",
      "Player-caused changes delayed appropriately?",
    ],
  }),
);

export default globalDesign;
