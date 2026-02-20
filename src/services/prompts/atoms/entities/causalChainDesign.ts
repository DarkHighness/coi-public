/**
 * ============================================================================
 * Entity Design Atom: Causal Chain Design Context
 * ============================================================================
 *
 * Causal Chain 设计上下文 — 用于因果链创建和运行时因果管理。
 * 定义创建 Causal Chain 时的设计哲学和质量要求。
 *
 * A causal chain is the world's memory of why things are the way they are.
 * Every locked door was locked by someone, for a reason.
 * Every scar on the city wall was left by a weapon, wielded by a hand,
 * driven by a motive. The chain stretches back
 * until it disappears into the fog of history — but it never breaks.
 */

import type { Atom, SkillAtom, SkillOutput } from "../types";
import { defineAtom, defineSkillAtom } from "../../trace/runtime";

export const causalChainDesign: Atom<void> = defineAtom(
  {
    atomId: "atoms/entities/causalChainDesign#causalChainDesign",
    source: "atoms/entities/causalChainDesign.ts",
    exportName: "causalChainDesign",
  },
  () => `
<game_system_context>
**CAUSAL CHAIN DESIGN FOR REALITY RENDERING ENGINE:**

Causal chains are the connective tissue of reality. They encode WHY the world changed — not just what happened, but the sequence of motives, pressures, and accidents that made it inevitable in retrospect. Every consequence has an ancestor. Every mystery has a causal chain waiting to be traced. The detective, the historian, and the prophet all do the same work: they read the chain. The difference is which direction they're reading.

<causal_philosophy>
**THE BUTTERFLY AND THE BOULDER — TWO KINDS OF CAUSATION:**

**BUTTERFLY CAUSATION** — Small cause, large effect (through amplification)
- A servant overhears a whispered name → tells his lover → the lover is a spy → the name reaches the enemy → an army changes its route → a city falls
- The chain is LONG, each link is FRAGILE, and the outcome was IMPROBABLE but not impossible
- This creates mystery and discovery: tracing the chain backward reveals surprises

**BOULDER CAUSATION** — Large cause, inevitable effect (through momentum)
- A drought enters its third year → wells dry → farmers migrate → cities overflow → plague → political collapse
- The chain is SHORT, each link is ROBUST, and the outcome was PROBABLE all along
- This creates dramatic irony: everyone can see the boulder rolling, no one can stop it

**KEY PRINCIPLE**: The best stories use BOTH. The boulder creates the conditions; the butterfly determines which way it falls. The drought was inevitable. Which city falls first? That depends on which servant overheard which name.
</causal_philosophy>

<causal_anatomy>
**ANATOMY OF A CAUSAL CHAIN:**

**1. ROOT CAUSE** — The origin event
- Actor: WHO initiated it (or what natural force)
- Motive: WHY (desire, fear, obligation, accident, ignorance)
- Constraint: What limited their options to THIS action
- Trigger: What specific event broke the inertia

**2. INTERMEDIATE LINKS** — The transmission path
- Each link must have OBSERVABLE EVIDENCE (physical, testimonial, documentary, circumstantial)
- Each link transforms the signal: amplifies, dampens, redirects, or distorts
- Some links are VISIBLE to the protagonist; others are HIDDEN
- The gap between visible and hidden links is where investigation and discovery live

**3. BRANCH POINTS** — Where the chain could have gone differently
- Every branch point is a DECISION someone made, or a COINCIDENCE that went one way instead of another
- Branch points are retrospectively significant: "If only the guard had turned left instead of right..."
- Unrealized branches create ALTERNATIVE HISTORY that NPCs may believe or speculate about

**4. DELAYED EFFECTS** — Consequences waiting to detonate
- Some links activate immediately; others lie dormant until conditions are met
- The poison that takes three days to kill
- The debt that comes due next harvest
- The secret that survives as long as the keeper lives
- Delayed effects create DRAMATIC TENSION: the audience knows the clock is ticking

**5. CLOSURE & RESIDUE** — How chains end (or don't)
- **Full closure**: cause addressed, consequences resolved, chain terminates
- **Partial closure**: immediate crisis resolved, but root cause remains (the wound is bandaged but the disease persists)
- **Residue**: the chain is "closed" but leaves permanent marks — scars, grudges, altered relationships, changed geography
- **Open thread**: the chain continues beyond the current story, creating sequel hooks or world-building depth
</causal_anatomy>

<causal_evidence>
**EVIDENCE TYPES — HOW CHAINS ARE DISCOVERED:**

| Evidence Type | Example | Reliability |
|---------------|---------|-------------|
| **Physical** | Blood trail, weapon markings, broken lock | High (hard to fake, hard to destroy) |
| **Testimonial** | Witness accounts, confessions, rumors | Medium (memories distort, lies happen) |
| **Documentary** | Letters, ledgers, contracts, maps | High (but can be forged or incomplete) |
| **Circumstantial** | Motive + opportunity + absence of alibi | Low alone, powerful in combination |
| **Negative** | The dog that DIDN'T bark, the letter that WASN'T sent | High insight value, easy to overlook |

**EVIDENCE DESIGN PRINCIPLES:**
- Every link in the chain should leave at least ONE form of evidence
- The protagonist should be able to discover the chain through investigation, but NOT all at once
- Red herrings are FALSE chains that share some evidence with the true chain
- The most satisfying discoveries come from connecting evidence across MULTIPLE seemingly unrelated chains
</causal_evidence>

<causal_examples>
**DO / DON'T EXAMPLES:**

✅ GOOD causal chain:
"Root: The old duke poisoned his brother to inherit (motive: ambition + fear of disinheritance). Link 1: He used a rare herb from the southern islands (evidence: the duchy's import records show an unusual purchase). Link 2: The herbalist who prepared it was killed to silence her (evidence: the herbalist's apprentice remembers a well-dressed visitor; the body was found in the river). Link 3: The brother's death was ruled natural (evidence: the physician was bribed — he now lives beyond his means). Branch: If the apprentice is found and questioned, the chain can be traced. Delayed effect: The herb leaves traces in the victim's bones — if the body is exhumed, the poisoning can be proven. Residue: The duke's own son suspects but cannot prove it. The suspicion has poisoned (literally) their relationship."

❌ BAD causal chain:
"The duke killed his brother to become duke. No one knows."
(No links, no evidence, no branch points, no delayed effects. A fact, not a chain.)

✅ GOOD branch point:
"The guard was supposed to patrol the east corridor that night. But his daughter was sick, and he traded shifts with a younger man who always cut through the garden instead. The assassin had planned for the east corridor. They met in the garden instead. The assassin killed the guard — a death that was never supposed to happen, a witness that was never supposed to exist, a body that would be found at dawn and change everything."

❌ BAD branch point:
"The guard happened to be somewhere else."
(No agency, no consequence, no texture.)
</causal_examples>

<schema_field_mapping>
**WHERE TO WRITE — Causal Chain Schema Field Paths:**
| Design Concept | → Schema Field |
|---|---|
| Chain identifier | \`chainId\` (format: chain:N) |
| Originating event | \`rootCause.eventId\` + \`rootCause.description\` |
| Events in the chain | \`events[]\` (array of TimelineEvent) |
| Chain status | \`status\` (active / resolved / interrupted) |
| Future consequences | \`pendingConsequences[]\`: |
|   — What happens if triggered | \`pendingConsequences[].description\` |
|   — Narrative trigger condition | \`pendingConsequences[].triggerCondition\` |
|   — Urgency | \`pendingConsequences[].severity\` (imminent/delayed/background) |
|   — Already fired? | \`pendingConsequences[].triggered\` |
| Visibility scope | \`knownBy[]\` |
| Link events to this chain | \`timelineEvent.chainId\` → \`causalChain.chainId\` |

**FALLBACK**: Branch logic, delayed-effect schedules, evidence tracking, or cross-chain dependencies → write to world \`notes.md\` (\`current/world/notes.md\`).
</schema_field_mapping>
</game_system_context>
`,
);

export const causalChainDesignDescription: Atom<void> = defineAtom(
  {
    atomId: "atoms/entities/causalChainDesign#causalChainDesignDescription",
    source: "atoms/entities/causalChainDesign.ts",
    exportName: "causalChainDesignDescription",
  },
  () => `
<game_system_context>
**CAUSAL CHAIN DESIGN**: Causal chains are the connective tissue of reality.
- Causation types: butterfly (small→large) and boulder (large→inevitable)
- Anatomy (root cause, branch points, delayed effects, closure/residue)
- Evidence types (physical, testimonial, documentary, circumstantial)
- Gaps between visible/hidden links create mystery
- Branch points are decisions that retrospectively changed everything
</game_system_context>
`,
);

export const causalChainDesignSkill: SkillAtom<void> = defineSkillAtom(
  {
    atomId: "atoms/entities/causalChainDesign#causalChainDesignSkill",
    source: "atoms/entities/causalChainDesign.ts",
    exportName: "causalChainDesignSkill",
  },
  (_input, trace): SkillOutput => ({
    main: trace.record(causalChainDesign),
    quickStart: `
1. Define root cause: actor + motive + constraint + trigger
2. Build intermediate links with evidence at each step (physical/testimonial/documentary)
3. Identify branch points: where could the chain have gone differently?
4. Design delayed effects: what consequences are still ticking?
5. Define closure type: full, partial, residue, or open thread
6. Wire discovery path: how can the protagonist trace the chain?
`.trim(),
    checklist: [
      "Root cause includes actor motive AND constraint?",
      "Each intermediate link has observable evidence?",
      "Branch points have agency or meaningful coincidence?",
      "Delayed effects have activation conditions defined?",
      "Closure/residue defined (not just 'resolved')?",
      "Hidden links create discoverable mystery?",
      "Red herrings share evidence with true chain (not random)?",
      "Evidence types varied (not all testimonial, not all physical)?",
    ],
    examples: [
      {
        scenario: "Causal Chain",
        wrong: `"The duke killed his brother to become duke. No one knows."
(A fact, not a chain. No links, no evidence, no discovery path.)`,
        right: `"Root: Duke poisoned his brother (motive: ambition + fear).
Link 1: Rare herb from southern islands (evidence: import records).
Link 2: Herbalist killed to silence (evidence: apprentice's memory).
Link 3: Death ruled natural (evidence: bribed physician lives beyond means).
Branch: If apprentice found, chain traceable.
Delayed: Herb traces in bones — exhumation proves poisoning.
Residue: Duke's son suspects. The suspicion poisons their relationship."
(Every link has evidence. Branch creates quest. Delayed effect creates clock.)`,
      },
      {
        scenario: "Branch Point",
        wrong: `"The guard happened to be somewhere else."
(No agency, no consequence.)`,
        right: `"The guard traded shifts because his daughter was sick.
The replacement always cut through the garden. The assassin
had planned for the east corridor. They met in the garden.
A death that was never supposed to happen, a body found at dawn."
(Human decision → coincidence → cascade. Each detail matters.)`,
      },
    ],
  }),
);

export const causalChainLogic: Atom<void> = defineAtom(
  {
    atomId: "atoms/entities/causalChainDesign#causalChainLogic",
    source: "atoms/entities/causalChainDesign.ts",
    exportName: "causalChainLogic",
  },
  () => `
<game_system_context>
**CAUSAL CHAIN LOGIC**: Chain evolution must remain dependency-safe.

**EVIDENCE INTEGRATION:**
- New evidence can confirm, weaken, or redirect existing links
- Confirmation strengthens confidence and may unlock new investigation paths
- Contradiction requires re-evaluation: was the evidence wrong, or is the chain model wrong?
- Multiple competing hypotheses can coexist with confidence weights until decisive evidence resolves them

**CHAIN DYNAMICS:**
- Active chains advance autonomously: delayed effects tick toward activation, dormant links await triggers
- Player investigation can accelerate or redirect chain resolution
- NPC actions along the chain continue whether the player is watching or not (the world does not pause)
- Chains can merge when two seemingly unrelated causal threads share a common ancestor

**CASCADE RECONCILIATION:**
- When a link is invalidated, ALL descendants must be reconciled
- Some descendants may survive with modified justification; others collapse
- The collapse of a causal chain can itself be a dramatic event (the entire conspiracy theory was wrong; the truth is simpler and more terrible)

**PROPAGATION:**
- Chain updates propagate to: timeline events, quest state, knowledge confidence, NPC beliefs, and faction strategies
- A confirmed chain changes what NPCs BELIEVE and therefore how they ACT
- An exposed chain changes what is PUBLIC KNOWLEDGE and therefore the political landscape
</game_system_context>
`,
);

export const causalChainLogicDescription: Atom<void> = defineAtom(
  {
    atomId: "atoms/entities/causalChainDesign#causalChainLogicDescription",
    source: "atoms/entities/causalChainDesign.ts",
    exportName: "causalChainLogicDescription",
  },
  () => `
<game_system_context>
**CAUSAL CHAIN LOGIC**: Confirm, redirect, or reconcile with evidence.
- New evidence updates confidence, may unlock paths
- Competing hypotheses coexist until resolved
- Updates propagate to timeline, quests, knowledge
</game_system_context>
`,
);

export const causalChainLogicSkill: SkillAtom<void> = defineSkillAtom(
  {
    atomId: "atoms/entities/causalChainDesign#causalChainLogicSkill",
    source: "atoms/entities/causalChainDesign.ts",
    exportName: "causalChainLogicSkill",
  },
  (_input, trace): SkillOutput => ({
    main: trace.record(causalChainLogic),
    quickStart: `
1. Integrate new evidence: confirm, weaken, or redirect affected links
2. Update confidence weights across competing hypotheses
3. Advance delayed effects and check activation conditions
4. Reconcile invalidated links and cascade to descendants
5. Propagate chain state to timeline, quests, knowledge, NPC beliefs
6. Check for chain merges (unrelated threads sharing common ancestors)
`.trim(),
    checklist: [
      "Evidence update applied to relevant links with correct confidence?",
      "Competing hypotheses maintained (not prematurely resolved)?",
      "Delayed effects ticked and activation conditions checked?",
      "Invalidated links reconciled with downstream cascade?",
      "Timeline/quest/knowledge updates propagated?",
      "NPC beliefs updated from chain state changes?",
      "Autonomous chain advancement continues without player attention?",
      "Chain merges detected when threads share ancestors?",
    ],
  }),
);

export default causalChainDesign;
