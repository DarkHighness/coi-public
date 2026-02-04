import type { GlobalSkillSeed } from "./types";

const pack = (skillId: string, files: Record<string, string>): GlobalSkillSeed[] => {
  const seeds: GlobalSkillSeed[] = [];
  for (const [name, content] of Object.entries(files)) {
    seeds.push({
      path: `skills/${skillId}/${name}`,
      contentType: "text/plain",
      content,
    });
  }
  return seeds;
};

const GM_CAUSE_EFFECT_PACK = pack("gm-cause-effect", {
  "SKILL.md": `---
name: gm-cause-effect
description: Enforce strict cause → effect; no free miracles; leave residue and reactions.
---

# Cause → Effect Consistency (Residue + Reaction)

This skill is a fairness engine:
- actions have costs
- outcomes have mechanisms
- consequences leave residue the world can react to

## When to use
- Outcomes feel convenient (“miracle clue”, “sudden rescue”).
- Failures are soft (nothing changes) or arbitrary (doom with no mechanism).
- NPC behavior flips without leverage shifts.

## Quick start (CCR in one beat)
For the next significant outcome, decide internally:
1) Cause: what action/pressure produced it?
2) Cost: what was spent (time, exposure, injury, debt)?
3) Residue: what remains (witness, record, damage, rumor)?

Then show residue in the narrative.

## Level 1: Mechanisms before declarations
Avoid: “It works.” / “It fails.”
Prefer: show the physical/social mechanism that makes it work or fail.

## Level 2: Residue is the continuity hook
Residue types:
- physical: damage, tracks, missing items
- social: witnesses, rumors, grudges
- institutional: logs, ledgers, jurisdiction flags

Rule: important actions create at least one residue.

## Level 3: Reaction scheduling (next 1–3 turns)
After residue, decide who reacts:
- immediate (this scene): attention shifts, interruption
- near (1–3 turns): patrol changes, prices rise, debt comes due
- long (arc): faction moves, reputation shifts

Every residue should trigger at least one horizon.

## Level 4: No free information
Information must cost:
- time, exposure, social risk, debt

If the player gains valuable detail, something else worsens.

Next: CHECKLIST.md and TEMPLATES.md.`,

  "CHECKLIST.md": `# Cause → Effect Checklist (CCR)

- [ ] Cause: outcome ties to an observable mechanism
- [ ] Cost: time / exposure / injury / debt is paid (at least one)
- [ ] Residue: witness / record / damage / rumor remains
- [ ] Reaction: at least one actor/system reacts within 1–3 turns
- [ ] No free information (valuable detail has a price)`,

  "TEMPLATES.md": `# Cause → Effect Templates

## Template A: Outcome statement (internal)
- Cause: [PLAYER METHOD] interacts with [CONSTRAINT]
- Cost: [COST CHANNEL] increases (time/exposure/injury/debt)
- Residue: [RESIDUE] is left behind
- Reaction: [ACTOR/SYSTEM] responds in [HORIZON]

## Template B: Residue menu (pick one)
- physical: scuff marks / broken latch / spilled liquid / warm wax / fresh ash
- social: a look held too long / someone repeats a detail later / a whisper spreads
- institutional: a stamped note / a ledger entry / a log flag / a changed patrol

## Template C: “No free information” pricing
To learn [INFO], the player must pay:
- time: wait / travel / miss an opportunity
- exposure: ask publicly / leave traces / reveal interest
- debt: accept help / owe a favor
- moral: harm someone / lie on record`,

  "EXAMPLES.md": `# Cause → Effect Examples

## Example: Success with residue
> The lock gives—not cleanly. Metal squeals, too sharp to be ignored. The door opens, but the latch is bent now, and anyone who looks will know it wasn’t a key. Somewhere down the hall, a pause. Footsteps adjust their rhythm.

## Example: Failure that creates a new playable constraint
> The match head scrapes, sparks, dies. Damp air. You can keep trying, but every scrape is a signal. Either find shelter to strike again, or move in the dark and accept what you can’t see.`,
});

const GM_ANTI_VAGUE_LANGUAGE_PACK = pack("gm-anti-vague-language", {
  "SKILL.md": `---
name: gm-anti-vague-language
description: Replace vague mood words with observable evidence + actionable constraints.
---

# Anti‑Vague Language (Evidence + Constraint)

Goal: reduce ambiguity and increase actionability.

## When to use
- You see words like: eerie, tense, ominous, strange, wrong, dangerous.
- The player cannot tell what is risky or what to do about it.

## Quick start (one replacement)
If you wrote a mood word, replace it with:
1) evidence (observable)
2) constraint (what it limits)
3) risk (what it might cost)

## Level 1: Evidence substitution (menus)
Timing:
- answers too fast / too slow
Gaze:
- watches exits / avoids hands / won’t meet eyes
Sound:
- a step stops outside the door
Material:
- a wet print where nobody walked

## Level 2: Constraint statements
Add one sentence that makes it actionable:
- “This means you cannot rely on X.”
- “If you do Y, you will likely pay Z.”

## Level 3: Verifiable hooks
If you imply a secret, leave a hook that can be tested within 2–5 turns:
- ledger mismatch, contradictory alibi, code phrase, missing object

Next: CHECKLIST.md for fast scanning.`,

  "CHECKLIST.md": `# Anti‑Vague Checklist

- [ ] No mood word without evidence
- [ ] Evidence is observable (sound/gaze/timing/material)
- [ ] One constraint sentence (what it limits)
- [ ] One risk sentence (what it might cost)
- [ ] If implying a secret: leave a verifiable hook`,

  "TEMPLATES.md": `# Anti‑Vague Templates

## Template A: Wrongness
Evidence:
> [EVIDENCE 1]. [EVIDENCE 2].
Constraint:
> That means you can’t rely on [ASSUMPTION].
Risk:
> If you [ACTION], you risk [COST/CONSEQUENCE].

## Template B: Danger
Evidence:
> [SOUND/SHADOW/PAUSE] suggests [MECHANISM].
Constraint:
> Moving openly will [LIMITATION].
Risk:
> The next cost is [EXPOSURE/INJURY/DEBT].`,

  "EXAMPLES.md": `# Anti‑Vague Examples

Bad:
> The corridor feels dangerous.

Better:
> The corridor is too quiet. Not peaceful—processed. Your own steps sound wrong, like they’re being swallowed. Halfway down, a door that should be ajar is shut, and the latch has fresh scratches. If you go on, you’ll do it with no easy exit.`,
});

const GM_CHOICE_DESIGN_PACK = pack("gm-choice-design", {
  "SKILL.md": `---
name: gm-choice-design
description: Present choices as tradeoffs with costs, signals, and distinct futures.
---

# Choice Design (Tradeoffs, Not Buttons)

Good choices feel *different* before the player clicks.
They should change:
- method (how you try)
- cost (what you risk/spend)
- signal (what you learn)
- future constraints (what becomes easier/harder next)

## When to use
- Choices feel cosmetic (“yes/no/ask again”).
- Options are reskins with identical consequences.
- The story stalls because choices don’t move state.

## Quick start (3-option baseline)
Offer three options aligned to the same pressure:
1) fast / risky (time saved, exposure increased)
2) slow / safe (time cost, lower exposure)
3) leverage / dirty (social or moral cost, strong advantage)

## Level 1: The 3 ingredients (method / cost / signal)
Every option should include:
1) method: what you do differently
2) cost: what you risk/spend
3) signal: what you’ll learn if you try

If an option has no cost and no signal, it’s usually “free” and boring.

## Level 2: Distinct futures (avoid reskins)
Options should lead to different next-scene constraints:
- social: who trusts you / who hates you
- positional: where you are / who sees you
- resource: time, money, injury, exposure

## Level 3: Information asymmetry as an axis
Offer a “learn more” route, but make it costly:
- time loss
- social suspicion
- resource spend

## Level 4: Commitment language (make stakes legible)
Use clean structures:
- “If you do X, you risk Y.”
- “If you do X, you’ll learn Z.”

Next: CHECKLIST.md and TEMPLATES.md.`,

  "CHECKLIST.md": `# Choice Design Checklist

- [ ] All options address the same pressure (time/exposure/scarcity/law/pain)
- [ ] Each option states method + cost + signal
- [ ] At least two options lead to distinct future constraints
- [ ] No “free” option that dominates (best outcome, no cost)
- [ ] At least one option shifts leverage (debt, alliance, evidence, access)`,

  "TEMPLATES.md": `# Choice Design Templates

## Template A: Time pressure (fast / safe / leverage)
1) Fast (risk exposure):
> Move now through [RISKY ROUTE]. You’ll save time, but you risk [EXPOSURE/COST].

2) Safe (pay time):
> Take the longer route via [SAFER METHOD]. It costs time, but reduces [RISK].

3) Leverage (pay social/moral cost):
> Force an advantage by [DIRTY/LEVERAGE MOVE]. It may work, but you’ll owe/pay [DEBT/REPUTATION COST].

## Template B: Uncertainty pressure (act / verify / misdirect)
1) Act:
> Commit to [ACTION] now; if you’re wrong, you’ll pay [COST].

2) Verify:
> Spend time to test [ASSUMPTION] by [METHOD]; you’ll learn [SIGNAL] but advance the clock.

3) Misdirect:
> Create a diversion using [RESOURCE]; it risks [RESIDUE] but may buy you room.`,

  "EXAMPLES.md": `# Choice Design Examples

## Example: Someone is listening at the door
1) Fast:
> Throw the door open and confront them now. You gain initiative, but you risk public exposure.

2) Safe:
> Stay silent and move away from the door, forcing them to act first. You lose time, but reduce the chance of saying something they can use.

3) Leverage:
> Stage a harmless lie (mention a fake name) to see if it changes their behavior. You might learn who’s listening—but you also create residue if the lie spreads.`,
});

const GM_CLOCKS_AND_PRESSURE_PACK = pack("gm-clocks-and-pressure", {
  "SKILL.md": `---
name: gm-clocks-and-pressure
description: Use clocks and escalation ladders to keep turns moving without railroading.
---

# Clocks and Pressure (Escalation Ladders)

Pressure should be fair, legible, and mechanical.
This skill helps you replace “GM mood escalation” with observable state changes.

## When to use
- The story stalls (waiting is always optimal).
- Threats feel arbitrary (“suddenly guards!”).
- You want long tension without constant combat.

## Quick start (one clock)
Pick one clock and define:
1) trigger: what advances it (time/noise/exposure/failures)
2) steps: what changes at 25/50/75%
3) deadline: what happens at 100%

Then, show evidence of the current step in the narrative.

## Level 1: Clocks are consequences of actions
If a clock advances, it must be because:
- time passed
- noise happened
- exposure occurred
- a failure created residue

## Level 2: Escalation ladders (environment changes)
Write concrete changes:
- more eyes, watched doors, altered patrol routes
- prices rise, allies go quiet, records updated
- safe routes close, evidence seized

## Level 3: Make pressure legible
Players should sense pressure via evidence:
- footsteps, closing signs, unanswered messages, ledger checks

## Level 4: Give players pressure-controls
Provide at least one way to reduce/redirect pressure:
- bribe, misdirect, leave, create alibi, shift jurisdictions

Next: CHECKLIST.md and TEMPLATES.md.`,

  "CHECKLIST.md": `# Clocks and Pressure Checklist

- [ ] Clock trigger is tied to an observable action (time/noise/exposure/failure)
- [ ] Each step changes the environment (not just “they’re angrier”)
- [ ] The narrative shows evidence of the current step
- [ ] Players have at least one pressure-control (bribe/misdirect/leave)
- [ ] Deadline outcome is concrete and not instant-death unless earned`,

  "TEMPLATES.md": `# Clocks and Pressure Templates

## Template A: Surveillance clock
Trigger: public exposure / asking too many questions
25%: more eyes, one NPC goes quiet
50%: patrol route shifts, one door watched
75%: direct tail, records flagged
100%: confrontation / arrest / raid

Evidence snippets:
- “The same face twice.”
- “A ledger page turned the moment you ask.”
- “A door that was open is now locked.”

## Template B: Time clock (closing hours)
Trigger: minutes passing
25%: warning sign, staff rush
50%: doors barred, prices spike
75%: last call, guards arrive
100%: forced exit / curfew enforcement

## Template C: Noise clock (stealth)
Trigger: loud actions
25%: a pause outside
50%: footsteps approach
75%: someone tries the latch
100%: entry / alarm`,

  "EXAMPLES.md": `# Clocks and Pressure Examples

## Example: “Asking questions” advances a surveillance clock
> The clerk answers, but his eyes flick down—quick, practiced—to the ledger beside him. When you ask the same name a second time, he doesn’t correct you. He writes it down. Not the name you said. The one you meant.`,
});

const GM_NPC_AGENCY_PACK = pack("gm-npc-agency", {
  "SKILL.md": `---
name: gm-npc-agency
description: Run NPCs as agents with goals, constraints, and tactics (not props).
---

# NPC Agency (Goals, Constraints, Tactics)

Agency means NPCs act in ways that are:
- motivated
- constrained
- opportunistic
- costly (their actions leave residue too)

## When to use
- NPCs only react to the protagonist and then freeze.
- The world feels like it waits for the player.
- Antagonists feel incompetent or omniscient.

## Quick start (NPC card + one move)
For the key NPC in this scene, write an internal card:
- goal / fear / leverage / constraint / method

Then choose ONE between-turn move that creates residue.

## Level 1: The NPC card (minimum model)
- goal (short-term, concrete)
- fear (what they avoid)
- leverage (what they can trade/threaten)
- constraint (what they cannot risk)
- method (their default tactic)

## Level 2: NPC moves (between turns)
Pick one:
- gather info (ask, eavesdrop, check logs)
- shift resources (pay, recruit, hide evidence)
- test the protagonist (small trap, rumor, “favor”)
- pre-commit (lock door, call guard, move witness)

Rule: a move must create residue (trace, witness, record, rumor).

## Level 3: Deception without omniscience
If an NPC acts on information, decide how they got it:
- witness / rumor / record / deduction from residue

## Level 4: Fair antagonism (pay for effectiveness)
Effective NPC actions should create:
- extra attention, witnesses, logs, escalation

Next: CHECKLIST.md and TEMPLATES.md.`,

  "CHECKLIST.md": `# NPC Agency Checklist

- [ ] NPC card exists (goal/fear/leverage/constraint/method)
- [ ] NPC takes a between-turn move when time passes
- [ ] The move creates residue (trace/witness/record/rumor)
- [ ] NPC does not know everything (info source is defined)
- [ ] Effective moves have costs (attention/escalation/logs)`,

  "TEMPLATES.md": `# NPC Agency Templates

## Template A: NPC card
- Goal:
- Fear:
- Leverage:
- Constraint:
- Method:
- Likely move if you do nothing for 1 hour:

## Template B: Between-turn move
> While you [WAIT/TRAVEL], [NPC] [MOVE]. It leaves [RESIDUE], which means [FUTURE PRESSURE].

## Template C: Info source (avoid omniscience)
> [NPC] acts because they learned [INFO] via [WITNESS/RUMOR/RECORD/DEDUCTION].`,

  "EXAMPLES.md": `# NPC Agency Examples

## Example: A fair antagonistic move
> The antagonist doesn’t teleport in. He buys information. By morning, the innkeeper’s nephew knows your name, and the ledger has a new line item. That’s the move. The residue is social and institutional—and it’s discoverable if you look.`,
});

const GM_FAILURE_AND_COMPLICATIONS_PACK = pack("gm-failure-and-complications", {
  "SKILL.md": `---
name: gm-failure-and-complications
description: Make failure matter: costs, complications, and partial successes without railroading.
---

# Failure and Complications (Costs That Bite)

Failure is not punishment. Failure is reality:
- attempts have costs
- mistakes create constraints
- success is not always clean

## When to use
- Failures feel soft (nothing changes).
- Failures feel arbitrary (doom with no mechanism).
- The story “fails forward” in the same pattern every time.

## Quick start (pick a failure type)
If an attempt fails, pick ONE primary cost:
- misread (wrong conclusion)
- delay (clock advances)
- exposure (someone notices)
- damage (gear breaks / injury)
- debt (help with strings)

Then add ONE playable decision point that follows from the cost.

## Level 1: “Yes, but” / “No, and”
- yes, but: succeed and pay a cost
- no, and: fail and the situation worsens

## Level 2: Complications must be playable
A complication must create a new choice:
- obstacle with multiple methods
- social constraint (witness/suspicion)
- resource problem (low on X)

Avoid pure suffering with no agency.

## Level 3: Rotate cost channels
If every failure is damage, the world becomes a spreadsheet.
Rotate:
- time, exposure, resources, relationships, reputation

Next: CHECKLIST.md.`,

  "CHECKLIST.md": `# Failure and Complications Checklist

- [ ] Failure has a mechanism (not random)
- [ ] One primary cost channel chosen (time/exposure/damage/debt/misread)
- [ ] Residue exists (trace/witness/record/damage)
- [ ] Complication creates a new choice (agency preserved)
- [ ] Cost channels rotate across the last few failures`,

  "TEMPLATES.md": `# Failure and Complications Templates

## Template A: No, and…
> It doesn’t work because [MECHANISM]. You pay [COST], and now [NEW CONSTRAINT]. Your options are [OPTION A] or [OPTION B].

## Template B: Yes, but…
> It works—barely. You succeed, but you pay [COST], leaving [RESIDUE]. That means [FOLLOW-UP PRESSURE].`,

  "EXAMPLES.md": `# Failure and Complications Examples

## Example: Failure creates exposure + choice
> The lock doesn’t turn. Not stuck—wrong key. Your second try scrapes metal loud enough to matter. Footsteps pause outside. You can back off into the dark and wait, or commit to forcing it and accept what noise will buy you.`,
});

const GM_INVESTIGATION_STRUCTURE_PACK = pack("gm-investigation-structure", {
  "SKILL.md": `---
name: gm-investigation-structure
description: Build investigation arcs with redundant clues, contradictions, and fair inference.
---

# Investigation Structure (Clue Webs, Not Single Keys)

Investigations fail when they rely on one clue.
This skill builds solvable mysteries:
- multiple paths
- contradictions that invite tests
- fair inference from residue

## When to use
- Players get stuck because one clue was missed.
- Mysteries resolve via confession or narrator reveal.
- Clues feel arbitrary (not consequences).

## Quick start (3 placements)
For any essential conclusion, provide three distinct placements:
1) space/object residue
2) behavior/tell residue
3) dialogue/record residue

Each placement must imply at least one testable action.

## Level 1: Node thinking
Nodes:
- suspects, locations, objects, motives

Clues connect nodes. A clue that connects nothing is noise.

## Level 2: Contradiction engine
Contradictions create momentum:
- alibi timing conflicts
- “never” vs residue indicates “recently”
- object exists where it shouldn’t

## Level 3: Fair inference rule
If you expect inference X:
- show at least two supporting residues
- and one alternative explanation that can be ruled out

Next: CHECKLIST.md and TEMPLATES.md.`,

  "CHECKLIST.md": `# Investigation Structure Checklist

- [ ] Essential conclusions have 3 distinct placements
- [ ] Each clue connects at least two nodes (suspect/location/object/motive)
- [ ] Contradiction implies a testable action
- [ ] Inferences have 2+ supports and 1 ruled-out alternative
- [ ] Missing one clue does not hard-stop progress`,

  "TEMPLATES.md": `# Investigation Structure Templates

## Template A: Three placements for one fact
- Space: [RESIDUE]
- Behavior: [TELL]
- Records/dialogue: [PARTIAL TRUTH / LOG]

## Template B: Contradiction → test
Contradiction:
> [CLAIM] vs [RESIDUE]
Test:
> Verify by [ACTION] at [TIME/PLACE], paying [COST].`,

  "EXAMPLES.md": `# Investigation Structure Examples

## Example: Redundancy without repetition
> Space says someone climbed the window (fresh scratches). Behavior says the witness won’t look at the window when asked. Records say the guard log has a missing entry for the hour. Three paths, one conclusion—and each suggests a different next action.`,
});

const GM_SOCIAL_CONFLICT_PACK = pack("gm-social-conflict", {
  "SKILL.md": `---
name: gm-social-conflict
description: Run negotiation and social pressure as stakes, leverage, and commitments.
---

# Social Conflict (Stakes, Leverage, Commitments)

Social conflict is a system of:
- stakes (what each side risks)
- leverage (what can be traded/threatened)
- commitments (what changes after words)

## When to use
- Conversations feel like “ask until answers appear.”
- NPCs give information too easily.
- Social scenes lack consequences.

## Quick start (one exchange)
Before the exchange, define:
- each side’s want
- each side’s fear
- one leverage source

Then price information and end with a commitment (debt/suspicion/access).

## Level 1: Stakes first
For each side:
- want now
- fear losing
- offer

## Level 2: Leverage sources
- money/resources
- status/authority
- secrets/blackmail
- time pressure
- physical safety

Leverage should be discoverable via clues, not omniscience.

## Level 3: Commitments create residue
Words change the world:
- promise → debt
- threat → preemptive move
- insult → price/access changes

## Level 4: Offer structures (legibility)
- “If you do X, I will do Y.”
- “If you don’t, Z happens.”

Next: CHECKLIST.md.`,

  "CHECKLIST.md": `# Social Conflict Checklist

- [ ] Stakes defined (want/fear/offer)
- [ ] Leverage is concrete and discoverable
- [ ] Information has a price (money/time/exposure/debt)
- [ ] Outcome creates residue (debt/suspicion/access/clock)
- [ ] Options are legible (If X then Y / else Z)`,

  "TEMPLATES.md": `# Social Conflict Templates

## Template A: Deal
> “If you do X, I’ll do Y.”  
> “If you don’t, Z happens.”

## Template B: Price information
> “I can tell you. But you’ll pay in [MONEY/TIME/DEBT/EXPOSURE].”

## Template C: Commitment as hook
> “Fine. Then we’re agreed.”  
> The price is a new problem: [DEBT/REPUTATION/ACCESS SHIFT].`,

  "EXAMPLES.md": `# Social Conflict Examples

## Example: Information priced with exposure
> “You want a name?”  
> He doesn’t refuse. He points at the open street. “Ask it here, and you’ll get your answer. Ask it inside, and you’ll get a lie. Your choice.”`,
});

const GM_VFS_READING_PACK = pack("gm-vfs-reading", {
  "SKILL.md": `---
name: gm-vfs-reading
description: Cheap, safe VFS reads: locate → sample → confirm (and skill usage).
---

# VFS Reading Workflow (Locate → Sample → Confirm)

Goal: Confirm state and details without huge reads.

## Step 1: Locate (no content reads)
- vfs_ls / vfs_stat / vfs_glob

Examples:
- List skills: vfs_ls path="current/skills"
- Find skill files: vfs_glob patterns=["skills/**/SKILL.md"]

## Step 2: Sample (small reads)
- vfs_read with maxChars or start+offset
Rule: do not read huge files in one call if you only need one fact.

## Step 3: Confirm (field-only)
- vfs_read_json with pointers

## Skill usage pattern (recommended)
1) Identify a weakness (e.g. “dialogue is flat”).
2) Read exactly one skill that targets it.
3) Apply ONE technique immediately in the next output.

Rules:
- current/skills/** is read-only.
Next: CHECKLIST.md.`,

  "CHECKLIST.md": `# VFS Reading Checklist

- [ ] Use vfs_ls/vfs_glob/vfs_stat before reading content
- [ ] Use vfs_read with maxChars or start+offset for sampling
- [ ] Use vfs_read_json for targeted fields
- [ ] Read one skill, apply one technique immediately
- [ ] Never write/edit under current/skills/**`,

  "TEMPLATES.md": `# VFS Reading Templates

## Template A: Locate → sample → confirm
1) Locate:
- vfs_glob patterns=["<pattern>"]

2) Sample:
- vfs_read path="<path>" maxChars=800

3) Confirm (JSON only):
- vfs_read_json path="<path>" pointers=["/path/to/field"]`,

  "EXAMPLES.md": `# VFS Reading Examples

## Example: Find and open a skill
1) List skills:
> vfs_ls path="current/skills"

2) Read one skill:
> vfs_read path="current/skills/writing-dialogue/SKILL.md" maxChars=1200

3) Apply one technique:
> Make each line carry an intent, and price information with a cost.`,
});

const GM_SPOTLIGHT_ROTATION_PACK = pack("gm-spotlight-rotation", {
  "SKILL.md": `---
name: gm-spotlight-rotation
description: Distribute spotlight fairly: each player gets meaningful decisions, costs, and payoffs.
---

# Spotlight Rotation (Fair Attention, Real Agency)

Spotlight is not equal screen time. Spotlight is:
- meaningful decisions
- visible consequences
- a chance to express identity and competence

## When to use
- One player dominates scenes by default.
- Quiet players fade into “spectator mode.”
- The group feels fragmented (no shared momentum).

## Quick start (handoff discipline)
At the end of each beat, explicitly hand off with a question:
> “What do you do?”  
And make the question include a constraint:
> “What do you do *given the guard is watching your hands*?”

## Level 1: The spotlight token (simple tracking)
Track who has had a “decision with consequence” recently.
If someone hasn’t, aim the next clear question at them.

## Level 2: Rotate by pressure, not by politeness
Use the current pressure to choose who to ask next:
- who is most exposed?
- who has the leverage?
- whose values are being tested?

## Level 3: Parallel scenes with a shared clock
Split briefly, but bind with a shared pressure clock:
- time until doors close
- suspicion heat
- oxygen/fuel budget

This keeps everyone in the same game even when split.

## Level 4: Give quiet players “low-friction hooks”
Offer options that are:
- concrete
- small
- safe to propose
Examples:
- “Ask one question.”
- “Check one detail.”
- “Pick a route.”

## Level 5: Prevent spotlight theft (gently)
Use clean guardrails:
- “Hold that thought—let’s hear from X first.”
- “We’ll come back to you after we resolve this choice.”

## Anti-patterns
- rotating turns with no consequence (busywork)
- spotlight only during combat, not social/investigation
- punishing a talkative player instead of structuring turns

Next: CHECKLIST.md and TEMPLATES.md.`,

  "CHECKLIST.md": `# Spotlight Rotation Checklist

- [ ] Each player gets a meaningful decision regularly
- [ ] Handoffs end with a clear question + constraint
- [ ] Scene splits share a clock (pressure stays shared)
- [ ] Quiet players get low-friction hooks
- [ ] Spotlight theft is prevented with gentle structure`,

  "TEMPLATES.md": `# Spotlight Rotation Templates

## Template A: Handoff question
> “[Player], what do you do given [CONSTRAINT]?”

## Template B: Low-friction hook menu
- ask one question
- test one assumption
- choose a route
- spend a resource to change the situation

## Template C: Shared clock framing
> “While you do that, the clock advances: [EVIDENCE OF PRESSURE].”`,

  "EXAMPLES.md": `# Spotlight Rotation Examples

## Example: Gentle structure
> “Cool—hold that plan. I want to hear one move from Mina first.”  
> “Mina, what do you do given the clerk is watching your hands and the door is open to the street?”`,
});

const GM_SCENE_FRAMING_PACK = pack("gm-scene-framing", {
  "SKILL.md": `---
name: gm-scene-framing
description: Start scenes with clear anchors and pressure; end with an unresolved edge (without railroading).
---

# Scene Framing (Start Sharp, End Hooked)

Good framing increases momentum without forcing outcomes.

## When to use
- Scenes feel meandering.
- Players ask “what can we do here?” too often.
- Endings feel flat (no forward pull).

## Quick start (3-sentence open)
Open a scene with:
1) anchor (where + sensory evidence)
2) pressure (time/exposure/scarcity/law/pain)
3) question (what’s uncertain / what needs deciding)

Then ask one player a concrete question.

## Level 1: The contract of the scene
Every scene should clarify:
- what is at stake (now)
- what is constrained
- what can be learned or gained

## Level 2: Offer a menu, not a script
Provide 2–3 obvious approaches:
- social / stealth / force / knowledge
Each with a cost signal.

## Level 3: End with an unresolved edge
At scene end, create:
- a new debt
- a timer
- a contradiction
- a threat that is now closer

## Level 4: Hard cuts are allowed (with residue)
If you cut, carry residue:
- “While you were gone, the clerk logged your name.”
- “In the hour you waited, the patrol route changed.”

## Anti-patterns
- scenes that start with exposition instead of pressure
- “you can do anything” with no constraints
- cliffhangers that never pay off

Next: CHECKLIST.md and TEMPLATES.md.`,

  "CHECKLIST.md": `# Scene Framing Checklist

- [ ] Opening includes anchor + pressure + question
- [ ] 2–3 approaches are visible (social/stealth/force/knowledge)
- [ ] Costs are legible (time/exposure/debt/resource)
- [ ] Ending leaves an unresolved edge (debt/timer/contradiction/threat)
- [ ] Cuts carry residue (world keeps moving)`,

  "TEMPLATES.md": `# Scene Framing Templates

## Template A: 3-sentence open
> [ANCHOR].  
> [PRESSURE EVIDENCE].  
> [QUESTION].  
> “[Player], what do you do?”

## Template B: Menu offer
- Social: [DEAL] (cost: [COST])
- Stealth: [AVOID] (risk: [EXPOSURE])
- Force: [BREAK] (residue: [WITNESS/DAMAGE])`,

  "EXAMPLES.md": `# Scene Framing Examples

## Example: Sharp open
> The clerk’s office smells of ink and damp paper, and the only window faces the street like a witness. A bell somewhere outside marks the last hour before closing. Your permit sits on the desk—almost right, but not stamped twice.  
> What do you do?`,
});

const GM_COMBAT_CLARITY_PACK = pack("gm-combat-clarity", {
  "SKILL.md": `---
name: gm-combat-clarity
description: Run combat as clarity + consequence: telegraph, geometry, costs, and fair outcomes (system-agnostic).
---

# Combat Clarity (Telegraph + Geometry + Cost)

Combat becomes satisfying when players can:
- understand the situation
- choose methods with tradeoffs
- trust that outcomes follow mechanisms

## When to use
- Combat feels arbitrary or confusing.
- Players can’t visualize positions/cover/line-of-sight.
- Threats “appear” without telegraphing.

## Quick start (TGC)
Before any significant enemy action, provide:
1) Telegraph: what is about to happen (observable)
2) Geometry: where it matters (distance/cover/exits)
3) Cost: what happens if they ignore it

## Level 1: Telegraphing makes fairness
Telegraph in evidence:
- posture shifts, weapon ready, breath drawn
- someone moving to flank
- a chant beginning, lights dimming

## Level 2: Geometry in three facts
Each combat beat should include 1–3 facts:
- distance (close/near/far)
- cover (hard/soft, partial/full)
- exits (blocked/open, who controls them)

## Level 3: Choices with tradeoffs (not one best move)
Offer at least two viable approaches:
- aggressive (gain tempo, risk exposure)
- defensive (reduce risk, lose time/position)
- clever (spend resource, create advantage)

## Level 4: Costs persist (injury, fatigue, noise, witnesses)
Make combat leave residue:
- noise advances clocks
- injuries change future verbs
- witnesses spread stories

## Level 5: Endings matter
A combat should end with a changed state:
- access gained/lost
- enemy morale shifts
- new pressure introduced

## Anti-patterns
- surprise lethality with no telegraph
- “fog combat” where players can’t picture anything
- damage-only consequences; no social/institutional residue

Next: CHECKLIST.md and TEMPLATES.md.`,

  "CHECKLIST.md": `# Combat Clarity Checklist

- [ ] Telegraph present for major enemy actions
- [ ] Geometry facts included (distance/cover/exits)
- [ ] Two+ viable approaches exist (tradeoffs)
- [ ] Costs persist (injury/fatigue/noise/witnesses)
- [ ] Combat ends with a state change (access/pressure/residue)`,

  "TEMPLATES.md": `# Combat Clarity Templates

## Template A: Beat framing (TGC)
Telegraph:
> [OBSERVABLE THREAT]
Geometry:
> [DISTANCE/COVER/EXIT FACT]
Cost:
> If you ignore it, [CONSEQUENCE].

## Template B: Option menu (fast)
- Push: [ADVANTAGE] (risk: [COST])
- Hold: [SAFETY] (cost: [TIME/POSITION])
- Trick: [RESOURCE SPEND] (residue: [TRACE])`,

  "EXAMPLES.md": `# Combat Clarity Examples

## Example: Telegraph + choice
> The enforcer stops talking and shifts his weight—feet widening like he’s bracing for a rush. Two of his people drift toward the exits without pretending they aren’t. If they close those doors, you’ll be trapped inside with the witnesses.  
> Do you push now, hold position and talk, or spend something to create a distraction?`,
});

const GM_RESOURCE_PRESSURE_PACK = pack("gm-resource-pressure", {
  "SKILL.md": `---
name: gm-resource-pressure
description: Turn resources into meaningful pressure: scarcity, tradeoffs, and residue (without bookkeeping bloat).
---

# Resource Pressure (Scarcity + Tradeoffs + Residue)

Resources matter when they change decisions. You don’t need spreadsheets; you need:
- scarcity axes that bite
- visible costs
- consequences that persist

## When to use
- Players hoard because nothing pressures them.
- Gear/wealth exists but never constrains action.
- “Rest” or “buy supplies” resets tension too easily.

## Quick start (choose 2 axes)
Pick TWO resource axes for this arc:
- time
- exposure/heat
- money/credit
- ammo/tools
- stamina/injury
- social capital (trust, favors)

Then, every 2–3 turns, make at least one axis pay a cost.

## Level 1: Resources are signals, not numbers
Track in bands:
- plenty / low / critical
Show via evidence:
- “last clip”, “empty shelf”, “worse pain”, “prices rise”, “ally goes quiet”

## Level 2: Spending creates residue
If a resource solves a problem, it leaves residue:
- bribe → debt/record
- ammo → noise/evidence
- medical supplies → scarcity later

## Level 3: Convert resources into choices
Offer menus:
- spend money to save time (risk record)
- spend time to reduce exposure
- spend favors to bypass gates (create obligation)

## Level 4: Recovery is a tradeoff
Resting should cost:
- time (clocks advance)
- exposure (you stay in one place)
- social (people talk)

## Level 5: Scarcity escalates, it doesn’t oscillate randomly
Scarcity should follow causes:
- markets close
- routes cut
- institutions tighten

## Anti-patterns
- tracking 12 resources with no payoff
- “free refills” that erase stakes
- scarcity that appears/disappears arbitrarily

Next: CHECKLIST.md and TEMPLATES.md.`,

  "CHECKLIST.md": `# Resource Pressure Checklist

- [ ] Two resource axes chosen for the arc
- [ ] States tracked in bands (plenty/low/critical)
- [ ] Costs land regularly (every 2–3 turns)
- [ ] Spending leaves residue (debt/record/noise)
- [ ] Tradeoff menus offered (time vs exposure vs money vs favors)
- [ ] Recovery has costs (time/exposure/social)`,

  "TEMPLATES.md": `# Resource Pressure Templates

## Template A: Band statement
> You’re [PLENTY/LOW/CRITICAL] on [AXIS]. If you spend it here, you’ll pay later in [CONSEQUENCE].

## Template B: Tradeoff menu
- Spend money: [ADVANTAGE] (residue: record/debt)
- Spend time: [SAFETY] (cost: window/clock)
- Spend favor: [BYPASS] (cost: obligation)

## Template C: Recovery tradeoff
> You can rest, but resting means [CLOCK ADVANCES] and [EXPOSURE RISK].`,

  "EXAMPLES.md": `# Resource Pressure Examples

## Example: Bribe as debt, not reset
> The bribe works. The guard opens the gate without looking at your face. But he keeps the coin in his palm, visible, as if to show you who owns the memory of this moment. Tomorrow, someone will ask him why the gate opened.`,
});

const GM_ENCOUNTER_DESIGN_PACK = pack("gm-encounter-design", {
  "SKILL.md": `---
name: gm-encounter-design
description: Build encounters as pressures + gates + information (combat optional), with multiple methods and residue.
---

# Encounter Design (Pressure + Gates + Methods)

An encounter is a decision container. Good encounters:
- present a pressure (why now)
- include gates (what blocks easy success)
- offer multiple methods (social/stealth/force/knowledge)
- produce residue (the world reacts)

## When to use
- Encounters feel like “fight or nothing.”
- Players don’t see options.
- Success/failure doesn’t change the world.

## Quick start (PGMR)
Write an internal encounter card:
1) Pressure (time/exposure/scarcity/law/pain)
2) Gates (2–3: identity, geometry, attention, record)
3) Methods (at least 3: social/stealth/force/knowledge)
4) Residue (what trace remains no matter what)

## Level 1: Gates make options meaningful
Gate types:
- identity: credential required
- geometry: locked door, distance, chokepoint
- attention: witnesses/guards/cameras
- record: logs, ledgers, stamps

## Level 2: Methods must differ in cost and future constraint
If two methods have the same cost, they’re reskins.
Ensure each method changes:
- time, exposure, debt, injury, reputation

## Level 3: Failure is a fork, not a stop
Prepare 2–3 fail states:
- partial success with cost
- new complication and a new choice

## Level 4: Make the “obvious play” visible
Players shouldn’t need to guess the rules.
Telegraph:
- patrol routes
- lock quality
- social hierarchy

## Level 5: Reward discovery
Let investigation reveal:
- alternate routes
- leverage points
- schedule windows

## Anti-patterns
- single-key gating
- “gotcha” rules not telegraphed
- encounters that reset on retry

Next: CHECKLIST.md and TEMPLATES.md.`,

  "CHECKLIST.md": `# Encounter Design Checklist

- [ ] Pressure is clear and observable
- [ ] 2–3 gates exist (identity/geometry/attention/record)
- [ ] 3+ methods exist (social/stealth/force/knowledge)
- [ ] Methods differ in cost and future constraints
- [ ] Failure states are forks (not stops)
- [ ] Telegraphed rules (no gotchas)
- [ ] Residue ensures the world reacts`,

  "TEMPLATES.md": `# Encounter Design Templates

## Template A: Encounter card
- Objective:
- Pressure:
- Gates:
- Methods:
- Failure forks:
- Residue:

## Template B: Method spec (per option)
- Method:
- Cost channel:
- Signal learned:
- Residue left:
- Next constraint created:`,

  "EXAMPLES.md": `# Encounter Design Examples

## Example: “Get the stamp”
Pressure: closing hour.  
Gates: identity (wrong seal), attention (guard watching hands), record (ledger logs entries).  
Methods: talk (debt), sneak (exposure), force (damage residue), verify (time).  
Residue: your name becomes attached to the attempt in some system.`,
});

const GM_HEIST_RUNNER_PACK = pack("gm-heist-runner", {
  "SKILL.md": `---
name: gm-heist-runner
description: Run heists with windows, clocks, gates, and dynamic complications—keeping fairness and momentum.
---

# Heist Runner (Windows + Clocks + Gates + Fallout)

This skill turns “planning montage” into a runnable structure.

## When to use
- Heists bog down in endless planning.
- Security feels arbitrary.
- Complications feel like GM punishment instead of consequences.

## Quick start (WCGF)
Define:
1) Window (time constraint)
2) Clocks (heat/suspicion, time, noise)
3) Gates (identity, geometry, attention, record)
4) Fallout (who investigates and how)

Then start in motion: put the first gate on screen.

## Level 1: Planning is a resource with diminishing returns
Allow planning, but make it cost:
- time (window closes)
- exposure (questions attract attention)

## Level 2: Complications are causal
Complication sources:
- a clock advanced (noise/heat/time)
- a gate was bypassed (record mismatch)
- an NPC acted (agency)

No random “because drama.”

## Level 3: Keep choices legible
At every gate, offer:
- legit path (time cost)
- dirty path (residue/heat)
- clever path (resource/debt)

## Level 4: The heist ends with changed procedures
After the job:
- logs are audited
- routes are watched
- keys are changed

Fallout keeps success meaningful.

## Level 5: Let partial success happen
Common partial wins:
- get item, lose anonymity
- escape, lose loot
- avoid arrest, owe a favor

## Anti-patterns
- “security level jumps” with no cause
- complications that erase agency
- perfect success with no residue

Next: CHECKLIST.md and TEMPLATES.md.`,

  "CHECKLIST.md": `# Heist Runner Checklist

- [ ] Window is defined and visible
- [ ] 2–3 clocks exist with evidence
- [ ] Gates are concrete (identity/geometry/attention/record)
- [ ] Complications are causal (clock/gate/NPC move)
- [ ] Each gate offers legit/dirty/clever choices
- [ ] Fallout changes procedures after the job`,

  "TEMPLATES.md": `# Heist Runner Templates

## Template A: Gate choice menu
- Legit: [PROCEDURE] (cost: time)
- Dirty: [BYPASS] (cost: heat/residue)
- Clever: [LEVERAGE] (cost: resource/debt)

## Template B: Complication prompt
> The complication happens because [CAUSE]. The new constraint is [CONSTRAINT]. Your options are [A/B/C].`,

  "EXAMPLES.md": `# Heist Runner Examples

## Example: Causal complication (record gate)
> You bypass the badge scan. The door opens. The problem isn’t the door—it’s the log. Ten minutes later, a silent alert flags an entry with no matching badge. Heat advances. Now you can leave fast (exposure), stay and erase the log (time), or pin the entry on someone else (moral cost).`,
});

const GM_QUEST_DESIGN_PACK = pack("gm-quest-design", {
  "SKILL.md": `---
name: gm-quest-design
description: Design quests as pressures, constraints, and information webs (not checklists).
---

# Quest Design (Pressure + Information + Cost)

Quests should be playable structures:
- a pressure that forces choices
- information that can be learned in multiple ways
- costs that create consequences

## When to use
- Quests feel like “go here, do thing.”
- Objectives lack stakes or tradeoffs.
- Progress depends on one NPC or one clue.

## Quick start (quest card)
Define:
- objective (concrete)
- pressure (why now)
- blockers (2–3 obstacles, each with 2+ methods)
- costs (time/exposure/debt/resources)
- payoff (what changes)

## Level 1: Multi-path progress
For each blocker, provide at least two methods:
- social (deal)
- stealth (avoid)
- force (break)
- knowledge (deduce)

## Level 2: Information web
Important facts should have redundancy:
- space residue
- behavior tells
- dialogue/records

## Level 3: Consequence hooks
Quest progress should leave residue:
- witnesses, logs, rumors, debts

Next: TEMPLATES.md.`,

  "CHECKLIST.md": `# Quest Design Checklist

- [ ] Objective is concrete and testable
- [ ] Pressure exists (time/exposure/scarcity/law)
- [ ] 2–3 blockers exist; each has 2+ methods
- [ ] Information is redundant (multiple sources)
- [ ] Progress creates residue (debt/logs/witnesses)
- [ ] Payoff changes state (access/resources/relationships)`,

  "TEMPLATES.md": `# Quest Design Templates

## Template A: Quest card
- Objective:
- Pressure:
- Blockers:
- Methods per blocker:
- Costs:
- Payoff:
- Residue:

## Template B: Blocker methods
Blocker: [OBSTACLE]
- Social: [DEAL] (cost: [COST])
- Stealth: [AVOID] (risk: [EXPOSURE])
- Force: [BREAK] (residue: [WITNESS/DAMAGE])
- Knowledge: [DEDUCE] (time: [TIME COST])`,

  "EXAMPLES.md": `# Quest Design Examples

## Example: Objective with pressure
> Objective: recover a ledger page. Pressure: the market closes in 30 minutes and patrols shift. Blockers: access (locked office), attention (clerk watching), legitimacy (wrong seal). Each blocker has multiple methods, each method creates different residue.`,
});

const GM_REWARD_AND_RELIEF_PACK = pack("gm-reward-and-relief", {
  "SKILL.md": `---
name: gm-reward-and-relief
description: Provide relief and rewards that reinforce agency without resetting stakes.
---

# Reward and Relief (Payouts That Don’t Break Tension)

Rewards are not just loot. They are:
- access
- information
- allies
- reduced pressure
- new affordances

Relief prevents fatigue, but should not erase consequence.

## When to use
- The game feels relentlessly tense with no breathing room.
- Rewards feel random or overpowered.
- Players stop taking risks because payoff is unclear.

## Quick start (reward design)
When the player pays a cost, consider one of:
- new access (a door opens)
- new leverage (a name, a token, a debt owed to them)
- new affordance (a tool, a safe route)
- reduced pressure (clock slowed, suspicion lowered)

## Level 1: Reward types (prefer non-power rewards)
- information (testable)
- access (jurisdiction, invitation, keys)
- ally (with constraints)
- resource (limited)
- relief (temporary)

## Level 2: Relief should be earned and partial
Relief is:
- safety for a moment
- clarity on one rule
- a chance to regroup

But residue persists.

## Level 3: Reinforce agency
Rewards should expand choice space, not remove it.

Next: CHECKLIST.md.`,

  "CHECKLIST.md": `# Reward and Relief Checklist

- [ ] Reward matches the cost paid (feels earned)
- [ ] Reward expands choice space (new access/leverage/affordance)
- [ ] Reward does not erase residue (consequences persist)
- [ ] Relief is partial and temporary (breathing room, not reset)
- [ ] Reward is legible (player understands what changed)`,

  "TEMPLATES.md": `# Reward and Relief Templates

## Template A: Access reward
> The cost bought you a door: [ACCESS]. It doesn’t make you safe, but it makes you able.

## Template B: Leverage reward
> You earn [LEVERAGE]—a name, a token, a promise. It’s usable, but it comes with [CONSTRAINT].

## Template C: Relief beat
> For a moment, pressure drops: [RELIEF EVIDENCE]. The residue remains, waiting to be cashed in later.`,

  "EXAMPLES.md": `# Reward and Relief Examples

## Example: Relief without reset
> The contact gives you a safe room for one night. Not forever. The city still knows you asked the wrong questions, but tonight you can breathe—if you can sleep.`,
});

export const GM_SKILLS: GlobalSkillSeed[] = [
  ...GM_CAUSE_EFFECT_PACK,
  ...GM_ANTI_VAGUE_LANGUAGE_PACK,
  ...GM_CHOICE_DESIGN_PACK,
  ...GM_CLOCKS_AND_PRESSURE_PACK,
  ...GM_NPC_AGENCY_PACK,
  ...GM_FAILURE_AND_COMPLICATIONS_PACK,
  ...GM_INVESTIGATION_STRUCTURE_PACK,
  ...GM_SOCIAL_CONFLICT_PACK,
  ...GM_VFS_READING_PACK,
  ...GM_SPOTLIGHT_ROTATION_PACK,
  ...GM_SCENE_FRAMING_PACK,
  ...GM_COMBAT_CLARITY_PACK,
  ...GM_RESOURCE_PRESSURE_PACK,
  ...GM_ENCOUNTER_DESIGN_PACK,
  ...GM_HEIST_RUNNER_PACK,
  ...GM_QUEST_DESIGN_PACK,
  ...GM_REWARD_AND_RELIEF_PACK,
];
