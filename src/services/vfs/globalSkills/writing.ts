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

const WRITING_SENSORY_DETAIL_PACK = pack("writing-sensory-detail", {
  "SKILL.md": `---
name: writing-sensory-detail
description: Add decision-relevant sensory detail without purple prose.
---

# Sensory Detail (Decision-Relevant)

Purpose: make description do *work*, not decoration.

This skill helps you turn “nice prose” into playable clarity:
- constraints become legible
- risks become specific
- choices become meaningful
- theme is carried by concrete carriers (not adjectives)

## When to use
- A scene reads like summary (thin, generic, floaty).
- You keep using mood words (tense / eerie / ominous) without evidence.
- The player cannot visualize: light, exits, distance, obstacles.

## Quick start (30 seconds)
For the next beat only:
1) pick ONE pressure mechanism (time / exposure / scarcity / law / pain)
2) add TWO sensory anchors (one environmental + one material)
3) add ONE “cost signal” (what this pressure does to action)

## Level 1: The sensory budget (avoid checklists)
Pick 2–4 signals per beat. All five senses every paragraph becomes noise.

Default budget:
- environment: air/light/ambient sound
- material: surface/temperature/friction/weight
- social: tell/norm/status cue
- optional: cost (fatigue/pain/time/exposure)

## Level 2: Decision relevance (details that change verbs)
If a detail does not change risk, information, or cost, it is decoration.

Use the “changes a verb” test:
- smoke changes SEE
- slick stone changes RUN
- echo changes WHISPER
- crowds change DRAW A WEAPON
- wind changes HEAR / SMELL / AIM

## Level 3: Mechanism over mood (evidence first)
Replace vibe with observable evidence.

Bad: “Something feels wrong.”
Better: “The innkeeper answers too fast, then glances twice at the back door.”

Pattern:
1) evidence (observable)
2) constraint (what it limits)
3) risk (what it might cost if you act)

## Level 4: Microphysics (one true fact sells the scene)
Add ONE physical truth per beat:
- weight, heat, friction, acoustics, humidity

## Level 5: Social physics (rules leak through behavior)
Use micro-behaviors that imply hierarchy:
- who interrupts (and who allows it)
- who avoids names/titles
- who handles money vs refuses to touch it
- who watches exits vs watches hands

## Advanced: Theme as repetition-with-variation
Theme is pressure repeated through changing carriers.
Example carriers:
- oppression: low doorframes, sticky air, guards positioned to block exits
- warmth: broth steam, worn fabric, practiced gestures of care
- rot: sweet perfume over sweat, polished surfaces hiding grime

## What this skill is NOT
- Not “purple prose.”
- Not metaphors that distort geometry.
- Not sensory spam.

Next: read CHECKLIST.md and TEMPLATES.md for immediate use.`,

  "CHECKLIST.md": `# Sensory Detail Checklist

## Per beat (pick 2–4)
- [ ] Environmental anchor (air / light / ambient sound)
- [ ] Material anchor (surface / temperature / friction / weight)
- [ ] Social anchor (tell / norm / status cue)
- [ ] Cost signal (fatigue / pain / time loss / exposure)

## Precision checks
- [ ] No mood word without evidence (“tense”, “eerie”, “wrong”)
- [ ] At least one detail changes a verb (SEE/RUN/WHISPER/NEGOTIATE)
- [ ] One microphysics fact (heat, friction, acoustics, humidity, weight)

## Anti-pattern checks
- [ ] No adjective stacks without mechanism
- [ ] No geometry-breaking metaphors
- [ ] No forced emotions / mind-reading`,

  "TEMPLATES.md": `# Sensory Detail Templates

## Template A: New location (2 sentences)
Sentence 1 (environment + light):
> The [LIGHT SOURCE] makes [SHADOW BEHAVIOR], and the air tastes of [SMELL / TEXTURE].

Sentence 2 (constraint + cost):
> [CONSTRAINT] turns even a simple [VERB] into [COST / RISK].

## Template B: Tension beat (3 sentences)
1) Foreground sound + social tell:
> [SOUND] cuts through the room. [NPC] [TELL].

2) Material fact:
> [SURFACE / TEMPERATURE / FRICTION] makes your [BODY PART / TOOL] behave differently than you want.

3) Consequence hint:
> If you [ACTION], you’ll likely pay [COST]—and someone will remember.

## Template C: “Wrongness” without vague language
Evidence:
> [EVIDENCE 1]. [EVIDENCE 2].
Constraint:
> That means you can’t rely on [ASSUMPTION].
Risk:
> If you act openly, you risk [CONSEQUENCE].`,

  "EXAMPLES.md": `# Sensory Detail Examples

## Example 1: “Tense tavern” without the word “tense”
> The door shuts behind you and the outside noise drops away too cleanly, like it was waiting to be cut. Smoke hangs low, but it’s not the cozy kind—too sweet, too thick, clinging to your tongue. The bartender keeps polishing the same circle until the wood squeaks, and he does not look up when you step closer. He looks at the back door instead.

## Example 2: Constraint changes a verb (running)
> The alley looks open until your boot hits the first patch of slick moss. Your foot skates half an inch—enough to steal confidence. Wet stone turns “run” into “choose every step,” and every careful step costs you a heartbeat of time you don’t have.

## Example 3: Microphysics sells the threat
> The metal railing is colder than it should be. Cold enough that your palm aches through leather. Whatever’s on the other side of this door isn’t just “dangerous”—it’s draining heat out of the hallway like it owns the air.`,
});

const WRITING_DIALOGUE_PACK = pack("writing-dialogue", {
  "SKILL.md": `---
name: writing-dialogue
description: Dialogue as leverage: intent, subtext, power, and information pricing.
---

# Dialogue (Intent + Subtext + Power)

Dialogue is gameplay: words change access, debt, suspicion, and clocks.

## When to use
- Dialogue sounds like exposition.
- NPCs share a voice; scenes lack power asymmetry.
- The conversation advances facts but not tension or consequence.

## Quick start (minimum viable exchange)
In the next 6–10 lines, enforce:
1) each speaker wants something *now*
2) information has a price
3) a tell leaks a constraint (fear, habit, taboo, leverage)

## Level 1: Every line has an intent
Before writing a line, pick ONE intent:
- probe / stall / misdirect / flatter / accuse / bargain / threaten / confess / recruit / test loyalty

## Level 2: The three-layer line
1) surface meaning
2) hidden goal
3) a tell (timing, wording, ritual, avoidance)

## Level 3: Information pricing (no free secrets)
If the player gets value, something else gets worse:
- time, exposure, debt, reputation, moral cost

## Level 4: Power gradients in speech
Power appears in turn-taking:
- who interrupts
- who asks questions
- who can afford silence
- who uses titles vs names

## Level 5: Subtext tools
- partial truth (verifiable detail + hidden lie)
- strategic omission (avoid the one noun that matters)
- conditional offers (“If you mean it, do X.”)

Next: read CHECKLIST.md and TEMPLATES.md to apply fast.`,

  "CHECKLIST.md": `# Dialogue Checklist

## Core (per exchange)
- [ ] Each speaker has a concrete want (now)
- [ ] Information has a price (money/time/debt/exposure)
- [ ] One power move is visible (interrupt, silence, topic control)
- [ ] One tell leaks a constraint (fear, taboo, habit)

## Subtext tools (optional)
- [ ] Partial truth used (verifiable detail + hidden lie)
- [ ] Strategic omission (the key noun is avoided)
- [ ] Conditional offer (If X, then Y)

## Anti-patterns
- [ ] No exposition dumps in quotes
- [ ] No adverb-heavy tags doing emotional work
- [ ] No “everyone is witty” voice merge`,

  "TEMPLATES.md": `# Dialogue Templates

## Template A: Negotiation (claim → pushback → counter → cost)
NPC claim:
> “I can [DO THING], but not for free.”

Player pressure:
> “I don’t have time.”

NPC counter:
> “Then you’ll pay in something else.”

Cost reveal (make it concrete):
> “If I help you, [RESIDUE] happens—and my name is attached to it.”

## Template B: Interrogation without confession
NPC answers with a question:
> “Why would you ask me that?”

Partial truth:
> “I saw him, sure. Not where you think.”

Topic control:
> “Before we talk about him, we talk about what you’re offering.”

## Template C: Social threat (clean, legible)
Offer:
> “Do X, and you keep walking.”

Refusal consequence:
> “Don’t, and I make a call. The kind that doesn’t get forgotten.”

## Template D: Silence as a move
> [NPC does an action: closes ledger / locks door / pours drink]
> “Now we can talk.”`,

  "EXAMPLES.md": `# Dialogue Examples

## Example 1: Leverage without lore-dump
> “We’re closed.”  
> The bartender keeps polishing the same circle until the wood squeaks. His eyes flick once—twice—toward the back door.  
> “Closed to me?”  
> “Closed to trouble.”  
> “I’m not trouble.”  
> “That’s what trouble says before it sits down.”  
> He lowers his voice without lowering his face. “If you’re paying, pay now. If you’re staying… don’t make it my name they remember.”

## Example 2: Information pricing
> “You want a name? Fine.”  
> She taps the table twice—once for the truth, once for the price.  
> “Bring me a signed pass from the dockmaster. Then I’ll say it out loud.”`,
});

const WRITING_PACING_PACK = pack("writing-pacing", {
  "SKILL.md": `---
name: writing-pacing
description: Control turn rhythm with pressure, cost, and payoff placement.
---

# Pacing (Pressure + Cost + Payoff)

Pacing is the distribution of:
- pressure (why act now)
- information (what becomes known)
- cost (what is spent / risked)
- payoff (what changes)

This skill is NOT “write faster.” It is “make turns feel paid for.”

## When to use
- Turns feel repetitive or flat.
- Everything is urgent (reader fatigue) or nothing is urgent (no drive).
- Events happen but consequences don’t land.

## Quick start (turn contract)
Every turn should deliver BOTH:
1) a state change (gain / loss / move / break / commit / reveal)
2) an unresolved edge (question / threat / debt / timer / misunderstanding)

## Level 1: Pressure is a mechanism (not adjectives)
Pick 1–2 pressures and show evidence:
- time (closing hour, footsteps, countdown)
- exposure (someone watching, traces left)
- scarcity (ammo, money, warmth, air)
- law (curfew, jurisdiction, permits)
- pain (injury, fatigue, hunger)

## Level 2: Cost placement (small often, big rarely)
Small costs: minutes, bruises, tools, rumors, suspicion.
Big costs: allies lost, safehouse burned, identity exposed, irreversible injury.

Rule: big costs must create new playable constraints, not just sadness.

## Level 3: Information placement (three horizons)
Maintain three threads:
- immediate (this scene)
- near (2–5 turns)
- far (arc shadow)

Reveal far-horizon truth through near-horizon evidence.

## Level 4: Alternating tempo (control fatigue)
- fast turn: external action, short paragraphs, concrete verbs
- slow turn: investigation/leverage, anchored detail, uncertainty

Rule: slow turns still need pressure, just lower amplitude.

Next: CHECKLIST.md and TEMPLATES.md.`,

  "CHECKLIST.md": `# Pacing Checklist

- [ ] State change is explicit (gain/loss/move/break/commit/reveal)
- [ ] Unresolved edge exists (question/threat/debt/timer/misunderstanding)
- [ ] Pressure is observable (time/exposure/scarcity/law/pain)
- [ ] A cost is paid (time/exposure/resource/relationship)
- [ ] Information is placed (immediate/near/far) without dumping
- [ ] Tempo matches content (fast vs slow)`,

  "TEMPLATES.md": `# Pacing Templates

## Template A: Fast turn (action)
Anchor:
> [ONE CONCRETE FACT ABOUT PLACE/LIGHT/BODIES]
Pressure:
> [OBSERVABLE PRESSURE EVIDENCE]
Exchange:
> [ACTION] → [REACTION] → [COST]
Hook:
> [UNRESOLVED EDGE]

## Template B: Slow turn (investigation/leverage)
Anchor:
> [SENSORY DETAIL THAT IMPLIES CONSTRAINT]
Question:
> [WHAT’S UNCLEAR / WHAT YOU NEED]
Test:
> [SMALL ACTION TO VERIFY]
Cost:
> [TIME/EXPOSURE/DEBT]
Hook:
> [NEW CONTRADICTION / NEW LEVERAGE]

## Template C: Cliffhanger menu
- sensory: a sound stops; light flickers; a smell arrives
- social: wrong name/title; refusal to say a noun
- evidence: object that shouldn’t exist; ledger mismatch
- obligation: favor comes due; promise invoked`,

  "EXAMPLES.md": `# Pacing Examples

## Example 1: Fast turn with clean cost
> The back door is closer than it looks—three strides if the floor weren’t slick. Your boot skates on spilled ale, just enough to steal speed. Behind you, a chair scrapes. Not loud, but loud enough in a room that has gone quiet on purpose. You can still reach the latch—if you’re willing to announce yourself.

## Example 2: Slow turn that still has pressure
> The ledger’s ink is dry, but the page corner is still warm where someone’s thumb held it down. A small thing. A recent thing. Asking about it out loud will make you visible, but waiting will let the trail cool. Either way, time moves—and someone is writing while you decide.`,
});

const WRITING_SCENE_ANCHORING_PACK = pack("writing-scene-anchoring", {
  "SKILL.md": `---
name: writing-scene-anchoring
description: Maintain spatial clarity and continuity under pressure.
---

# Scene Anchoring (Spatial Clarity)

Goal: keep geometry legible and make space constrain actions.

## When to use
- Readers can’t track positions or line-of-sight.
- Action feels like camera cuts; consequences feel arbitrary.
- Social scenes imply secrecy without enforcing who can hear.

## Quick start (2 sentences)
Provide:
1) where + one object
2) light + one constraint (exit/crowd/weather/rule)

Then keep one stable anchor every 2–3 paragraphs.

## Levels
- Level 1: The 4 anchors (where/light/bodies/constraint)
- Level 2: Re-anchoring beats
- Level 3: Space as mechanics (narrow halls, backlight, echo, crowds)
- Level 4: Sensory reach (who can see/hear whom)

Next: CHECKLIST.md and TEMPLATES.md.`,

  "CHECKLIST.md": `# Scene Anchoring Checklist

- [ ] Where: specific place + one object
- [ ] Light: source + shadow behavior
- [ ] Bodies: your position + distance to a key actor
- [ ] Constraint: door/crowd/weather/rule that changes risk
- [ ] Re-anchor: repeat one stable anchor every 2–3 paragraphs
- [ ] Enforce reach: who can see/hear whom (no free secrecy)`,

  "TEMPLATES.md": `# Scene Anchoring Templates

## Template A: Interior
> The [LIGHT SOURCE] throws [SHADOW BEHAVIOR] across [OBJECT]. You’re [POSITION], [DISTANCE] from [KEY ACTOR]. [CONSTRAINT] makes even [VERB] risky.

## Template B: Exterior
> [WEATHER] makes [SENSORY EFFECT]. The [LANDMARK] sits [DIRECTION], and the nearest exit is [EXIT], [DISTANCE]. [CONSTRAINT] changes what “move fast” means.

## Template C: Social secrecy enforcement
> [NPC] keeps his voice low, but [REASON THIS IS/WON’T BE SAFE] forces a choice: [SAFE METHOD] costs [COST], [FAST METHOD] risks [EXPOSURE].`,

  "EXAMPLES.md": `# Scene Anchoring Examples

## Example: Whisper scene with enforced reach
> The hearth light pools on the table and leaves the corners hungry. You’re one step inside the door, three from the back room curtain. The merchant leans close, but the guard by the window has a clean line of sight to your hands. If you want to pass anything, you’ll have to do it under the table—or not at all.`,
});

const WRITING_CHARACTER_VOICE_PACK = pack("writing-character-voice", {
  "SKILL.md": `---
name: writing-character-voice
description: Differentiate NPC voices via constraints, values, and verbal habits (not accents).
---

# Character Voice (NPC Differentiation)

This skill is NOT “give everyone a quirky accent.”
Voice comes from constraints and incentives:
- what the character wants right now
- what they refuse to say (taboo, leverage, fear)
- what they can’t afford to admit (institutional risk)
- how they behave under pressure (timing, politeness, aggression)

## When to use
- NPCs all sound like the same narrator.
- Dialogue feels interchangeable.
- The player cannot tell who is speaking without tags.

## Quick start (1 minute)
For the next speaking NPC, decide:
1) one value (status / safety / money / loyalty / purity / control)
2) one constraint (taboo / surveillance / debt / jurisdiction)
3) one habit (question-first / conditional offers / title use / silence)

Then write 6–10 lines where at least two lines are shaped by the constraint.

## Level 1: The 5 voice dials (pick 2–3)
- precision: exact vs vague
- warmth: direct care vs transactional politeness
- speed: clipped vs explanatory
- status: titles/rules vs names/favor
- honesty: blunt vs evasive vs performative

## Level 2: Lexical anchors (1–2 stable habits)
Give each important NPC:
- a favored verb (“owe”, “keep”, “measure”)
- a favored metaphor domain (money, weather, machines, scripture)
- a recurring sentence shape (questions, imperatives, conditionals)

Rule: keep habits subtle. Overuse becomes parody.

## Level 3: Values and taboos (what they will not say)
A voice becomes real when it has constraints:
- names they refuse to speak
- topics they dodge
- truths they can’t afford to admit

Write the dodge, not the confession.

## Level 4: Power behavior in micro-actions
Power is visible in non-verbal beats:
- who waits
- who interrupts
- who looks at doors vs faces
- who touches objects that “shouldn’t” be touched

## Level 5: Pressure reveals the “true voice”
Under pressure, voices converge toward their core:
- the lawful speak in procedures and permissions
- the fearful speak in conditions and exits
- the powerful speak in silence and time

## Anti-patterns
- everyone is witty in the same cadence
- accents/phonetic spellings as the main differentiator
- “character voice” that ignores what is at stake in the scene

Next: CHECKLIST.md and TEMPLATES.md.`,

  "CHECKLIST.md": `# Character Voice Checklist

## Per important NPC
- [ ] Value defined (status/safety/money/loyalty/control)
- [ ] Constraint defined (taboo/surveillance/debt/jurisdiction)
- [ ] 2–3 voice dials selected (precision/warmth/speed/status/honesty)
- [ ] 1–2 stable habits chosen (favored verb/metaphor/sentence shape)

## In the scene
- [ ] At least two lines are shaped by the constraint (avoid the noun, hedge, reframe)
- [ ] Power is visible (interruptions, silence, title use, topic control)
- [ ] Tags removable: you can still identify speakers

## Anti-pattern checks
- [ ] No accent/phonetic spelling reliance
- [ ] No lore dump in quotes
- [ ] No one-liner parade that ignores stakes`,

  "TEMPLATES.md": `# Character Voice Templates

## Template A: NPC card (internal)
- Value:
- Constraint:
- Fear:
- Leverage:
- Habit #1:
- Habit #2 (optional):
- Titles/names rule:

## Template B: “Constraint-shaped” line patterns
- taboo dodge:
  > “We don’t say that here.”
- conditional offer:
  > “If you can prove it, I can help.”
- jurisdiction deflection:
  > “That’s not my paperwork.”
- status test:
  > “And who, exactly, are you to ask?”

## Template C: Metaphor domain anchors
- money:
  > “What does it cost?”
- weather:
  > “Storm’s coming.”
- machines:
  > “That system doesn’t allow it.”
- scripture:
  > “That’s not permitted.”`,

  "EXAMPLES.md": `# Character Voice Examples

## Example 1: Clerk voice (procedure + jurisdiction)
> “Name.”  
> “I’m looking for—”  
> “Name first. Then we decide what you’re looking for.”  
> He doesn’t glare. He doesn’t smile. He just points at the form like it’s the only door that exists.

## Example 2: Fixer voice (price + conditions)
> “I can get you in.”  
> “Great.”  
> “Not great. Expensive. And you’ll behave.”  
> She taps the table twice. “You break anything, you pay twice: once in money, once in names.”

## Example 3: Priest voice (taboo + indirect threat)
> “We don’t speak of that hunger.”  
> “I’m not here for sermons.”  
> “No. You’re here because you heard it speak your name.”  
> He folds his hands. The gesture is gentle. The timing isn’t.`,
});

const WRITING_CLUE_SEEDING_PACK = pack("writing-clue-seeding", {
  "SKILL.md": `---
name: writing-clue-seeding
description: Plant clues as residue and contradictions without breaking immersion.
---

# Clue Seeding (Residue + Contradiction)

This skill is NOT “explain the mystery.”
It is how you plant solvable evidence:
- residue that can be revisited
- contradictions that invite questions
- details that become meaningful later

## When to use
- The story needs investigation, but clues feel arbitrary.
- Secrets are revealed via narrator announcements.
- Players miss clues because they appear once and vanish.

## Quick start (one clue in three channels)
Pick one hidden fact and plant it via:
1) space (object / residue)
2) behavior (tell / avoidance)
3) record or dialogue (partial truth)

Make at least one channel actionable (suggests a test).

## Level 1: Clues are residues
A clue should exist because something happened.
If it has no cause, it feels like author handouts.

Good residues:
- footprints where nobody should walk
- a ledger mismatch
- a ritual object handled recently (warm wax, fresh ash)
- a name used incorrectly

## Level 2: The “three placements” rule (redundancy without repetition)
For important facts, give three distinct ways to learn it:
1) environment (object/space)
2) behavior (a tell)
3) dialogue (a partial truth)

This is deeper than repeating the same clue three times.

## Level 3: Contradiction is fuel
Strong clues often contradict a surface story:
- alibi timing off by minutes
- someone “never” goes somewhere, but their coat is wet from rain outside
- a locked door, but the latch has fresh scratches

## Level 4: Make clues actionable
A clue should imply at least one action:
- follow the residue
- test the story
- ask a specific person a specific question
- revisit a location at a specific time

## Level 5: Keep the clue “in-world”
Clues should be noticed because they are operationally relevant:
- a guard checks a seal
- a clerk hesitates on a number
- an NPC repeats a phrase verbatim (not their own words)

## Anti-patterns
- “mysterious symbol” with no way to test it
- one-point-of-failure clue gating the entire plot
- narrator announces the secret instead of leaving evidence

Next: CHECKLIST.md and TEMPLATES.md.`,

  "CHECKLIST.md": `# Clue Seeding Checklist

## Per important fact
- [ ] The clue has a cause (residue of an action/event)
- [ ] Redundancy: at least 2 channels (space/behavior/dialogue-record)
- [ ] At least one clue is actionable (suggests a test)
- [ ] Contradiction exists (surface story vs evidence)
- [ ] Clue is “in-world” (noticed because it matters operationally)

## Anti-pattern checks
- [ ] Not a single-key gate
- [ ] Not a vague symbol with no test
- [ ] Not a narrator reveal`,

  "TEMPLATES.md": `# Clue Seeding Templates

## Template A: Residue → constraint → action
Residue:
> [EVIDENCE] is here because [CAUSE].
Constraint:
> That means [ASSUMPTION] is unreliable.
Action:
> You can test it by [METHOD].

## Template B: Contradiction pair
Surface story:
> “I never go to [PLACE].”
Contradiction:
> Their [OBJECT] is [WET/DUSTY/SMELLS LIKE PLACE], recently.

## Template C: Three placements (for one fact)
- space: [OBJECT / TRACE]
- behavior: [TELL / AVOIDANCE]
- record/dialogue: [LEDGER / PARTIAL TRUTH / WRONG TITLE]`,

  "EXAMPLES.md": `# Clue Seeding Examples

## Example 1: Residue becomes an action
> The wax seal on the letter is cracked, but not torn—someone opened it carefully, then pressed it back down while the wax was still warm. That means the “untouched” claim is a lie. You can test it by asking who had access to the candle room last night.

## Example 2: Contradiction fuels a question
> “Never been to the docks,” he says, too quickly. But his cuffs are still damp, and there’s a faint salt line where the fabric dried. If he wasn’t at the docks, he was near water—and near enough to be splashed.

## Example 3: Redundancy without repetition
> Space: a ledger page is missing, torn cleanly.  
> Behavior: the clerk keeps touching his pocket when you say the dockmaster’s name.  
> Record: the stamp ink on today’s permits is the wrong shade.`,
});

const WRITING_SUBTEXT_PACK = pack("writing-subtext", {
  "SKILL.md": `---
name: writing-subtext
description: Write subtext as a playable layer: intent, risk, and what cannot be said.
---

# Subtext (Intent + Risk + What’s Not Said)

Subtext is not “being vague.” Subtext is a second channel:
- the surface line is safe
- the intended line is risky
- the risk exists because of power, taboo, or surveillance

## When to use
- Dialogue is on-the-nose (“As you know…” / “I feel…”).
- Conversations transfer facts but not leverage.
- Characters speak too freely in unsafe environments.

## Quick start (the two-track line)
For the next exchange, enforce:
1) surface track: plausible deniability
2) intent track: what they’re really doing (probe, threaten, recruit)
3) constraint: why they can’t say it plainly (taboo, witnesses, power)

## Level 1: Give every line an intent
Pick one intent per line:
- test loyalty / demand proof / set a price / stall / misdirect / threaten / invite confession

If you can’t name the intent, the line is usually filler.

## Level 2: Use constraints to force indirection
Common constraints:
- witnesses nearby
- institutional logs
- taboo topics
- power imbalance (you can’t accuse the mayor directly)

Subtext becomes believable when you can name the constraint.

## Level 3: Subtext techniques (toolbox)
- answer-with-a-question (take control)
- conditional offer (“If you mean it, do X.”)
- strategic omission (avoid the noun)
- partial truth (verifiable detail + hidden lie)
- polite threat (tone stays calm; consequence is concrete)

## Level 4: Make subtext discoverable
Subtext is only useful if the player can infer it.
Signals:
- timing (too fast / too slow)
- repetition (phrase reused)
- body focus (eyes on exits, hand on pocket)
- topic pivots (refuses one noun, changes to procedure)

## Level 5: Payoff and residue
Subtext should create residue:
- suspicion rises
- a debt is created
- a promise is made (and enforceable later)

## Anti-patterns
- foggy dialogue where nobody can infer meaning
- cryptic metaphors that break scene clarity
- “subtext” that is just sarcasm without stakes

Next: CHECKLIST.md and TEMPLATES.md.`,

  "CHECKLIST.md": `# Subtext Checklist

- [ ] Each line has an intent (probe/threaten/bargain/stall)
- [ ] A constraint exists (witness/taboo/power/logs)
- [ ] Surface meaning is safe (plausible deniability)
- [ ] Hidden meaning is risky (leverage shift)
- [ ] Signals exist (timing/pivot/repetition/body focus)
- [ ] Outcome creates residue (debt/suspicion/commitment)

## Anti-pattern checks
- [ ] Not cryptic for its own sake
- [ ] Not sarcasm-only
- [ ] Not a riddle that blocks action`,

  "TEMPLATES.md": `# Subtext Templates

## Template A: Polite threat
Surface:
> “I’d hate for this to become complicated.”
Intent:
> (If you refuse, I will escalate.)
Concrete consequence:
> “If you make me come back, I won’t come alone.”

## Template B: Conditional offer (proof gate)
> “If you’re serious, bring me [PROOF]. Then we talk.”

## Template C: Strategic omission
> “We don’t use that word here.”  
> “Then what do you call it?”  
> “[ALTERNATE SAFE TERM].”

## Template D: Answer-with-a-question
> “Why would you ask me that?”  
> (Signals danger + tests your story.)`,

  "EXAMPLES.md": `# Subtext Examples

## Example 1: Witness constraint forces indirection
> “Busy night,” the guard says, smiling at the open street behind you.  
> “Always,” you answer.  
> “Funny. The ledger says otherwise.”  
> He doesn’t say your name. He doesn’t need to. The way he taps the book is the accusation.

## Example 2: Conditional offer creates a quest-like hook
> “I can introduce you.”  
> “To whom?”  
> “To someone who hates surprises.”  
> She slips a blank card across the table. “Bring it back with his seal on it. Then I’ll say the name out loud.”`,
});

const WRITING_FORESHADOWING_PACK = pack("writing-foreshadowing", {
  "SKILL.md": `---
name: writing-foreshadowing
description: Foreshadow via constraints, residue, and repeated carriers—without prophecy dumps.
---

# Foreshadowing (Constraints + Residue + Payoff)

Good foreshadowing is a promise made quietly and paid loudly.
It creates anticipation without stealing agency.

## When to use
- Payoffs feel random (“where did that come from?”).
- You need setup for a twist, faction move, or reveal.
- Readers forget important constraints because they were mentioned once.

## Quick start (seed a payoff in 3 layers)
For an upcoming payoff, plant:
1) a rule (constraint or taboo)
2) a carrier (object/sound/ritual that repeats)
3) a cost signal (why the rule matters)

Then schedule the payoff: 2–5 turns later.

## Level 1: The seed must be operational
Seeds work when they can be used:
- a door that sticks (later: needs force; leaves residue)
- a legal seal requirement (later: permit matters)
- a superstition that changes behavior (later: crowd reacts)

## Level 2: Repetition-with-variation (not repetition)
Repeat the carrier in changing contexts:
- bell heard far away → bell too close → bell stopped
The repetition teaches the rule; the variation adds meaning.

## Level 3: Use contrast as a signal
Foreshadow by showing “wrongness” against routine:
- the guard checks seals, except this time he doesn’t
- the market closes at dusk, except one stall stays open

## Level 4: Payoff mechanics (earned reveal)
When paying off:
- show the mechanism
- enforce the cost
- leave residue for future turns

## Level 5: Misdirection (fair)
Misdirection is allowed if:
- the seed still makes sense in retrospect
- there was a testable alternative interpretation

## Anti-patterns
- prophecy text that explains the twist
- “symbol” with no operational meaning
- a seed mentioned once and forgotten

Next: CHECKLIST.md and TEMPLATES.md.`,

  "CHECKLIST.md": `# Foreshadowing Checklist

- [ ] Seed is operational (changes action/cost/risk)
- [ ] Carrier exists (object/sound/ritual/phrase)
- [ ] Cost signal exists (why it matters)
- [ ] Repetition-with-variation occurs (2+ times)
- [ ] Payoff shows mechanism and enforces cost
- [ ] Payoff leaves residue for later turns

## Anti-pattern checks
- [ ] Not a prophecy dump
- [ ] Not a one-time mention
- [ ] Not a meaningless symbol`,

  "TEMPLATES.md": `# Foreshadowing Templates

## Template A: Seed card (internal)
- Upcoming payoff:
- Rule/constraint:
- Carrier:
- Cost signal:
- First seed scene:
- Second echo scene:
- Payoff scene:

## Template B: Routine → exception
Routine:
> In this place, [ROUTINE RULE].
Exception:
> Today, [EXCEPTION EVIDENCE]. That suggests [HIDDEN PRESSURE].

## Template C: Carrier escalation ladder
- far: [CARRIER] is distant/harmless
- near: [CARRIER] is closer/stranger
- now: [CARRIER] changes/stops/breaks (payoff)`,

  "EXAMPLES.md": `# Foreshadowing Examples

## Example 1: Legal constraint foreshadows a gate
> Every permit in this district carries a wax seal—thick, dark, and always stamped twice. The clerk checks them by touch more than sight, like he’s learned to feel for fakes. When your turn comes, his thumb pauses on the paper a heartbeat longer than it should.  
> (Later payoff: you’re stopped; the missing second stamp becomes the mechanism.)

## Example 2: Carrier repetition-with-variation
> The temple bell rings once at dusk. The first night, it’s just a sound. The second night, you notice every conversation stops for it. The third night, the bell doesn’t ring—and everyone pretends not to hear the silence.`,
});

const WRITING_SUSPENSE_PACK = pack("writing-suspense", {
  "SKILL.md": `---
name: writing-suspense
description: Build suspense through questions, constrained information, and paid delays (without stalling).
---

# Suspense (Questions + Delays + Pressure)

Suspense is not “withholding everything.” Suspense is:
- a question the player can try to answer
- delay that costs something
- pressure that keeps moving while you wait

## When to use
- Scenes feel flat even when stakes are high.
- Reveals happen immediately (no anticipation).
- Withholding turns into frustration (no testable path).

## Quick start (Q → T → C)
For the next beat, define:
1) Question: what’s uncertain?
2) Test: what action can reduce uncertainty?
3) Cost: what will the test cost (time/exposure/debt)?

Then write the beat so the cost is legible.

## Level 1: Question types (pick one)
- identity: who/what is it?
- rule: what triggers it?
- intent: what do they want?
- cost: what will it take from me?

## Level 2: Delay must be paid
Delay sources:
- procedure (forms, seals, waiting rooms)
- distance (travel, obstacles)
- social friction (gates, favors, pride)
- environmental friction (dark, cold, noise)

If delay is free, the player will always delay.

## Level 3: Information gradients (not binary)
Give partial signals:
- sound without source
- trace without culprit
- motive without method

Partial signals support tests and choice.

## Level 4: Dramatic irony (optional, careful)
Let the audience know something the character doesn’t, but:
- keep the testable path intact
- don’t remove agency (no “inevitable doom”)

## Level 5: Payoff cadence
Alternate:
- tension beat (question opens)
- progress beat (test yields partial answer)
- consequence beat (cost lands)

## Anti-patterns
- endless delay with no tests
- mystery box where no actions matter
- constant cliffhangers that never pay

Next: CHECKLIST.md and TEMPLATES.md.`,

  "CHECKLIST.md": `# Suspense Checklist

- [ ] A clear question exists (identity/rule/intent/cost)
- [ ] A testable action exists (not just “wait”)
- [ ] Delay is paid (time/exposure/debt/friction)
- [ ] Partial signals exist (gradient, not binary)
- [ ] Costs land (consequence beat)
- [ ] Payoffs occur regularly (avoid infinite cliffhangers)

## Anti-pattern checks
- [ ] Not stalling
- [ ] Not untestable mystery box
- [ ] Not cliffhanger spam`,

  "TEMPLATES.md": `# Suspense Templates

## Template A: Q → T → C beat
Question:
> [WHAT’S UNCLEAR]
Test:
> You can test it by [ACTION].
Cost:
> Doing so will likely cost [TIME/EXPOSURE/DEBT].

## Template B: Partial signal menu
- sound: a step stops, then resumes elsewhere
- trace: warm wax, fresh ash, wet cuffs
- social: wrong title used, refusal to say a noun
- institutional: a ledger page turned, a stamp withheld

## Template C: Tension/progress/consequence cadence
1) Tension: question opens
2) Progress: test yields partial answer
3) Consequence: cost lands (residue + reaction)`,

  "EXAMPLES.md": `# Suspense Examples

## Example 1: Paid delay (procedure)
> The clerk doesn’t refuse. He smiles and reaches for a stamp. Then he reaches for a second stamp—smaller, kept under the counter.  
> “That one takes time,” he says pleasantly.  
> You can wait and stay invisible, or you can insist and become memorable.

## Example 2: Partial signal invites a test
> The corridor smells of something sweet over something sharp. Perfume over sweat. Someone tried to cover fear. The question isn’t “is someone here?” It’s “who’s trying to be forgotten?”`,
});

const WRITING_MULTI_CHARACTER_SCENES_PACK = pack("writing-multi-character-scenes", {
  "SKILL.md": `---
name: writing-multi-character-scenes
description: Run multi-character scenes with clear staging, distinct voices, and controlled turn economy.
---

# Multi‑Character Scenes (Staging + Turn Economy + Voice)

Multi-character scenes fail when:
- readers lose track of who is where
- speakers merge into one voice
- dialogue becomes a queue of lines without pressure

This skill makes group scenes *playable*:
- space constrains who can act/hear
- turns have purpose (intent + cost + signal)
- spotlight rotates naturally

## When to use
- 3+ characters in one room and the scene feels muddy.
- Readers can’t track gaze, distance, or who heard what.
- Everyone responds to everything (no filtering).

## Quick start (the 3 anchors + the 3 lanes)
Before writing, set:
1) **Spatial anchors**: one landmark, one exit, one contested object.
2) **Power anchors**: who has authority, who has leverage, who is exposed.
3) **Conversation lanes** (choose 2–3):
   - public lane (safe to say out loud)
   - private lane (whispers, notes, signals)
   - procedural lane (forms, rules, “who signs this?”)

Then write 8–12 lines where each line belongs to a lane.

## Level 1: Staging in three facts (repeat lightly)
Every 2–3 paragraphs, re-anchor with 1–3 facts:
- who is nearest to the exit
- who controls the contested object (ledger, key, weapon)
- who can overhear whom (reach: earshot / line-of-sight)

## Level 2: Assign roles (so voices don’t merge)
Give each participant one temporary role:
- blocker (says no / enforces procedure)
- translator (interprets / reframes)
- escalator (raises stakes)
- defuser (buys time / offers relief)
- witness (records / spreads rumor)

Roles can shift mid-scene when leverage shifts.

## Level 3: Turn economy (not everyone reacts)
Default rules:
- Only the **threatened** reacts immediately.
- Only the **interested** asks follow-ups.
- The **powerful** often delays (silence is a move).

If everyone reacts to every line, the scene becomes noise.

## Level 4: Information routing (who learns what)
Track knowledge as routing, not as universal narration:
- public statements affect everyone
- private statements create alliances and misunderstandings
- procedural statements create records and residue

## Level 5: Group pressure mechanics
Add one pressure that affects the group:
- time window (closing hour)
- audience (crowd, guards)
- traceability (ledger/logs)

Pressure forces characters to take positions.

## Anti-patterns
- “round-robin” dialogue with equal weight
- geometry-free rooms where secrets are free
- every character speaks in the narrator’s cadence

Next: CHECKLIST.md and TEMPLATES.md.`,

  "CHECKLIST.md": `# Multi‑Character Scenes Checklist

- [ ] Spatial anchors set (landmark/exit/contested object)
- [ ] Power anchors set (authority/leverage/exposure)
- [ ] 2–3 conversation lanes used (public/private/procedural)
- [ ] Re-anchoring facts appear every 2–3 paragraphs
- [ ] Not everyone reacts to everything (turn economy)
- [ ] Information routing is respected (public vs private vs record)
- [ ] One group pressure is active (time/audience/traceability)`,

  "TEMPLATES.md": `# Multi‑Character Scenes Templates

## Template A: Scene card (internal)
- Landmark:
- Exit:
- Contested object:
- Authority:
- Leverage:
- Exposure:
- Lanes in play:
- Group pressure:

## Template B: Lane tags (in your head)
- Public: safe line that changes the room
- Private: whispered line that changes alliances
- Procedural: line that creates a record or gate

## Template C: Turn economy prompts
- “Who is most threatened by that?”
- “Who benefits from staying silent?”
- “What does the witness record?”`,

  "EXAMPLES.md": `# Multi‑Character Scenes Examples

## Example: Public/private/procedural lanes
> The clerk’s desk sits between you and the open street like a stage. The ledger is on his right, the stamp on his left, and the guard by the window watches hands, not faces.  
> “Name,” the clerk says (procedural).  
> “We’re not here to cause trouble,” you say (public).  
> The fixer beside you doesn’t speak. She slides a folded note across the desk with two fingers, like it might burn (private).  
> The guard shifts—one step, small, toward the stamp (pressure).  
> The clerk reads the note without moving his eyes. Then he says, out loud, “We’re closed” (public).  
> But his pen touches the ledger anyway (procedural residue).`,
});

const WRITING_RECAP_WITHOUT_REPETITION_PACK = pack("writing-recap-without-repetition", {
  "SKILL.md": `---
name: writing-recap-without-repetition
description: Remind the reader/player without re-telling: activate memory via residue, goals, and constraints.
---

# Recap Without Repetition (Residue + Goals + Constraints)

Recaps fail when they:
- re-tell plot instead of re-activating priorities
- slow pacing with paragraphs of “as you know”
- repeat nouns without changing stakes

This skill uses **activation**, not summary:
- surface what matters *now*
- tie it to a constraint (cost/risk)
- point to the next test/action

## When to use
- A session/scene returns after a break.
- The player seems lost about goals, debts, or clocks.
- You need to reintroduce a name/place/object without exposition.

## Quick start (3-line activation)
Use three short lines:
1) **Goal**: what you’re trying to do.
2) **Residue**: what’s still true because of prior actions.
3) **Constraint**: what makes it costly now.

Then ask for a choice.

## Level 1: Recap what changes decisions
Recap targets:
- objectives (what “done” means)
- deadlines (clocks, windows)
- debts/obligations (who you owe / who owes you)
- missing information (the sharp question)

Avoid: travel montage, unrelated lore, emotional restatement.

## Level 2: Recap via objects (carry memory in a prop)
Use a carrier:
- stamped permit
- cracked wax seal
- bruised ribs
- borrowed token

One prop can recall an entire thread without narration.

## Level 3: Recap via constraints (why it matters now)
Constraints convert memory into urgency:
- “curfew in one hour”
- “your name is in the ledger”
- “the ally expects repayment”

## Level 4: Recap via contradictions (mystery activation)
Use one contradiction to re-open inquiry:
- “the ink is the wrong shade”
- “the door was locked, but the latch is scratched”

## Level 5: Keep recaps interactive
End recaps with a menu:
- act now (risk exposure)
- verify (pay time)
- leverage (pay debt/moral cost)

## Anti-patterns
- narrator paragraph explaining the last 5 turns
- dialogue exposition (“as we discussed earlier…”)
- recap that doesn’t change the next decision

Next: CHECKLIST.md and TEMPLATES.md.`,

  "CHECKLIST.md": `# Recap Without Repetition Checklist

- [ ] Recap includes goal + residue + constraint (short)
- [ ] Recap focuses on decision-relevant state (deadlines/debts/questions)
- [ ] Uses a carrier (object/injury/token) when possible
- [ ] Includes one concrete contradiction or constraint
- [ ] Ends with an interactive menu (act/verify/leverage)
- [ ] Avoids plot re-telling and lore dumping`,

  "TEMPLATES.md": `# Recap Without Repetition Templates

## Template A: 3-line activation
> Goal: [OBJECTIVE].  
> Residue: [WHAT’S STILL TRUE].  
> Constraint: [WHY IT’S COSTLY NOW].  
> What do you do?

## Template B: Prop carrier recap
> The [PROP] is still [VISIBLE DETAIL]. It means [THREAD].  
> Using it now will cost [COST].

## Template C: Menu recap
- Act now: [METHOD] (risk: exposure)
- Verify: [TEST] (cost: time)
- Leverage: [MOVE] (cost: debt/moral)`,

  "EXAMPLES.md": `# Recap Without Repetition Examples

## Example: Activate three threads fast
> You’re here to recover the missing ledger page.  
> Your name is already written down—in the wrong ink.  
> The market closes in thirty minutes, and the guard is watching hands.  
> Do you push for access now, verify the stamp trail, or spend a favor to skip procedure?`,
});

const WRITING_TWIST_FAIRNESS_PACK = pack("writing-twist-fairness", {
  "SKILL.md": `---
name: writing-twist-fairness
description: Write twists that feel surprising yet inevitable: seeds, constraints, and retrospect clarity.
---

# Twist Fairness (Surprise + Retrospect Clarity)

A twist feels “cheap” when it:
- contradicts established constraints
- invalidates earlier evidence
- relies on hidden narrator knowledge

A fair twist:
- is seeded as operational detail
- changes the meaning of earlier residue (without deleting it)
- produces a new constraint and a new choice

## When to use
- You want a reveal that reframes motives, identity, or the rules.
- Players distrust reveals (“you’re just making it up”).
- You’re tempted to hide all evidence until the twist.

## Quick start (Seed → Alternative → Trigger)
For a planned twist, define:
1) **Seed**: an operational detail that supports both interpretations.
2) **Alternative**: a plausible surface explanation.
3) **Trigger**: the moment evidence becomes unavoidably specific.

Schedule the trigger 2–6 turns after the seed.

## Level 1: Seed must be useful in the moment
Seeds work best when they matter now:
- a seal check (procedural)
- a route closed (logistics)
- a taboo word (social)

If the seed is useless until the twist, it reads as author trickery.

## Level 2: Maintain two live interpretations
Early, allow two explanations:
- mundane (boring but plausible)
- hidden (true but not provable yet)

Let the player act under either model.

## Level 3: The twist is a constraint, not just a fact
After the reveal, something becomes harder:
- access changes
- procedure tightens
- trust fractures
- a clock accelerates

If nothing changes, the twist is decoration.

## Level 4: Retrospective clarity test
After writing, ask:
- Which earlier details now read differently?
- Do any earlier scenes become nonsensical?

If a scene becomes nonsensical, the twist is not fair.

## Level 5: Pay the costs
Twists should create residue:
- someone reacts
- a record changes
- an obligation becomes active

## Anti-patterns
- “secret twin” with no prior operational evidence
- “it was all a dream”
- twist that erases consequences

Next: CHECKLIST.md and TEMPLATES.md.`,

  "CHECKLIST.md": `# Twist Fairness Checklist

- [ ] Seed is operational (useful before twist)
- [ ] Two interpretations are plausible early
- [ ] Trigger evidence becomes specific (not narrator announcement)
- [ ] Twist creates a new constraint and a new choice
- [ ] Earlier evidence remains valid (reframed, not deleted)
- [ ] Twist produces residue (reaction/record/debt/clock)`,

  "TEMPLATES.md": `# Twist Fairness Templates

## Template A: Twist card (internal)
- Twist:
- Seed (operational):
- Surface alternative:
- Trigger evidence:
- New constraint after reveal:
- Residue + reaction:

## Template B: Seed line (dual-use)
> [DETAIL] is odd, but explainable—if you assume [SURFACE MODEL].

## Template C: Trigger line (unavoidable specificity)
> The [EVIDENCE] is too exact to ignore. The surface model breaks.`,

  "EXAMPLES.md": `# Twist Fairness Examples

## Example: Procedural twist (stamp logic)
> Seed: the clerk always stamps twice, by habit and by rule.  
> Alternative: “He’s just meticulous.”  
> Trigger: a permit appears with the right seal but the wrong *pressure mark*—the stamp was pressed by a different hand.  
> Reveal: the clerk is being impersonated.  
> Constraint: now every interaction leaves a trace; trust shifts; the surveillance clock accelerates.`,
});

const WRITING_MULTI_THREAD_PLOT_CONTROL_PACK = pack("writing-multi-thread-plot-control", {
  "SKILL.md": `---
name: writing-multi-thread-plot-control
description: Control multiple plot threads with clear state, escalation, and fair interleaving—without confusion or stalls.
---

# Multi‑Thread Plot Control (Threads + Interleaving + Payoffs)

Multi-thread plots fail when:
- threads are forgotten for too long
- reveals land without setup in the active thread
- interleaving feels random (no causal handoffs)

This skill treats threads as *state machines*:
- each thread has a question, pressure, and residue
- interleaving follows pressure, not author whim
- payoffs are scheduled and earned

## When to use
- You have 2+ ongoing threads (case, relationship, faction, survival).
- You keep “checking in” without changing anything.
- Readers forget why a thread matters or what changed last.

## Quick start (Thread cards + one handoff)
Create 2–4 internal thread cards:
- Question: what is unresolved?
- Pressure: why does it matter now?
- Current state: what is true right now?
- Next test: what action can advance it?
- Residue: what trace exists that can trigger reactions?

Then, at the end of the current scene, add a *handoff hook* that naturally pulls to another thread.

## Level 1: Threads need three invariants
Every thread should always have:
1) a sharp question (answerable)
2) a pressure vector (time/exposure/debt/scarcity)
3) a residue vector (record/witness/damage/obligation)

If a thread lacks these, it becomes “lore.”

## Level 2: Interleaving rules (when to switch)
Switch because of:
- pressure: a deadline approaches
- residue: a reaction arrives (letter, guard, rumor)
- opportunity: a window opens (contact available)

Avoid switching just because “it’s been a while.”

## Level 3: The handoff bridge (causal linking)
Use a bridge sentence that:
- references residue
- introduces a constraint
- implies an action

Example pattern:
> The ledger entry isn’t just ink. It’s an address—and it’s already being read.

## Level 4: Avoid thread stalls (no “status check” scenes)
A thread scene must change at least one:
- information (signal learned)
- access (door opened/closed)
- pressure (clock advanced/reduced)
- relationship (debt created/paid)

If nothing changes, cut it or compress it.

## Level 5: Payoff scheduling (setup echoes)
For major payoffs:
- seed (operational detail)
- echo (variation)
- trigger (unavoidable specificity)
Keep the payoff within 2–8 turns unless it’s an arc-level shadow.

## Anti-patterns
- switching threads without a causal bridge
- “check-in” scenes that don’t change state
- payoffs that ignore earlier constraints

Next: CHECKLIST.md and TEMPLATES.md.`,

  "CHECKLIST.md": `# Multi‑Thread Plot Control Checklist

- [ ] 2–4 thread cards exist (question/pressure/state/test/residue)
- [ ] Each thread has invariants (question + pressure + residue)
- [ ] Switches are motivated (pressure/residue/opportunity)
- [ ] Each thread scene changes state (info/access/pressure/debt)
- [ ] Handoff bridge uses residue + constraint + implied action
- [ ] Payoffs are scheduled (seed/echo/trigger)`,

  "TEMPLATES.md": `# Multi‑Thread Plot Control Templates

## Template A: Thread card
- Name:
- Question:
- Pressure:
- State:
- Next test:
- Residue:
- Likely reaction (1–3 turns):

## Template B: Handoff bridge
> [RESIDUE] means [CONSTRAINT]. If you ignore it, [PRESSURE] advances.

## Template C: Interleaving prompts
- “Which thread has the closest deadline?”
- “Which residue would realistically trigger a reaction now?”
- “Which opportunity window is open?”`,

  "EXAMPLES.md": `# Multi‑Thread Plot Control Examples

## Example: Causal switch, not random cut
> You leave the office with the stamp imprint on your fingers like guilt. Outside, a boy on a bicycle circles twice and then stops, pretending he was always there. He doesn’t speak your name. He shows you the folded paper with your name written on it.  
> Thread switch: the faction thread activates because the **residue** (ledger entry) is being read.

## Example: Thread scene changes state
> Relationship thread: you don’t “check in.” You pay a debt or create a new one. Even a quiet conversation ends with a commitment that will be collected later.`,
});

const WRITING_POV_DISCIPLINE_PACK = pack("writing-pov-discipline", {
  "SKILL.md": `---
name: writing-pov-discipline
description: Maintain POV discipline: what can be known, how it’s inferred, and how to avoid mind-reading while staying vivid.
---

# POV Discipline (Perception + Inference + Limits)

POV discipline is how you keep narration fair and immersive:
- you show what the POV can perceive
- you label inference as inference (not fact)
- you avoid mind-reading and omniscient leaks

This is not about being dry. It’s about *credible access*.

## When to use
- The narration “knows” what NPCs think without evidence.
- Scenes feel inconsistent (sometimes omniscient, sometimes limited).
- Emotional beats rely on interior claims instead of observable cues.

## Quick start (PIL)
For the next paragraph, enforce:
1) Perception: what is seen/heard/felt
2) Inference: what the POV concludes (with a signal)
3) Limit: what remains unknown (and a test path)

## Level 1: Access tiers (choose your rules)
Common tiers:
- strict limited: only POV perceptions + inferences
- limited with memory: includes recalled facts and biases
- cinematic limited: clean sensory camera with minimal inference

Pick one per project; don’t drift mid-scene.

## Level 2: Inference language (stay honest)
Use inference markers:
- “seems,” “as if,” “probably,” “you can’t tell if”
But anchor them to signals:
- timing, gaze, hesitations, procedures, residue

## Level 3: Replace mind-reading with evidence
Mind-reading:
- “He is terrified.”
Evidence-based:
- “He answers too fast, then swallows without drinking.”

## Level 4: Information routing (who knows what)
Track knowledge:
- what the POV has witnessed
- what the POV has been told (and by whom)
- what exists as records (ledger/log)

If a fact appears, decide how the POV got it.

## Level 5: POV as character (bias and misread)
POV can misread. Make misreads:
- plausible
- costly
- correctable by tests

Misread is a tool; don’t use it as an excuse for inconsistency.

## Anti-patterns
- omniscient leaks (“he thought…” with no access)
- emotional assertions without signals
- facts appearing with no source

Next: CHECKLIST.md and TEMPLATES.md.`,

  "CHECKLIST.md": `# POV Discipline Checklist

- [ ] POV tier is consistent in the scene
- [ ] Claims about others are evidence-based (signals)
- [ ] Inferences are marked and anchored (“seems” + why)
- [ ] Knowledge routing is respected (witnessed/told/record)
- [ ] Unknowns remain (and test paths exist)
- [ ] Misreads are plausible and correctable`,

  "TEMPLATES.md": `# POV Discipline Templates

## Template A: PIL paragraph scaffold
Perception:
> [SENSORY FACT]
Inference:
> [INFERENCE] (because [SIGNAL]).
Limit:
> You can’t know [UNKNOWN] unless you [TEST].

## Template B: Evidence menu for emotion
- timing: too fast / too slow
- gaze: exits / hands / floor
- procedure: stamp hesitation / ledger turn
- body: dry mouth / shallow breath / repeated gesture

## Template C: Knowledge source note (internal)
Fact: [FACT]
Source: witness / rumor / record / deduction`,

  "EXAMPLES.md": `# POV Discipline Examples

## Example: Inference anchored to procedure
> The clerk’s pen pauses above the ledger when you say the dockmaster’s name. He doesn’t look up, but the pause is real—measurable. He seems to be deciding whether writing your question down is safer than answering it. You can’t know who he’s afraid of unless you force the issue and watch what he does next.`,
});

const WRITING_SCENE_OBJECTIVES_PACK = pack("writing-scene-objectives", {
  "SKILL.md": `---
name: writing-scene-objectives
description: Design scenes with objectives, obstacles, and turn-level state changes—so scenes don’t meander.
---

# Scene Objectives (Objective + Obstacle + Outcome)

Scenes drift when they lack:
- a concrete objective
- an obstacle that forces method choice
- an outcome that changes state

This skill makes every scene a decision container:
- objective is testable
- obstacles provide 2+ methods
- the end produces residue and a new edge

## When to use
- Scenes feel like “hanging out” with no movement.
- Dialogue exists but doesn’t change access or pressure.
- You end scenes without a clear hook.

## Quick start (OOO)
Before writing a scene, define:
1) Objective: what does “success” look like (concrete)?
2) Obstacle: what blocks easy success (2–3 gates)?
3) Outcome: what changes even if they fail (residue + reaction)?

Then open the scene with anchor + pressure + objective.

## Level 1: Objectives must be testable
Bad: “learn about the city”
Good: “get the permit stamped twice”

If you can’t define success, the scene can’t end cleanly.

## Level 2: Obstacles should offer multiple methods
Obstacle types:
- identity gate (credential)
- attention gate (witness/guard)
- geometry gate (locked door, distance)
- record gate (logs/ledger)

For each obstacle, offer at least two methods:
- social / stealth / force / knowledge

## Level 3: Outcomes should land regardless
Even failure changes state:
- clock advances
- exposure increases
- debt is created
- access shifts

No “nothing happens.”

## Level 4: Scene ends with an unresolved edge
End with:
- a new question
- a new obligation
- a tighter clock
- a contradiction that demands a test

## Level 5: Scene economy (compress or cut)
If a scene doesn’t change:
- information
- access
- pressure
- relationships
Compress it into one paragraph or remove it.

## Anti-patterns
- scenes with no objective (“vibes only”)
- obstacles with one obvious solution
- endings that reset stakes

Next: CHECKLIST.md and TEMPLATES.md.`,

  "CHECKLIST.md": `# Scene Objectives Checklist

- [ ] Objective is concrete and testable
- [ ] 2–3 obstacles exist (gates)
- [ ] Obstacles have multiple methods (social/stealth/force/knowledge)
- [ ] Outcome changes state even on failure (cost + residue)
- [ ] Scene ends with an unresolved edge (hook)
- [ ] Scene justifies its existence (changes info/access/pressure/relationship)`,

  "TEMPLATES.md": `# Scene Objectives Templates

## Template A: Scene card
- Objective:
- Pressure:
- Obstacles (gates):
- Methods:
- Costs:
- Outcome state change:
- Residue + reaction:
- End hook:

## Template B: Opening lines
> [ANCHOR]. [PRESSURE EVIDENCE]. You need to [OBJECTIVE]—but [OBSTACLE] makes it costly.

## Template C: End hook menu
- new debt
- tighter clock
- contradiction
- access shift`,

  "EXAMPLES.md": `# Scene Objectives Examples

## Example: Objective forces choice
> Objective: get a document stamped twice.  
> Obstacles: guard watches hands (attention), clerk demands name (record), stamp kept behind counter (geometry).  
> Methods: talk (debt), distract (residue), steal (heat), verify (time).  
> Outcome: even if you fail, your name becomes attached to the attempt in someone’s ledger.`,
});

const WRITING_ARC_MILESTONES_PACK = pack("writing-arc-milestones", {
  "SKILL.md": `---
name: writing-arc-milestones
description: Plan arcs with milestone beats that change state: setup, escalation, reversal, commitment, payoff, aftermath.
---

# Arc Milestones (State Changes Across Acts)

Arcs feel satisfying when they are a chain of *state changes*:
- new access gained/lost
- debts created/paid
- rules learned/paid off
- alliances formed/broken

This skill converts “plot outline” into **milestones** that are:
- testable (you can tell if it happened)
- consequence-bearing (residue + reactions)
- paced (no endless middle)

## When to use
- The story has a beginning but the middle drifts.
- “Big moments” happen but don’t change future constraints.
- You have multiple threads and need a shared arc spine.

## Quick start (6 milestones)
Define 6 milestone beats for the arc:
1) **Hook**: pressure appears, objective becomes legible
2) **Gate**: first real obstacle (identity/attention/record/geometry)
3) **Escalation**: clock advances or costs rise
4) **Reversal**: the surface model breaks (new rule, betrayal, evidence)
5) **Commitment**: a point of no return (debt, oath, exposure, injury)
6) **Payoff + Aftermath**: payoff enforces cost; institutions react

Then schedule them across 8–20 turns (adjust to your game’s cadence).

## Level 1: Milestones must be operational
Each milestone should change at least one:
- access (door, permit, invitation)
- pressure (heat, deadline)
- information (rule clarified)
- relationship (debt/ally/enemy)

## Level 2: Each milestone needs residue
Residue types:
- record: ledger, log, stamp
- witness: rumor carriers
- damage: physical or procedural

Residue is what lets later milestones feel earned.

## Level 3: Escalation is a ladder, not a spike
Increase one axis at a time:
- time window shrinks
- surveillance tightens
- resources run low
Avoid raising everything at once.

## Level 4: Reversals must keep earlier evidence valid
A good reversal reframes earlier facts without deleting them.
If earlier scenes become nonsense, the arc is unfair.

## Level 5: Aftermath is part of the payoff
Aftermath is not “cooldown.” It is:
- procedure changes
- new debts
- new constraints

## Anti-patterns
- milestones that are only emotional declarations with no state change
- escalation that resets between scenes
- payoffs without institutional reaction

Next: CHECKLIST.md and TEMPLATES.md.`,

  "CHECKLIST.md": `# Arc Milestones Checklist

- [ ] Hook makes objective + pressure legible
- [ ] Gate introduces a real constraint (gates)
- [ ] Escalation advances a clock or raises costs
- [ ] Reversal breaks the surface model (new rule/evidence)
- [ ] Commitment creates a point of no return (debt/oath/exposure)
- [ ] Payoff enforces cost and produces aftermath (reaction)
- [ ] Each milestone leaves residue (record/witness/damage)`,

  "TEMPLATES.md": `# Arc Milestones Templates

## Template A: Arc card (6 milestones)
- Hook:
- Gate:
- Escalation:
- Reversal:
- Commitment:
- Payoff + Aftermath:

## Template B: Milestone spec
Milestone: [NAME]
- State change:
- Residue:
- Reaction horizon (immediate/near/long):
- Next test unlocked:`,

  "EXAMPLES.md": `# Arc Milestones Examples

## Example: Investigation arc spine
Hook: missing ledger page matters because curfew closes the market.  
Gate: identity gate (wrong seal) blocks access.  
Escalation: surveillance clock advances after repeated questions.  
Reversal: a permit looks correct but the pressure mark proves impersonation.  
Commitment: you borrow an identity (debt) to enter the archive.  
Payoff + Aftermath: you get the page, but your name enters a new record; procedures tighten.`,
});

const WRITING_RELIABLE_NARRATION_PACK = pack("writing-reliable-narration", {
  "SKILL.md": `---
name: writing-reliable-narration
description: Keep narration reliable: distinguish observation from inference, track sources, and avoid retroactive contradiction.
---

# Reliable Narration (Observation + Source + Consistency)

Reliable narration is fairness:
- readers can trust what was shown
- surprises reframe facts instead of deleting them
- information appears with a clear source

This skill is compatible with limited POV and with intentional misdirection—if it’s done honestly.

## When to use
- Readers feel “the author is making it up.”
- Details change between scenes (rooms, names, rules).
- You want twists without breaking trust.

## Quick start (OSC)
For each important fact you write, decide:
1) Observation: what is directly perceived?
2) Source: how is this known (witness/record/rule/test)?
3) Consistency: what will this constrain later?

If you can’t answer source/consistency, the fact is fragile.

## Level 1: Separate observation from inference
Observation:
- “The clerk’s pen pauses.”
Inference:
- “He seems afraid.”

Inferences must be anchored to signals; otherwise they read as mind-reading.

## Level 2: Track sources for key facts
Sources:
- witnessed in-scene
- learned via dialogue (and who said it)
- read in records (ledger/log)
- tested experimentally (rule learned)

If a later scene needs a fact, either plant the source earlier or make discovering it a costed action.

## Level 3: Consistency checks (no retroactive contradiction)
For recurring elements, lock:
- names/titles
- geography (exits, distances)
- rules (what triggers what)
- institutional procedures (who stamps, who logs)

If a rule changes, show the mechanism that changed it (policy update, new guard, tightened procedure).

## Level 4: Honest misdirection
Misdirection is allowed if:
- earlier observations remain true
- the alternative interpretation was plausible
- the reveal adds constraints and choices

## Level 5: Continuity as residue
Continuity is carried by residue:
- records, witnesses, damage, obligations
If residue exists, the world remembers.

## Anti-patterns
- facts appearing “because later plot needs it”
- changing constraints without showing cause
- narrator certainty about other minds

Next: CHECKLIST.md and TEMPLATES.md.`,

  "CHECKLIST.md": `# Reliable Narration Checklist

- [ ] Observation vs inference is distinguished
- [ ] Key facts have sources (witness/dialogue/record/test)
- [ ] Recurring elements are consistent (names/space/rules)
- [ ] Rule changes are causal and shown (policy, actor, mechanism)
- [ ] Misdirection keeps earlier facts true
- [ ] Residue persists (world remembers)`,

  "TEMPLATES.md": `# Reliable Narration Templates

## Template A: Fact note (internal)
Fact: [FACT]
- Source:
- Evidence shown:
- Future constraints:

## Template B: Inference honesty line
> It looks like [INFERENCE], but you can’t be sure unless you [TEST].

## Template C: Rule-change mechanism
> The rule didn’t change by magic. [ACTOR/INSTITUTION] changed it, and now the evidence is [EVIDENCE].`,

  "EXAMPLES.md": `# Reliable Narration Examples

## Example: Honest uncertainty
> The guard smiles, but the smile is too quick, like a door closing. He might be amused—or he might be counting witnesses. You can’t know which until you force a choice and see who he signals.

## Example: Consistent procedure pays off
> The clerk always stamps twice. When he stamps once today, that is not “mood.” It’s evidence. Something changed—and the change is actionable.`,
});

const WRITING_MICRO_GOALS_PER_TURN_PACK = pack("writing-micro-goals-per-turn", {
  "SKILL.md": `---
name: writing-micro-goals-per-turn
description: Make each turn do work: micro-goals, costs, and hooks—so momentum stays high without rushing.
---

# Micro‑Goals Per Turn (Momentum Without Filler)

Turns feel satisfying when they complete *micro-goals*:
- ask one sharp question
- test one assumption
- gain/lose one access
- pay/earn one debt

This keeps pacing tight even in slow scenes.

## When to use
- Turns feel like “more description” without progress.
- Players don’t know what to do next.
- Scenes meander because nothing completes.

## Quick start (GCS)
For the next turn, pick:
1) Goal: one micro-goal (learn, access, leverage, safety)
2) Cost: what it will cost (time/exposure/debt/resource)
3) Signal: what proves progress (evidence, reaction, new constraint)

Then end the turn with a hook (new edge).

## Level 1: Micro-goal menu (pick one)
- Clarify: learn one fact (via test)
- Unlock: open one gate (credential, access)
- Shift: change leverage (debt, threat, alliance)
- Stabilize: reduce pressure (temporary relief)

## Level 2: Costs keep it fair
If a micro-goal is achieved, pay a cost:
- time window shrinks
- exposure increases
- resource spent

## Level 3: Signals prevent ambiguity
Signals:
- a stamp lands (access gained)
- a name is written (record created)
- a door locks (constraint)

Without signals, progress feels imaginary.

## Level 4: Hooks keep continuity
End with:
- new question
- new obligation
- clock evidence
- contradiction

## Level 5: Avoid “progress spam”
Not every turn needs big change.
But every turn should change at least one:
- information, access, pressure, relationship

## Anti-patterns
- repeating the same micro-goal (ask again, wait again)
- free progress with no cost
- hooks that never pay

Next: CHECKLIST.md and TEMPLATES.md.`,

  "CHECKLIST.md": `# Micro‑Goals Per Turn Checklist

- [ ] One micro-goal is chosen (clarify/unlock/shift/stabilize)
- [ ] One cost channel is paid (time/exposure/debt/resource)
- [ ] One signal proves progress (record, access, constraint)
- [ ] Turn ends with a hook (question/debt/clock/contradiction)
- [ ] Turn changes at least one state axis (info/access/pressure/relationship)
- [ ] Avoid repeating the same micro-goal without escalation`,

  "TEMPLATES.md": `# Micro‑Goals Per Turn Templates

## Template A: Turn card
- Micro-goal:
- Method:
- Cost:
- Signal:
- Hook:

## Template B: Hook lines
- “And then you notice…”
- “But it costs you…”
- “And now someone reacts…”
- “Which means the next choice is…”`,

  "EXAMPLES.md": `# Micro‑Goals Per Turn Examples

## Example: Slow scene with real progress
> Micro-goal: learn who controls the stamp room.  
> Cost: you ask publicly (exposure).  
> Signal: the clerk writes your name in a different ink.  
> Hook: a runner outside repeats the dockmaster’s name like it’s a warning.`,
});

const WRITING_ACTION_CLARITY_PACK = pack("writing-action-clarity", {
  "SKILL.md": `---
name: writing-action-clarity
description: Write action (combat/chase/stealth) with clear geometry, costs, and consequences.
---

# Action Clarity (Combat / Chase / Stealth)

Action is clarity under pressure.
This skill keeps action legible and fair:
- the player can track positions
- cause → effect is visible
- costs accumulate
- failure leaves residue

## When to use
- Action feels like camera cuts (no geometry).
- Outcomes feel arbitrary (“it just hits/misses”).
- The player can’t tell what’s possible next.

## Quick start (one beat)
Write the next beat in this internal order:
1) anchor (where you are + nearest threat)
2) intent (what you do)
3) contact (what physically happens)
4) result (position/cost/exposure/injury changes)
5) next pressure (why you can’t pause)

## Level 1: Position updates (micro, not maps)
Use stable axes:
- door / table / window
- alley mouth / dumpster / fire escape
- ridge / boulder / ravine

Every 1–2 beats, update one axis:
- “You’re three steps from the back door now.”
- “The guard blocks the stairwell; the alley exit is still open.”

## Level 2: Costs (choose 1–2 channels)
- time (clock advances)
- injury (pain limits grip/sprint/speech)
- resources (ammo/tools/cover/allies)
- exposure (noise/witnesses/traces)

## Level 3: Partial success patterns
- success with exposure
- success with injury
- failure with information (you learn a pattern)
- failure with position loss (cornered, separated)

## Level 4: Environment as rules
If you mention a constraint, pay it off within 1–3 beats:
- slick stone changes sprinting
- narrow corridor changes weapon arcs
- echo changes stealth
- crowd density changes violence

Next: CHECKLIST.md and TEMPLATES.md.`,

  "CHECKLIST.md": `# Action Clarity Checklist

- [ ] Anchor: where you are + nearest threat
- [ ] Intent: what you attempt (verb)
- [ ] Contact: what physically happens (mechanism)
- [ ] Result: state changes (position/cost/exposure/injury)
- [ ] Next pressure: why you can’t pause
- [ ] Axis update every 1–2 beats (door/table/window etc.)
- [ ] Cost channels are consistent (1–2, not all)
- [ ] Failure creates residue the world can react to`,

  "TEMPLATES.md": `# Action Clarity Templates

## Template A: Chase beat (3–5 sentences)
Anchor:
> Ahead: [OBSTACLE/EXIT]. Behind: [THREAT DISTANCE].
Constraint:
> [SURFACE/WEATHER/CROWD] changes speed/visibility.
Cost:
> To keep pace, you pay [COST CHANNEL].
Hook:
> A fork forces a choice: [OPTION A] vs [OPTION B].

## Template B: Stealth beat (3–5 sentences)
Anchor:
> Line of sight: [WHO CAN SEE]. Sound layer: [AMBIENCE].
Intent:
> You attempt [MOVE/HIDE/DISTRACT].
Residue:
> You leave [TRACE] (scuff/breath/shadow).
Pressure:
> [WHO/WHAT] is about to notice.

## Template C: Combat beat (3–6 sentences)
Anchor:
> [DISTANCE] to [THREAT]. [COVER/EXIT] is [POSITION].
Intent:
> You [ACTION].
Contact:
> [MECHANISM: impact, slip, block, miss reason].
Result:
> [STATE CHANGE] + [COST].`,

  "EXAMPLES.md": `# Action Clarity Examples

## Example 1: Chase (axis + cost)
> The alley mouth is ten strides ahead—unless the wet stone steals one from you. Your boot skates a fraction; enough. Behind, footsteps close from “far” to “close enough to count.” If you sprint, you’ll pay in noise. If you slow down, you’ll pay in distance.

## Example 2: Stealth (residue)
> The guard’s lantern swings slow, painting the wall in a moving oval. You slip behind the hanging cloth—quiet, but not silent. Your breath catches and fogs for a second in the lantern light. If he looks up at the wrong moment, he’ll see the air before he sees you.`,
});

const WRITING_EMOTION_WITHOUT_MINDREADING_PACK = pack(
  "writing-emotion-without-mindreading",
  {
    "SKILL.md": `---
name: writing-emotion-without-mindreading
description: Convey emotion through body, perception, and consequence—without naming it.
---

# Emotion Without Mind‑Reading (Body, Perception, Consequence)

This skill is NOT permission to narrate the protagonist’s inner life.
It is how to imply emotion while keeping agency intact:
- body responses
- perception filters
- behavior constraints

## When to use
- You keep writing “you feel X.”
- Emotional beats read flat because you avoid interiority entirely.
- You need intensity without breaking the no-mind-reading rule.

## Quick start (the triad)
For the next emotional beat, pick 1–2 (not all three):
1) body (involuntary)
2) perception (what becomes sharp/blurred/loud)
3) consequence (how action becomes harder)

## Level 1: Physiological palettes (pick one)
- threat: breath shallow, skin cold, jaw tight, tunnel vision
- anger: heat in chest, pressure in temples, grip too hard, clipped words
- grief: throat tight, limbs heavy, nausea, clumsy movements
- shame: eyes avoid faces, hands busy, voice shrinks

## Level 2: Contradiction sells complexity
- laughter with a shaking hand
- politeness with a foot angled toward the door
- stillness with a pulse visible at the neck

## Level 3: Make it actionable
Emotion should change:
- what you notice
- what you can do easily
- what you risk doing publicly

Next: CHECKLIST.md.`,

    "CHECKLIST.md": `# Emotion Without Mind‑Reading Checklist

- [ ] No emotion labels (“afraid”, “angry”, “sad”)
- [ ] At least one body signal (breath, grip, temperature, tremor)
- [ ] Optional perception filter (sound narrows, lights glare, edges blur)
- [ ] Optional consequence (speech fails, grip slips, hesitation costs time)
- [ ] The beat changes a decision/risk/constraint`,

    "TEMPLATES.md": `# Emotion Without Mind‑Reading Templates

## Template A: Threat response
Body:
> [BODY SIGNAL].
Perception:
> [PERCEPTION FILTER].
Consequence:
> [ACTION BECOMES HARDER / COSTLY].

## Template B: Shame without saying “shame”
> You can’t hold eye contact. Your hands find something to fix—anything—because stillness would make you visible.

## Template C: Anger without saying “anger”
> The words come out shorter than you intended. Your grip tightens until the material complains.`,

    "EXAMPLES.md": `# Emotion Without Mind‑Reading Examples

## Example: Fear implied
> Your fingers go numb on the latch. The hallway sound narrows to a single scrape somewhere outside the door. You try to speak and the first attempt doesn’t carry.

## Example: Grief implied
> Your throat tightens around breath like it’s trying to swallow glass. Fine motor control goes first—you fumble a simple knot, and that small failure costs you more than you want to admit.`,
  },
);

const WRITING_REVEAL_CONTROL_PACK = pack("writing-reveal-control", {
  "SKILL.md": `---
name: writing-reveal-control
description: Reveal information through evidence, friction, and perspective without exposition dumps.
---

# Reveal Control (Evidence, Friction, Perspective)

This skill is NOT “withhold everything.”
It is a method to reveal information in ways that feel earned:
- through evidence
- through social friction
- through constraints and cost

## When to use
- You keep explaining world lore directly.
- Twists appear without prior residue.
- Players feel lost because nothing is legible.

## Quick start (one reveal)
Reveal one fact via:
1) channel (space/behavior/dialogue)
2) friction (cost or constraint)
3) test (how it can be verified)

## Level 1: The three channels of reveal
Prefer:
1) space: objects, traces, geometry, damage
2) behavior: tells, routines, avoidance, inconsistencies
3) dialogue: partial truth, pricing, coded language

Avoid pure narrator announcement unless the protagonist can directly observe it.

## Level 2: Reveal with friction
Information should come with a constraint:
- to learn X, you must risk Y (time, exposure, debt)

## Level 3: Make reveals testable
After a reveal, include a potential verification path.
Testability keeps agency intact and prevents “GM says so.”

## Level 4: Partial reveals preserve tension
Partial reveals are specific but incomplete:
- “The latch is scratched from the inside.”
- “The name on the receipt is wrong by one letter.”

Avoid vague partials like “something’s off.”

Next: CHECKLIST.md and EXAMPLES.md.`,

  "CHECKLIST.md": `# Reveal Control Checklist

- [ ] Reveal uses a channel (space/behavior/dialogue)
- [ ] Reveal includes friction (time/exposure/debt)
- [ ] Reveal is testable (a clear verification path)
- [ ] Partial reveals are specific (mechanism-level)
- [ ] No lore-dumps; reveal implies an action`,

  "TEMPLATES.md": `# Reveal Control Templates

## Template A: Evidence reveal
Evidence:
> [SPECIFIC RESIDUE].
Friction:
> Learning more costs [TIME/EXPOSURE/DEBT].
Test:
> To confirm, you could [ACTION].

## Template B: Social reveal (pricing)
> “I’ll tell you.”  
> Price: [COST].  
> “And if you repeat it, it becomes my problem.”`,

  "EXAMPLES.md": `# Reveal Control Examples

## Example: Partial reveal + test
> The latch is scratched from the inside—fresh. Not an accident. If you want to confirm it, you could check the hinges for matching wear, or ask the night guard who had the keys. Either way, asking will make you visible.

## Example: Reveal with friction
> The ledger shows a name that shouldn’t be there. Getting the next page will cost you: the clerk keeps the book under his hand like it’s warm. You can pay, threaten, or wait until he looks away—each with a different kind of residue.`,
});

const WRITING_SCENE_TRANSITIONS_PACK = pack("writing-scene-transitions", {
  "SKILL.md": `---
name: writing-scene-transitions
description: Transition between scenes while preserving clarity, pressure, and continuity.
---

# Scene Transitions (Continuity + Pressure)

Transitions are where playability often breaks:
- time jumps feel free
- travel has no cost
- pressure resets
- orientation is lost

This skill makes transitions do work:
- carry residue forward
- advance clocks naturally
- preserve continuity (spatial, social, institutional)

## When to use
- “Cut to” moments feel like teleportation.
- The world stops reacting between scenes.
- Travel/pauses never cost time, exposure, or resources.

## Quick start (3 questions)
Before transitioning, answer:
1) What residue follows you? (witness, injury, rumor, record)
2) What clock advanced while time passed? (surveillance, closing hours, pursuit)
3) What did it cost? (fatigue, money, exposure, missed opportunity)

Then show 1–2 concrete transition signals (sound, weather, crowd, light).

## Level 1: Re-anchor immediately
At the start of the new scene, provide:
- where you are now
- what changed since last scene
- what pressure persists

## Level 2: Even “safe” transitions should bite
Do at least one:
- advance a clock
- spend a resource
- create new residue

## Level 3: Ellipsis with evidence
If you skip time, show evidence:
- guard shift changed
- market closed
- rain stopped and left mud
- bruises stiffened

## Level 4: Don’t reset social state
People remember. Institutions remember.
Suspicion persists until paid down.

Next: CHECKLIST.md and TEMPLATES.md.`,

  "CHECKLIST.md": `# Scene Transition Checklist

- [ ] Residue carried forward (witness/record/injury/rumor)
- [ ] A clock advanced (surveillance/closing hours/pursuit)
- [ ] A cost was paid (time/exposure/money/fatigue)
- [ ] Re-anchor immediately (where/what changed/what pressure persists)
- [ ] Time skip is evidenced (shift/weather/crowd/physical change)
- [ ] Social state persists (suspicion/debt/access)`,

  "TEMPLATES.md": `# Scene Transition Templates

## Template A: Travel with cost (2–4 sentences)
> [WEATHER/SOUND] changes as you move. [BODY COST] proves time passed. When you arrive at [DESTINATION], [EVIDENCE OF CLOCK ADVANCE]. Whatever you left behind is not gone—it’s [RESIDUE].

## Template B: Cut to interior (re-anchor + pressure)
> The [LIGHT] is different here—[DETAIL]. You’re [POSITION] relative to [EXIT/THREAT]. [PRESSURE EVIDENCE] says you don’t have long.

## Template C: “Safe” transition that still bites
> You take the careful route. It costs [TIME], which means [CLOCK ADVANCE]. By the time you reach [PLACE], [NEW CONSTRAINT] is already in motion.`,

  "EXAMPLES.md": `# Scene Transition Examples

## Example: Transition carries surveillance residue
> The rain thins as you cut through side streets, but it doesn’t wash the feeling off. Your knee is stiff now—time passed, whether you wanted it or not. When you reach the market gate, the guards have swapped shifts, and the new pair doesn’t pretend not to watch you. Behind you, someone’s pace matches yours for three turns before fading. The city remembers you’re interesting.`,
});

const WRITING_OBJECT_AFFORDANCES_PACK = pack("writing-object-affordances", {
  "SKILL.md": `---
name: writing-object-affordances
description: Turn objects and environment into verbs: affordances, constraints, and clue surfaces.
---

# Object Affordances (Props That Create Play)

Objects are not decoration. They are verbs:
- what you can use
- what you can break
- what you can hide behind
- what can betray you

## When to use
- Scenes feel like dialogue in a void.
- Inventory and environment rarely matter.
- Clues appear as narrator announcements, not residues.

## Quick start (one prop)
Introduce one object with:
1) affordance (what it enables)
2) constraint (what it costs / risks)
3) residue (what it leaves if used)

## Level 1: Affordance menu
- hide: drapes, carts, crowd, smoke
- escape: ladder, back door, low window, sewer grate
- leverage: documents, seals, tokens, keys
- harm: glass, oil, fire, loose stone
- signal: bells, lanterns, mirrors, whistles

## Level 2: Constraints make props fair
Strong props should have costs:
- noise, time, breakage, social attention

## Level 3: Props as clue surfaces
Residue examples:
- warmth (handled recently)
- smears (oil/ink/blood)
- mismatched wear (hinges scratched, latch bent)
- missing pieces (seal gone, page torn)

## Level 4: Reuse props for continuity
If you introduce a prop, pay it off:
- within this turn
- or as a remembered surface later

Next: TEMPLATES.md.`,

  "CHECKLIST.md": `# Object Affordances Checklist

- [ ] Prop has an affordance (verb)
- [ ] Prop has a constraint/cost (noise/time/breakage/attention)
- [ ] Using prop creates residue (trace/witness/damage)
- [ ] Prop is testable (player can interact)
- [ ] Introduced prop is paid off within 1–3 turns or remembered`,

  "TEMPLATES.md": `# Object Affordances Templates

## Template A: Prop introduction (2 sentences)
> The [PROP] is [MATERIAL/SIGNATURE DETAIL]. It could [AFFORDANCE], but only if you accept [COST].

## Template B: Prop used (cause → residue)
> You [USE PROP]. It works—[MECHANISM]—but it leaves [RESIDUE] behind.

## Template C: Prop as clue surface
> The [PROP] shows [RESIDUE]. Someone used it [RECENCY] ago, and they weren’t careful.
Test:
> If you want to confirm, you could [ACTION].`,

  "EXAMPLES.md": `# Object Affordances Examples

## Example: Document as leverage with cost
> The stamped pass isn’t just paper—it’s jurisdiction. It could get you through the inner gate, but the wax seal is soft and fresh; if you flash it too often, someone will remember the name on it. A strong prop, but loud in the social sense.`,
});

const WRITING_INJURY_AND_FATIGUE_PACK = pack("writing-injury-and-fatigue", {
  "SKILL.md": `---
name: writing-injury-and-fatigue
description: Make injury and fatigue create constraints, costs, and tactical choices (not just gore).
---

# Injury and Fatigue (Costs That Change Play)

Injury is not flavor. It is a rules change:
- grip fails
- sprinting costs more
- speech becomes harder
- pain creates time loss and exposure

## When to use
- Damage is described but never affects choices.
- Violence feels weightless.
- Injuries appear and disappear between turns.

## Quick start (one constraint)
For any injury/fatigue beat, show:
1) mechanism (what physically changes)
2) constraint (what action becomes risky)
3) cost (time/exposure/resource)

## Level 1: Injury palettes (choose one channel)
- mobility: limp, reduced balance
- dexterity: numb fingers, trembling, grip failure
- breath: shallow breathing, coughing, speech breaks
- vision: glare sensitivity, tears, tunnel vision

## Level 2: Escalation (ignored injury worsens)
If you push through:
- performance drops
- residue increases (blood trail, limping gait, visible weakness)

## Level 3: Treatment is a tradeoff
Treating injury costs:
- time, supplies, safety, debt

## Level 4: Tactical, not melodramatic
Avoid gore spam. Prefer mechanisms and constraints.

Next: CHECKLIST.md.`,

  "CHECKLIST.md": `# Injury and Fatigue Checklist

- [ ] Mechanism exists (mobility/dexterity/breath/vision)
- [ ] Constraint exists (what becomes risky/hard)
- [ ] Cost channel exists (time/exposure/resource)
- [ ] Persists across turns (no free reset)
- [ ] Treatment is a tradeoff (time/supplies/safety/debt)
- [ ] Focus on playable consequences, not gore`,

  "TEMPLATES.md": `# Injury and Fatigue Templates

## Template A: Constraint beat
> Pain spikes when you [MOTION]. It turns “simple” into “careful,” and careful costs time.

## Template B: Treatment tradeoff
> You can stop to [TREAT], but stopping means [PRESSURE ADVANCES]. If you don’t, the injury will [ESCALATE] and leave [RESIDUE].

## Template C: Social consequence
> Your [VISIBLE SIGNAL] gives you away. Anyone watching will price you as [WEAK/INJURED], and that changes how they bargain.`,

  "EXAMPLES.md": `# Injury and Fatigue Examples

## Example: Injury as a choice constraint
> The bruise at your ribs isn’t just pain—it’s timing. Every deep breath comes a fraction late, and that fraction is enough to turn a sprint into a stumble. You can still run, but you’ll pay in noise and lost control—or you can slow down and let the distance close.`,
});

export const WRITING_SKILLS: GlobalSkillSeed[] = [
  ...WRITING_SENSORY_DETAIL_PACK,
  ...WRITING_DIALOGUE_PACK,
  ...WRITING_PACING_PACK,
  ...WRITING_SCENE_ANCHORING_PACK,
  ...WRITING_CHARACTER_VOICE_PACK,
  ...WRITING_CLUE_SEEDING_PACK,
  ...WRITING_SUBTEXT_PACK,
  ...WRITING_FORESHADOWING_PACK,
  ...WRITING_SUSPENSE_PACK,
  ...WRITING_MULTI_CHARACTER_SCENES_PACK,
  ...WRITING_RECAP_WITHOUT_REPETITION_PACK,
  ...WRITING_TWIST_FAIRNESS_PACK,
  ...WRITING_MULTI_THREAD_PLOT_CONTROL_PACK,
  ...WRITING_POV_DISCIPLINE_PACK,
  ...WRITING_SCENE_OBJECTIVES_PACK,
  ...WRITING_ARC_MILESTONES_PACK,
  ...WRITING_RELIABLE_NARRATION_PACK,
  ...WRITING_MICRO_GOALS_PER_TURN_PACK,
  ...WRITING_ACTION_CLARITY_PACK,
  ...WRITING_EMOTION_WITHOUT_MINDREADING_PACK,
  ...WRITING_REVEAL_CONTROL_PACK,
  ...WRITING_SCENE_TRANSITIONS_PACK,
  ...WRITING_OBJECT_AFFORDANCES_PACK,
  ...WRITING_INJURY_AND_FATIGUE_PACK,
];
