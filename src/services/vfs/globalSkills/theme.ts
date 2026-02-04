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

const THEME_FANTASY_PACK = pack("theme-fantasy", {
  "SKILL.md": `---
name: theme-fantasy
description: Make fantasy feel material: costs, institutions, and geography (not generic medieval wallpaper).
---

# Fantasy Theme (Material + Cost + Institutions)

Fantasy becomes distinct when it changes:
- what actions are possible
- what actions cost
- who is allowed to do them
- what residue the world records

## When to use
- Fantasy feels generic (wallpaper castles).
- Magic solves problems without tradeoffs.
- Culture exists as lore, not as operational rules.

## Quick start (two pillars per scene)
Pick TWO pillars and make them bite in the next beat:
1) material life (food, light, travel, currency)
2) supernatural cost (limits + residue)
3) institutions and taboos (guild/temple/court)
4) geography and weather (terrain shapes plans)

## Level 1: Material life is a constraint engine
Show 1–2 operational details:
- travel time, road quality, weather exposure
- currency friction (coins, seals, trust)
- light scarcity (torches, oil, taboo flames)

## Level 2: Magic as a constrained resource
For every “spell-like” effect, define:
- hard limit (cannot do)
- soft limit (cost: pain, debt, attention, corruption)
- residue (heat, smell, fatigue, witnesses, altered materials)

Rule: if magic is used, something is left behind.

## Level 3: Institutions that bite
Institutions must create friction:
- permits, tithes, guild monopolies, forbidden rites, jurisdiction boundaries

If an institution exists, it must convert at least one “easy” action into a costly one.

## Level 4: Local specificity (one hard oddity per place)
Each location gets one testable oddity:
- banned bells (sound attracts something)
- salt tax (smuggling economy)
- water rune rituals (taste turns bitter if not renewed)

## Level 5: Myth as incentive (not exposition)
Beliefs matter when they change behavior:
- people refuse a word/name
- crowds react to symbols
- officials enforce ritual proof

## Anti-patterns
- generic medieval adjectives without constraints
- magic as infinite solution
- lore dumps that don’t change verbs

Next: CHECKLIST.md and TEMPLATES.md.`,

  "CHECKLIST.md": `# Fantasy Theme Checklist

- [ ] Two pillars activated (material/magic/institution/geography)
- [ ] Magic has a hard limit and a cost
- [ ] Magic use leaves residue (trace/witness/altered material)
- [ ] An institution creates friction (permit/taboo/jurisdiction)
- [ ] One local oddity is testable (can be learned/used)
- [ ] Belief changes behavior (not just narration)`,

  "TEMPLATES.md": `# Fantasy Theme Templates

## Template A: Magic definition (fast)
- Can:
- Cannot:
- Cost:
- Residue:
- Who polices it:

## Template B: Institution friction beat
> “You can do that,” [NPC] says, “if you have [CREDENTIAL].”  
> Without it, you pay in [BRIBE/DEBT/EXPOSURE]—and the record gets your name.

## Template C: Local oddity reveal
> Everyone [RITUAL/HABIT]. Break it, and [REACTION] happens—teaching you [RULE].`,

  "EXAMPLES.md": `# Fantasy Theme Examples

## Example 1: Magic with residue
> The rune does not glow. It *steams*. Frost peels back from the stone like skin, and the air tastes metallic. Your fingers go numb through the glove. The door opens, but the metal latch is now rimed white—visible to anyone who comes after. Magic worked. It also left a signature.

## Example 2: Institution bites in a small way
> The guard doesn’t stop you at the gate. He stops your lantern. “Temple district,” he says mildly. “No open flame.”  
> You can pay for a hooded lamp license, borrow a sanctioned candle, or walk in the dark and accept what you can’t see.`,
});

const THEME_SCIFI_PACK = pack("theme-scifi", {
  "SKILL.md": `---
name: theme-scifi
description: Ground sci‑fi in constraints, failure modes, and social consequences (not jargon density).
---

# Sci‑Fi Theme (Constraints + Failure + Society)

Sci‑fi feels real when systems have:
- limits (range, energy, bandwidth)
- failures (overheat, leaks, permissions)
- records (logs, traces, audits)
- incentives (who profits, who gets policed)

## When to use
- Tech feels like magic (solves everything, no tradeoffs).
- Settings feel like “spaceship wallpaper.”
- Conflict is personal-only; structures never bite.

## Quick start (C → F → R)
For any tech used this turn, decide:
1) Constraint (hard limit)
2) Failure mode (how it breaks)
3) Record (what trace/log remains)

Then show one of those in the scene.

## Level 1: Write constraints first
Answer:
- energy source
- latency/range/bandwidth
- maintenance + consumables

## Level 2: Give every system a failure mode
Pick one:
- overheating, vacuum leaks, radiation dose, permissions, incentives misaligned

Let it bite once (even minor) so it becomes real.

## Level 3: Social consequences (who gets squeezed)
Ask:
- who benefits / who is displaced / who is monitored
- what becomes taboo
- what the black market sells (identity, quotas, parts, bandwidth)

## Level 4: Traceability is a pressure system
Many sci‑fi actions produce records:
- door access logs
- camera coverage/blind spots
- network traces
- medical scans

Decide who can read those records and at what cost.

## Level 5: The human layer (interface friction)
Systems rarely fail “cleanly”:
- unclear error states
- conflicting procedures
- operators with incentives

## Anti-patterns
- tech that only adds flavor words
- no failures, no logs, no costs
- “hacking” as instant omnipotence

Next: CHECKLIST.md and TEMPLATES.md.`,

  "CHECKLIST.md": `# Sci‑Fi Theme Checklist

- [ ] Tech has a clear constraint (energy/range/bandwidth)
- [ ] A failure mode exists and can bite
- [ ] A record/trace is created (logs/heat/noise/network)
- [ ] A social consequence exists (policing/displacement/taboo)
- [ ] Interface friction is human (procedures/operators/incentives)`,

  "TEMPLATES.md": `# Sci‑Fi Theme Templates

## Template A: System card (fast)
- System:
- Constraint:
- Failure mode:
- Record/trace:
- Who can read the trace:
- What it costs to erase/alter it:

## Template B: “Permission is power” beat
> The door doesn’t deny you. It asks *who you are*.  
> You can try [LEGIT CREDENTIAL], [SOCIAL LEVERAGE], or [ILLEGAL METHOD]—each with different traces.`,

  "EXAMPLES.md": `# Sci‑Fi Theme Examples

## Example 1: Constraint + trace (no magic)
> Your drone can see around the corner, but only for thirty meters before the signal turns to snow. You push it farther anyway. The feed jitters—then a warning flashes: *UNREGISTERED DEVICE*. Somewhere in a system you can’t see, a log entry is created with the time you tried.

## Example 2: Failure mode bites once
> The suit seals. The pressure holds. Then a tiny red light appears near the collar: a slow leak, not fatal yet, but persistent. You can keep going and watch your oxygen budget shrink, or you can stop and repair and accept what the delay will cost.`,
});

const THEME_NOIR_PACK = pack("theme-noir", {
  "SKILL.md": `---
name: theme-noir
description: Noir tone through leverage, debt, and moral cost (not just darkness and rain).
---

# Noir Theme (Leverage + Moral Cost)

Noir is not a color filter. Noir is leverage.
Every character is trading, hiding, testing, or paying.

## When to use
- Tone is “dark” but choices have no leverage.
- Characters are purely good or purely evil.
- Dialogue is honest when it should be transactional.

## Quick start (D → S → P)
In the next scene, activate at least one:
- Debt (money, favors, secrets, blood)
- Stain (blackmail, past mistake, compromising tie)
- Price (getting what you want costs face, safety, or morality)

## Level 1: Leverage is discoverable (clues, not omniscience)
Show:
- who watches whom
- what records exist
- what favors are owed

## Level 2: Atmosphere as mechanisms
Use physical grit that affects action:
- wet smoke hides footsteps
- broken lights create blind spots
- cheap perfume covers sweat (class pressure)

## Level 3: Moral cost is a tradeoff, not a quiz
Write choices as:
- faster, dirtier, more leverage
- cleaner, slower, more expensive, more dangerous

## Level 4: Dialogue as interrogation
Dialogue should:
- test boundaries
- price information
- end with a commitment (debt/suspicion/access shift)

## Level 5: Consequences stick
Noir promises that nothing is “clean.”
If you act, the stain spreads in some direction.

## Anti-patterns
- “everyone is evil” with no incentives
- stylish monologues that don’t change decisions
- darkness without leverage mechanics

Next: CHECKLIST.md and TEMPLATES.md.`,

  "CHECKLIST.md": `# Noir Theme Checklist

- [ ] Debt/stain/price activated (at least one)
- [ ] Leverage is discoverable (records/favors/witnesses)
- [ ] Atmosphere changes verbs (blind spots, slick streets, noise)
- [ ] Choices carry moral/social cost (tradeoffs)
- [ ] Scene ends with residue (debt/suspicion/record)`,

  "TEMPLATES.md": `# Noir Theme Templates

## Template A: Price the truth
> “Sure. I’ll tell you.”  
> “What’s the price?”  
> “Not money. Not tonight.”

## Template B: Clean option vs dirty option
- Clean:
  > Pay money/time; stay legal; risk being too late.
- Dirty:
  > Gain leverage fast; leave residue; owe a favor or create a stain.`,

  "EXAMPLES.md": `# Noir Theme Examples

## Example: Leverage shift, not just darkness
> The alley is wet enough to mirror the neon, but the real shine is the ledger in the bartender’s hand. He doesn’t threaten you. He just turns the page so you can see your name—spelled right.  
> “You’ve been busy,” he says softly. “I’m glad you chose *me* to buy your silence.”`,
});

const THEME_HORROR_PACK = pack("theme-horror", {
  "SKILL.md": `---
name: theme-horror
description: Horror through uncertainty, constraint, escalation, and sensory discomfort (not gore spam).
---

# Horror Theme (Uncertainty + Constraint + Escalation)

Horror is helplessness avoided by narrow margins:
- incomplete information
- asymmetric risk
- irreversible costs
- the world reacting to residue

## When to use
- You want fear/tension without random jump scares.
- Quiet scenes should still feel unsafe.

## Quick start (U + S + E)
In the next beat:
1) keep ONE unknown alive (agent/rule/cost)
2) make safety costly (time/resources/social)
3) show one escalation signal (sound/light/environment/social)

## Level 1: The three unknowns (pick one per scene)
- unknown agent: who/what is doing this?
- unknown rule: what triggers it?
- unknown cost: what does it take from you?

## Level 2: Make safety costly
Safe actions should have costs:
- time (clocks advance)
- resources (light, warmth, medicine)
- social (trust erodes, panic spreads)

## Level 3: Escalation ladders (fair dread)
Advance via observable steps:
- sound changes (too quiet, too near)
- light changes (flicker, fail, wrong color)
- environment changes (temperature drop, wetness, rot smell)
- social changes (someone refuses a name, someone leaves)

## Level 4: Payoff the rule
Once the player learns a rule, enforce it consistently.
Fear becomes strategy; agency stays intact.

## Level 5: Relief beats (avoid desensitization)
Horror needs breath:
- a safe room with a cost
- a clue that narrows the unknown
- an ally (with constraints)

## Anti-patterns
- random doom with no mechanism
- constant gore (desensitizes fast)
- hiding all information forever (becomes frustration)

Next: CHECKLIST.md and TEMPLATES.md.`,

  "CHECKLIST.md": `# Horror Theme Checklist

- [ ] One unknown stays alive (agent/rule/cost)
- [ ] Safety has a cost (time/resources/social)
- [ ] Escalation is observable (sound/light/environment/social)
- [ ] Player can test/learn rules (actionable path)
- [ ] Once learned, the rule is enforced consistently
- [ ] Relief exists occasionally (breath without reset)`,

  "TEMPLATES.md": `# Horror Theme Templates

## Template A: Unknown + test
Unknown:
> You don’t know [AGENT/RULE/COST].
Test:
> You can test it by [ACTION], but it will cost [COST].

## Template B: Escalation ladder evidence (pick one)
- sound: a drip stops; a step mirrors yours
- light: flicker; wrong color; shadow behaves wrong
- environment: temperature drop; dampness; sweet rot smell
- social: refusal to say a name; someone leaves abruptly`,

  "EXAMPLES.md": `# Horror Theme Examples

## Example: Safety is costly
> The closet is dry and dark—safe from sight, maybe. But the air is stale, and every minute inside tastes like old wood and old breath. You can hide and let the footsteps pass, or you can move now while you still have light in your lungs.`,
});

const THEME_ROMANCE_PACK = pack("theme-romance", {
  "SKILL.md": `---
name: theme-romance
description: Romance as tension, vulnerability, and choice—built on boundaries and consequence.
---

# Romance Theme (Vulnerability + Choice + Consequence)

Romance is not constant flirting. Romance is:
- attachment under constraints
- vulnerability with risk
- choices that change trust and future options

## When to use
- “Romance” reads like compliments with no stakes.
- Relationship beats feel detached from the plot.
- Characters confess too early or too safely.

## Quick start (T → R → C)
In the next relationship beat, include:
1) Tension: a concrete barrier (time, duty, taboo, rivalry, fear)
2) Risk: a vulnerability offered (and what it could cost)
3) Choice: a trust decision (open/withhold/commit/withdraw)

## Level 1: Barriers are mechanics, not vibes
Choose a barrier that affects actions:
- duty/jurisdiction (can’t be seen)
- scarcity (no time, no privacy)
- reputation (witnesses, rumors)
- values conflict (what each refuses to do)

## Level 2: Vulnerability is specific
Avoid generic “I like you.”
Prefer specific admissions with cost:
- “If this goes wrong, I lose my position.”
- “I can’t afford to be believed.”

## Level 3: Small bids build trust
Trust is built via repeatable micro-actions:
- keeping a promise
- taking a risk on someone’s behalf
- telling a partial truth at the right time

## Level 4: Misunderstandings must be causal
If there’s conflict, it should come from:
- missing information with a reason
- pressure forcing bad timing
- values in collision

Not from pure stupidity.

## Level 5: Relationship changes gameplay
A romance beat should create:
- access (invitation, key, ally)
- constraint (jealousy, obligation, risk)
- residue (rumor, promise, debt)

## Anti-patterns
- instant confessions without pressure
- “jealousy plot” with no cause
- romance that never changes decisions

Next: CHECKLIST.md and TEMPLATES.md.`,

  "CHECKLIST.md": `# Romance Theme Checklist

- [ ] Concrete barrier exists (duty/taboo/reputation/time)
- [ ] Vulnerability is specific and risky
- [ ] A trust choice is offered (open/withhold/commit/withdraw)
- [ ] Conflict is causal (pressure/values/info with reason)
- [ ] Relationship creates gameplay change (access/constraint/residue)`,

  "TEMPLATES.md": `# Romance Theme Templates

## Template A: Vulnerability with cost
> “I can’t promise this is safe.”  
> “I’m not asking for safe.”  
> “Then you’re asking me to risk [COST].”

## Template B: Trust menu (3 options)
- Open (gain intimacy; risk exposure)
- Withhold (stay safe; risk distance)
- Commit (gain ally/access; accept obligation)`,

  "EXAMPLES.md": `# Romance Theme Examples

## Example: Barrier + choice + residue
> The corridor is public. Too public. He doesn’t touch you; he doesn’t need to.  
> “Say you don’t know me,” he whispers, eyes forward.  
> You can deny him and keep your name clean—or you can meet his gaze for one heartbeat and accept the rumor that will follow you like smoke.`,
});

const THEME_CYBERPUNK_PACK = pack("theme-cyberpunk", {
  "SKILL.md": `---
name: theme-cyberpunk
description: Cyberpunk through leverage, surveillance, debt, and body/identity as contested terrain.
---

# Cyberpunk Theme (Debt + Surveillance + Body/Identity)

Cyberpunk is not neon. Cyberpunk is asymmetry:
- corporations own procedures
- surveillance makes action costly
- bodies and identities are upgradable—and repossessable

## When to use
- The setting looks cyberpunk but plays like generic action.
- Hacking is instant omnipotence.
- Social structures (corporate power) never bite.

## Quick start (S → D → I)
In the next scene, include:
1) Surveillance: a trace/log/monitoring constraint
2) Debt: an obligation or payment pressure
3) Identity: a credential, biometrics, or reputation gate

## Level 1: Every system has a gate
Gates are:
- credentials (ID, badge, token)
- biometrics (voice, gait, face)
- social proof (who vouches)

## Level 2: Hacks leave traces
If a hack works, it creates:
- a log entry
- a heat clock (attention escalates)
- a dependency (backdoor, borrowed access)

## Level 3: Commodification creates moral pressure
Ask:
- what is sold (time, privacy, organs, memory)
- who can’t afford safety
- who enforces ownership (security, law, contracts)

## Level 4: Style comes from constraints
Neon matters when it changes verbs:
- glare ruins stealth
- rain distorts sensors
- crowds create cover but also cameras

## Level 5: Victories are partial
Cyberpunk wins are:
- temporary access
- borrowed identity
- leverage that expires

## Anti-patterns
- “cool aesthetic” with no systemic pressure
- hacks with no trace or cost
- corporations as vague evil without procedures

Next: CHECKLIST.md and TEMPLATES.md.`,

  "CHECKLIST.md": `# Cyberpunk Theme Checklist

- [ ] A gate exists (credential/biometric/social proof)
- [ ] Surveillance/trace is present (logs/cameras/network)
- [ ] Success leaves a trace or heat clock
- [ ] Debt/obligation pressures choices
- [ ] Style affects verbs (glare/rain/crowds/sensors)`,

  "TEMPLATES.md": `# Cyberpunk Theme Templates

## Template A: Gate options (legible)
> You can enter using [LEGIT BADGE], [BORROWED ID], or [ILLEGAL BYPASS]. Each choice leaves different traces.

## Template B: Heat clock ladder
25%: unusual login flagged
50%: automated challenge/lockout
75%: human operator watches
100%: security responds`,

  "EXAMPLES.md": `# Cyberpunk Theme Examples

## Example: Hack with cost and trace
> The terminal accepts your spoofed token. For three seconds, you’re someone else. Then the screen pauses—just a pause—and a tiny icon appears: *SESSION RECORDED*. You’re in, but you just told the system what to hunt for.`,
});

const THEME_WUXIA_PACK = pack("theme-wuxia", {
  "SKILL.md": `---
name: theme-wuxia
description: Wuxia through honor, reputation, technique costs, and social obligation as pressure systems.
---

# Wuxia Theme (Honor + Reputation + Obligation)

Wuxia is not “flying swords.” Wuxia is:
- technique with cost
- reputation as currency
- obligation and honor as social mechanics

## When to use
- Martial scenes feel like generic combat.
- Honor is mentioned but never constrains action.
- Sects and masters exist as lore, not systems.

## Quick start (R → O → T)
In the next beat, include:
1) Reputation: how the world prices the character
2) Obligation: a duty, debt, or vow that bites
3) Technique: a move with a visible cost (breath, injury, exposure)

## Level 1: Reputation is currency
Reputation changes access:
- invitations, duels, protection, travel safety

Show reputation via behavior:
- titles used, deference, challenge, silence

## Level 2: Obligation creates tradeoffs
Common obligations:
- oath, sect rules, teacher’s command, family duty

Obligations should force choices with costs.

## Level 3: Technique has cost and residue
Even “superhuman” feats leave:
- fatigue, injury, attention, broken surfaces, witnesses

## Level 4: Conflict is often about face
Social stakes:
- humiliation, public proof, saving someone’s name

## Level 5: The world responds
After a public act, decide:
- who spreads the story
- who challenges
- which sect takes interest

## Anti-patterns
- honor as flavor text only
- effortless techniques with no cost
- sects that never react

Next: CHECKLIST.md and TEMPLATES.md.`,

  "CHECKLIST.md": `# Wuxia Theme Checklist

- [ ] Reputation affects behavior/access (titles, duels, deference)
- [ ] An obligation bites (oath/sect rule/debt)
- [ ] Technique has a cost and residue (fatigue/attention/damage)
- [ ] Stakes include “face” (public proof/humiliation)
- [ ] The world reacts (rumor/challenge/sect interest)`,

  "TEMPLATES.md": `# Wuxia Theme Templates

## Template A: Technique cost beat
> The move works—but it costs [BREATH/INJURY/EXPOSURE]. The floor/roof/air shows it.

## Template B: Honor choice (clean tradeoff)
- Keep face (risk danger now)
- Win safely (lose face / break a vow)
- Withdraw (save life, pay reputation)`,

  "EXAMPLES.md": `# Wuxia Theme Examples

## Example: Technique + cost + reputation
> You clear the gap in one bound—but your landing is heavy, not silent. Tiles crack. A small failure, but public. The apprentice’s eyes widen; the master’s expression does not change. He doesn’t scold you. He just says, softly, “Again.”  
> The cost isn’t the cracked roof. It’s the story the witnesses will tell.`,
});

const THEME_MYSTERY_PACK = pack("theme-mystery", {
  "SKILL.md": `---
name: theme-mystery
description: Mystery tone through solvable uncertainty, clue economics, and fair inference (not withholding forever).
---

# Mystery Theme (Solvable Uncertainty + Fair Inference)

Mystery as a theme means:
- questions are specific
- clues are causal residues
- inference is rewarded
- solutions have costs and consequences

## When to use
- Mysteries feel like narrator secrets.
- Players can’t act because nothing is testable.
- Reveals arrive without groundwork.

## Quick start (Q + R + T)
In the next scene:
1) pose one sharp question
2) reveal one residue clue
3) suggest one testable action

## Level 1: Questions must be answerable
Bad: “What’s going on?”  
Good: “Who had access to the ledger between dusk and dawn?”

## Level 2: Clues have a cost to acquire
Learning should cost:
- time, exposure, debt, reputation

## Level 3: Redundancy prevents stalls
Important facts should have multiple paths (space/behavior/record).

## Level 4: Misdirection must be fair
Allow red herrings only if:
- they are true about something else
- they still leave real residue

## Level 5: Solutions create new problems
Solving changes social geometry:
- someone feels threatened
- an institution reacts
- a debt comes due

## Anti-patterns
- mystery box with no tests
- single-key clue gating
- twist that invalidates evidence

Next: CHECKLIST.md and TEMPLATES.md.`,

  "CHECKLIST.md": `# Mystery Theme Checklist

- [ ] Question is sharp and answerable
- [ ] A residue clue exists (causal)
- [ ] A testable action exists
- [ ] Learning costs something (time/exposure/debt)
- [ ] Redundancy exists (multiple clue channels)
- [ ] Solution creates consequences (reaction/residue)`,

  "TEMPLATES.md": `# Mystery Theme Templates

## Template A: Question → clue → test
Question:
> [SHARP QUESTION]
Clue:
> [RESIDUE]
Test:
> You can test it by [ACTION], but it costs [COST].

## Template B: Fair red herring
> The clue points to [WRONG CONCLUSION], but it’s still true about [OTHER FACT].`,

  "EXAMPLES.md": `# Mystery Theme Examples

## Example: Solvable uncertainty
> The stamp ink on today’s permits is the wrong shade. That’s not “weird.” That’s procedural. Someone used yesterday’s stamp—or someone wants it to look that way. You can ask the clerk (exposure) or find the stamp room (time and risk).`,
});

const THEME_SLICE_OF_LIFE_PACK = pack("theme-slice-of-life", {
  "SKILL.md": `---
name: theme-slice-of-life
description: Slice-of-life through small stakes, routines, and relationships that still change choices.
---

# Slice‑of‑Life Theme (Routines + Small Stakes + Texture)

Slice-of-life is not “nothing happens.” It is:
- small stakes with real costs
- routines that evolve
- relationships that accumulate residue

## When to use
- Scenes feel aimless without tension.
- Everyday life reads like filler.
- Conflicts are either absent or over-dramatic.

## Quick start (R + S + C)
In the next scene, include:
1) routine (what normally happens)
2) small stake (time, pride, money, belonging)
3) change (a tiny shift that matters)

## Level 1: Stakes are local
Local stakes:
- being late
- losing face
- missing an opportunity
- small money troubles
- belonging/acceptance

## Level 2: Routines create clocks
Routines advance without announcing “clock”:
- shift change, class bell, shop closing, rain arriving

## Level 3: Texture carries theme
Use specific carriers:
- food, tools, weather, small rituals

## Level 4: Conflicts are about needs, not villains
Conflicts often come from:
- mismatched expectations
- limited time/resources
- unspoken boundaries

## Level 5: Accumulation matters
Small choices accumulate into:
- trust
- reputation
- access

## Anti-patterns
- endless pleasantness with no stakes
- melodrama that breaks scale
- routines that never change

Next: CHECKLIST.md and TEMPLATES.md.`,

  "CHECKLIST.md": `# Slice‑of‑Life Theme Checklist

- [ ] Routine is present (what normally happens)
- [ ] Small stake is real (time/pride/money/belonging)
- [ ] A tiny change occurs (shift, surprise, mismatch)
- [ ] Conflict is need-based (not villain-based)
- [ ] Choice creates residue (trust/reputation/access)`,

  "TEMPLATES.md": `# Slice‑of‑Life Theme Templates

## Template A: Routine with a twist
> Normally, [ROUTINE]. Today, [SMALL CHANGE].  
> You can [OPTION A] (cost: [COST]) or [OPTION B] (cost: [COST]).

## Template B: Small stake framing
> It’s not life or death. It’s [LOCAL STAKE]—and that’s enough.`,

  "EXAMPLES.md": `# Slice‑of‑Life Theme Examples

## Example: Small stake, real cost
> The bakery bell rings and the line shifts forward by inches. The last tray of buns is cooling behind the glass—exactly the kind your friend likes, exactly the kind you promised. If you wait politely, you might be too late. If you cut in, you’ll be remembered.`,
});

const THEME_POST_APOCALYPSE_PACK = pack("theme-post-apocalypse", {
  "SKILL.md": `---
name: theme-post-apocalypse
description: Post‑apocalypse as logistics, scarcity, and institutions-in-ruins (not just rubble aesthetics).
---

# Post‑Apocalypse Theme (Scarcity + Logistics + New Orders)

Post‑apocalypse feels real when the world has:
- scarcity (water, medicine, fuel, trust)
- logistics (routes, weather, maintenance)
- new institutions (warlords, communes, cults, trade leagues)
- old residue (broken systems, contaminated zones, records)

## When to use
- The setting is “ruins” but choices feel ungrounded.
- Survival is mentioned but never constrains action.
- Factions feel like costumes instead of resource systems.

## Quick start (S + R + O)
In the next scene, include:
1) Scarcity axis (what is running out?)
2) Residue from the old world (a system that fails in a specific way)
3) Order (who controls access, and how?)

## Level 1: Scarcity must change verbs
Scarcity changes:
- travel routes (avoid/seek water)
- social behavior (barter, hoarding, gatekeeping)
- violence thresholds (people fight earlier)

## Level 2: Logistics is the plot engine
Define one logistics clock:
- fuel runs low
- storm closes the pass
- caravan window expires

Logistics gives urgency without contrived villains.

## Level 3: Institutions replace the old ones
Choose one operational institution:
- ration board (permits and stamps)
- protection racket (debt and enforcement)
- commune council (votes, favors, public shame)

Make it bite once per arc.

## Level 4: Ruins are functional, not decorative
Ruins matter when they are:
- dangerous (collapse, contamination)
- useful (parts, shelter, records)
- controlled (territory, traps)

## Level 5: Hope is also mechanical
Add one hope vector:
- a reliable well
- a safe route
- a working radio
Hope is a resource worth protecting.

## Anti-patterns
- endless rubble with no systems
- scarcity that never affects decisions
- random violence with no incentives

Next: CHECKLIST.md and TEMPLATES.md.`,

  "CHECKLIST.md": `# Post‑Apocalypse Theme Checklist

- [ ] Scarcity axis is active (water/medicine/fuel/trust)
- [ ] A logistics clock exists (route/weather/maintenance/window)
- [ ] An institution controls access (permits/debt/shame/enforcement)
- [ ] Old-world residue matters (contamination/records/failed infrastructure)
- [ ] Ruins are functional (danger + utility)
- [ ] A hope vector exists (resource worth protecting)`,

  "TEMPLATES.md": `# Post‑Apocalypse Theme Templates

## Template A: Access gate (scarcity + order)
> “We have [RESOURCE].”  
> “Then give it.”  
> “Not for free. Not without [CREDENTIAL/DEBT/SERVICE].”

## Template B: Logistics pressure line
> If you take the safe road, you arrive after [DEADLINE]. If you take the fast road, you pass through [CONTROLLED/DANGEROUS ZONE].`,

  "EXAMPLES.md": `# Post‑Apocalypse Theme Examples

## Example: Scarcity + institution
> The well isn’t guarded by guns. It’s guarded by a board. Names scratched into a plank, a stamp you can’t fake, and a tired woman who doesn’t look up when she denies you. You can barter, you can beg, or you can steal—and stealing will turn your name into a problem that follows you.`,
});

const THEME_WESTERN_PACK = pack("theme-western", {
  "SKILL.md": `---
name: theme-western
description: Western as jurisdiction, reputation, distance, and violence as a social tool with consequences.
---

# Western Theme (Jurisdiction + Reputation + Distance)

Western is not hats. Western is:
- thin institutions (law is local and limited)
- distance (help is far)
- reputation as currency
- violence as a tool that changes community relations

## When to use
- The world looks western but plays like generic fantasy/action.
- Law enforcement is omnipresent or irrelevant.
- Violence has no social residue (nobody remembers).

## Quick start (L + D + R)
In the next scene, include:
1) Law/jurisdiction boundary (who has authority here?)
2) Distance/time cost (how far is help/escape?)
3) Reputation stake (who is watching, and what story spreads?)

## Level 1: Jurisdiction is fragmented
Define:
- sheriff’s reach (town only? roads?)
- rancher power (private enforcement)
- railway/company power (permits, contracts)

## Level 2: Reputation spreads faster than you can ride
Reputation carriers:
- saloons, churches, telegraph, payroll books

Actions leave residue:
- “You’re the one who…”

## Level 3: Distance makes choices sharp
Distance creates:
- missed windows
- exposure on open roads
- reliance on strangers

## Level 4: Violence is a social signal
Violence changes:
- access (doors close/open)
- alliances (who fears/needs you)
- escalation (retaliation)

## Level 5: Community is the arena
Western stakes are often communal:
- water rights
- grazing land
- wages and debt

## Anti-patterns
- gunfights that change nothing
- law that appears only when convenient
- infinite ammo/medical recovery

Next: CHECKLIST.md and TEMPLATES.md.`,

  "CHECKLIST.md": `# Western Theme Checklist

- [ ] Jurisdiction boundary exists (sheriff/ranch/company)
- [ ] Distance imposes time/exposure costs
- [ ] Reputation stake is present (witnesses, story carriers)
- [ ] Violence has social residue (access/alliance/retaliation)
- [ ] Community stake exists (water/land/wages/debt)`,

  "TEMPLATES.md": `# Western Theme Templates

## Template A: Thin law pressure
> “The law’s here,” [NPC] says, “but it doesn’t ride past the river.”

## Template B: Reputation consequence
> You can win the fight, but you’ll lose the room. Tomorrow, the story will arrive before you do.`,

  "EXAMPLES.md": `# Western Theme Examples

## Example: Thin law + reputation
> The sheriff doesn’t stop you. He watches you. That’s worse. The saloon goes quiet the moment your boot hits the plank floor, not because they fear you—because they want to know who you belong to. In a town like this, a man’s name is a contract, and breaking contracts makes enemies you can’t outride.`,
});

const THEME_HEIST_PACK = pack("theme-heist", {
  "SKILL.md": `---
name: theme-heist
description: Heist as security procedures, clocks, roles, and fallout (not just “planning montage”).
---

# Heist Theme (Security + Roles + Clocks + Fallout)

Heists are about:
- procedures (gates, checks, logs)
- time (windows, shifts)
- roles (who does what)
- fallout (residue that triggers pursuit)

## When to use
- Plans feel like magic (“we do the heist”).
- Security is either incompetent or omniscient.
- Success has no consequences afterward.

## Quick start (W + G + F)
Define:
1) Window (time constraint: shift change, delivery, event)
2) Gates (2–3 gates: credential, geometry, surveillance)
3) Fallout (what trace/pursuit triggers if you leave residue)

## Level 1: Security is a procedure, not a monster
Security components:
- identity gate (badge, seal, biometric)
- attention gate (guards, cameras, witnesses)
- geometry gate (locked doors, chokepoints, distance)
- record gate (logs, ledgers, audit trails)

## Level 2: Roles create clean choices
Roles:
- face (talk)
- shadow (stealth)
- hand (tools)
- mind (plans/reads)

Even solo heists can rotate “role mode” per beat.

## Level 3: Clocks keep it moving
Heist clocks:
- suspicion/heat
- time window
- noise

Show evidence as they advance.

## Level 4: Failure is partial and creates new constraints
Good outcomes include:
- “yes, but” (get the item, lose anonymity)
- “no, and” (fail, but learn a route / create leverage)

## Level 5: Fallout makes the heist matter
Afterwards, decide:
- who investigates
- what records exist
- what changes in procedures

## Anti-patterns
- planning that predicts everything
- security that changes rules mid-scene without cause
- success with no residue

Next: CHECKLIST.md and TEMPLATES.md.`,

  "CHECKLIST.md": `# Heist Theme Checklist

- [ ] Window exists (shift/event/delivery)
- [ ] 2–3 gates exist (identity/attention/geometry/record)
- [ ] At least one clock advances with evidence
- [ ] Outcomes include costs (anonymity, debt, injury, time)
- [ ] Fallout is defined (investigation/procedure change/pursuit)`,

  "TEMPLATES.md": `# Heist Theme Templates

## Template A: Gate menu
Gate: [TYPE]
- Legit: [METHOD] (cost: time/procedure)
- Dirty: [METHOD] (cost: residue/heat)
- Clever: [METHOD] (cost: resource/debt)

## Template B: Fallout definition
> If you leave [RESIDUE], [ACTOR] investigates using [METHOD], and procedures tighten in [WAY].`,

  "EXAMPLES.md": `# Heist Theme Examples

## Example: Record gate makes stealth meaningful
> You can slip past the guard, sure. The question is the door. It doesn’t just open. It logs. If you enter as yourself, your name becomes a pursuit. If you enter as someone else, you owe the identity you borrowed—and borrowed things get reclaimed.`,
});

const THEME_POLITICAL_THRILLER_PACK = pack("theme-political-thriller", {
  "SKILL.md": `---
name: theme-political-thriller
description: Political thriller as institutions, incentives, plausible deniability, and information pricing.
---

# Political Thriller Theme (Institutions + Incentives + Deniability)

Political thrillers are about:
- institutions (what can be done “on paper”)
- incentives (careers, scandals, donors, coups)
- deniability (who can be blamed)
- information economics (what truth costs)

## When to use
- Politics reads like vague corruption vibes.
- Antagonists have infinite power (or none).
- Revelations land without procedural consequences.

## Quick start (I + P + D)
In the next scene, include:
1) Institution: a procedure or gate (committee, warrant, budget, permit)
2) Pressure: a career/scandal clock
3) Deniability: who will be blamed if this goes public?

## Level 1: Power moves through paperwork
Power tools:
- budgets
- permits
- subpoenas/warrants
- committees and hearings
- media access

## Level 2: Incentives create predictable behavior
Define for key actors:
- what they want (promotion, immunity, election, stability)
- what they fear (scandal, loss of donor, arrest)

## Level 3: Information is priced
Truth costs:
- favors
- exposure
- legal risk
- moral compromise

## Level 4: Plausible deniability is a mechanism
Deniability tactics:
- intermediaries
- “off the record”
- compartmentalization
- procedural delays

## Level 5: Outcomes change institutions
If you expose something, institutions react:
- investigations
- tightened procedure
- scapegoats
- new alliances

## Anti-patterns
- villains who confess because the plot needs it
- omnipotent conspiracies without friction
- revelations with no institutional aftermath

Next: CHECKLIST.md and TEMPLATES.md.`,

  "CHECKLIST.md": `# Political Thriller Theme Checklist

- [ ] Institution gate exists (budget/permit/warrant/committee)
- [ ] Incentives defined (want/fear) for key actors
- [ ] Information has a price (favor/exposure/legal risk)
- [ ] Deniability mechanism exists (intermediary/off-record)
- [ ] Aftermath changes procedures/alliances (institution reacts)`,

  "TEMPLATES.md": `# Political Thriller Theme Templates

## Template A: “Off the record” pricing
> “Off the record?”  
> “There is no off the record. There is only who gets blamed.”

## Template B: Institution gate options
- Legal: [PROCEDURE] (cost: time)
- Grey: [LOOPHOLE] (cost: leverage/debt)
- Illegal: [BYPASS] (cost: deniability + heat)`,

  "EXAMPLES.md": `# Political Thriller Theme Examples

## Example: Paperwork as power
> The minister doesn’t threaten you. He offers you a committee seat. A chair in a room that decides what questions are allowed to exist. You can refuse and keep your hands clean, or you can accept and let your name become part of the machine that hides the truth.`,
});

const THEME_STEAMPUNK_PACK = pack("theme-steampunk", {
  "SKILL.md": `---
name: theme-steampunk
description: Steampunk as industry, class, patents, and dangerous infrastructure (not just gears and goggles).
---

# Steampunk Theme (Industry + Class + Patents + Infrastructure)

Steampunk becomes distinct when the world is run by:
- industrial bottlenecks (fuel, pressure, parts)
- class control (who rides, who sweats, who owns)
- patents and monopolies (who can legally build/repair)
- visible hazard (steam, heat, mechanical failure)

## When to use
- The aesthetic is present but the setting plays like generic fantasy.
- Technology works like magic (no maintenance, no failures).
- Class conflict is implied but never constrains action.

## Quick start (BPI)
In the next scene, include:
1) Bottleneck (fuel/pressure/parts)
2) Patent or permit gate (who is allowed to repair/build)
3) Infrastructure hazard (steam burns, failing valves, loud machinery)

## Level 1: Industry is a constraint engine
Show operational details:
- shifts, foremen, payroll books
- soot, heat, noise, cramped service tunnels

## Level 2: Maintenance is politics
Ask:
- who controls spare parts
- who certifies repairs
- who profits from breakdowns

## Level 3: Class is an access gate
Class gates:
- where you can enter
- who will speak to you
- what laws apply to you

## Level 4: Failure modes sell the tech
Failure modes:
- pressure spikes, valve seizure, belt snap, boiler contamination
Let a small failure bite once so the system is real.

## Level 5: The city is a machine with owners
Give the world control points:
- rail hubs, power houses, patent offices, guild halls
Each point creates encounters (permits, bribes, sabotage).

## Anti-patterns
- gear adjectives with no constraints
- machines that never fail
- class conflict with no access consequences

Next: CHECKLIST.md and TEMPLATES.md.`,

  "CHECKLIST.md": `# Steampunk Theme Checklist

- [ ] Bottleneck is active (fuel/pressure/parts)
- [ ] Patent/permit gate exists (who can repair/build)
- [ ] Infrastructure hazard changes verbs (heat/noise/steam)
- [ ] Class gates access (rooms, laws, speech)
- [ ] Failure mode exists and can bite
- [ ] Control point exists (rail hub/power house/patent office)`,

  "TEMPLATES.md": `# Steampunk Theme Templates

## Template A: Repair gate options
- Legit: get certified parts (cost: time/procedure)
- Bribe: pay a foreman (residue: debt/record)
- Black-market: illegal part (risk: failure/heat)

## Template B: Failure beat
> The pressure gauge twitches past safe. Steam hisses where it shouldn’t. If you push on, you risk [BURN/DAMAGE/ALARM]. If you stop, you lose [WINDOW/TIME].`,

  "EXAMPLES.md": `# Steampunk Theme Examples

## Example: Maintenance becomes leverage
> The lift will take you up—if you have the brass token. Without it, the operator smiles like a locked door. You can pay, you can threaten, or you can climb the service ladder where the steam pipes run hot enough to punish every mistake.`,
});

const THEME_SPACE_OPERA_PACK = pack("theme-space-opera", {
  "SKILL.md": `---
name: theme-space-opera
description: Space opera as empires, logistics, status, and identity gates—big scale with personal consequences.
---

# Space Opera Theme (Empire + Logistics + Status + Identity)

Space opera is not “space jargon.” It is:
- empires and factions with procedures
- travel windows and supply chains
- status and identity as gates
- spectacle that still changes decisions

## When to use
- The setting is huge but scenes feel small and generic.
- Factions exist as names, not systems.
- Travel is instantaneous and consequence-free.

## Quick start (ELS)
In the next scene, include:
1) Empire pressure (law, patrols, warrants, propaganda)
2) Logistics constraint (fuel, docking windows, cargo, quarantine)
3) Status/identity gate (rank badge, ship registry, biometrics)

## Level 1: Scale is shown through procedure
Show:
- checkpoints, docking queues, customs seals
- jurisdiction boundaries between stations

## Level 2: Travel has windows and traces
Travel creates:
- time costs
- logs (port records)
- exposure (ship registry, manifests)

## Level 3: Factions have assets and vulnerabilities
Assets:
- fleets, intelligence, trade monopolies, legitimacy
Vulnerabilities:
- public scandal, supply shortage, internal split

## Level 4: Status is a verb gate
Status controls:
- who can demand, who must ask
- who gets searched, who gets waved through

## Level 5: Big stakes, personal costs
Tie grand events to personal consequences:
- a warrant attaches to a name
- a ship gets blacklisted
- an ally’s family is pressured

## Anti-patterns
- infinite travel with no logs
- factions with no procedures
- spectacle that doesn’t constrain action

Next: CHECKLIST.md and TEMPLATES.md.`,

  "CHECKLIST.md": `# Space Opera Theme Checklist

- [ ] Empire pressure appears (law, patrols, warrants)
- [ ] Logistics constraint exists (docking/quarantine/fuel/cargo)
- [ ] Identity/status gate exists (rank/registry/biometrics)
- [ ] Travel leaves traces (logs/manifests)
- [ ] Factions have assets + vulnerabilities (systemic)
- [ ] Grand stakes create personal costs (name/ship/ally)`,

  "TEMPLATES.md": `# Space Opera Theme Templates

## Template A: Docking gate menu
- Legit: file paperwork (cost: time)
- Bribe: pay a handler (residue: record/debt)
- Bypass: spoof registry (risk: heat/logs)

## Template B: Empire pressure line
> The patrol doesn’t ask who you are. It asks what you are registered as.`,

  "EXAMPLES.md": `# Space Opera Theme Examples

## Example: Identity gate creates tension
> The station welcomes you in bright colors and polite announcements. Then the scanner pauses on your ship’s registry. Just a pause. Long enough to become a story. You can leave now and stay anonymous, or you can dock and let your name enter the port log forever.`,
});

const THEME_MILITARY_PACK = pack("theme-military", {
  "SKILL.md": `---
name: theme-military
description: Military stories as chain-of-command, logistics, rules of engagement, and morale under pressure.
---

# Military Theme (Orders + Logistics + ROE + Morale)

Military genre works when:
- authority is procedural (chain-of-command)
- resources are bounded (ammo, fuel, medevac)
- rules constrain action (ROE, law, politics)
- morale and cohesion matter

## When to use
- Combat is present but nothing feels organized or constrained.
- Characters ignore orders with no consequence.
- Logistics and medevac never matter.

## Quick start (OLR)
In the next scene, include:
1) Order constraint (who can authorize what)
2) Logistics constraint (ammo/fuel/medevac/time window)
3) Rules of engagement (what you are allowed to do, and why)

## Level 1: Chain-of-command is a gate
Show:
- who can approve actions
- who will be blamed on paper
- how reports and logs work

## Level 2: Logistics is the plot engine
Constraints:
- limited ammo, limited fuel
- casualty evacuation timing
- communications reliability

## Level 3: ROE creates moral and tactical tradeoffs
ROE can forbid the “easy” solution:
- collateral rules
- jurisdiction boundaries
- political constraints

## Level 4: Morale is a resource
Morale changes:
- risk tolerance
- cohesion
- willingness to follow orders

## Level 5: After-action consequences
Actions produce:
- investigations, commendations, discipline
- changes in procedure

## Anti-patterns
- infinite ammo/medevac
- orders that never matter
- war stories with no paperwork consequences

Next: CHECKLIST.md and TEMPLATES.md.`,

  "CHECKLIST.md": `# Military Theme Checklist

- [ ] Chain-of-command gate exists (authorization/blame)
- [ ] Logistics constraint is active (ammo/fuel/medevac/comms)
- [ ] ROE constrains at least one obvious action
- [ ] Morale/cohesion matters (resource band)
- [ ] After-action consequences exist (reports/investigation/procedure)`,

  "TEMPLATES.md": `# Military Theme Templates

## Template A: ROE tradeoff menu
- Comply: safer on paper (cost: time/risk now)
- Bend: tactical advantage (cost: investigation/moral)
- Break: immediate success (cost: legitimacy and fallout)

## Template B: Logistics pressure line
> You can push, but you’re low on [AMMO/FUEL]. If you commit now, you won’t have it later.`,

  "EXAMPLES.md": `# Military Theme Examples

## Example: ROE as constraint, not speech
> The target is there. The shot is easy. The rule is not. If you fire, you might win the moment and lose the mission. If you wait, you might lose the target and keep legitimacy. Either way, someone writes the report with your name on it.`,
});

const THEME_ESPIONAGE_PACK = pack("theme-espionage", {
  "SKILL.md": `---
name: theme-espionage
description: Espionage as tradecraft, deniability, information pricing, and identities that can be burned.
---

# Espionage Theme (Tradecraft + Deniability + Burn Risk)

Espionage is about:
- information as currency
- identities as tools
- deniability as survival
- mistakes that leave trace and burn networks

## When to use
- Spy scenes read like generic action.
- Characters share secrets too easily.
- “Cover” is mentioned but never constrains behavior.

## Quick start (CBB)
In the next scene, define:
1) Cover (what identity you are presenting)
2) Burn risk (what would expose it)
3) Buy price (what it costs to get information)

## Level 1: Tradecraft is procedure
Tradecraft:
- dead drops, signals, countersurveillance routes
- compartmentalization (“you don’t know my handler”)

## Level 2: Every success leaves trace
Trace types:
- camera logs, access records, witness memory, electronic artifacts
Decide who can read the trace and how fast.

## Level 3: Identities are expendable resources
Using cover costs:
- limited time before it’s burned
- future access closes

## Level 4: Information is priced with risk
Costs:
- exposure, debt, moral compromise, time window

## Level 5: Fallout is networked
If you get burned:
- contacts disappear
- procedures tighten
- misinformation spreads

## Anti-patterns
- omniscient agencies with no friction
- spy gadgets that solve everything
- success with no trace or fallout

Next: CHECKLIST.md and TEMPLATES.md.`,

  "CHECKLIST.md": `# Espionage Theme Checklist

- [ ] Cover identity is defined (and believable)
- [ ] Burn risk exists (trace/witness/log)
- [ ] Tradecraft procedure appears (signal/drop/countersurveillance)
- [ ] Information is priced (risk/time/debt/moral)
- [ ] Success leaves trace; trace has a reader and speed
- [ ] Fallout affects the network (contacts/procedures)`,

  "TEMPLATES.md": `# Espionage Theme Templates

## Template A: Burn clock ladder
25%: unusual interest noticed
50%: contact delays, asks for proof
75%: surveillance tail appears
100%: cover burned, network goes dark

## Template B: Information pricing line
> “I can tell you.”  
> “What’s the price?”  
> “Your cover. Or your time. Pick one.”`,

  "EXAMPLES.md": `# Espionage Theme Examples

## Example: Cover as constraint
> Your badge gets you past the first door. The second door asks a question your cover can’t answer. You can bluff (risk burn), you can retreat (lose time), or you can call your handler (create a trace you can’t erase).`,
});

const THEME_GOTHIC_PACK = pack("theme-gothic", {
  "SKILL.md": `---
name: theme-gothic
description: Gothic as inheritance, secrecy, decaying institutions, and architecture that constrains action.
---

# Gothic Theme (Inheritance + Secrecy + Decay)

Gothic is not “spooky adjectives.” Gothic is:
- inheritance and obligation
- family secrets as leverage
- decaying institutions (church, estate, town)
- architecture that traps, reveals, and records

## When to use
- Horror vibes exist but the setting isn’t mechanically oppressive.
- Estates/manors are just backdrops.
- Secrets feel untestable and arbitrary.

## Quick start (HSA)
In the next scene, include:
1) Heritage pressure (inheritance, duty, bloodline)
2) Secret with a testable residue (ledger, portrait, locked room)
3) Architecture constraint (corridors, sight lines, locked wings)

## Level 1: The house is a system
Give the space:
- routines (servants, bells, curfews)
- gates (keys, permissions, taboos)

## Level 2: Decay is operational
Decay affects:
- mobility (collapsing stairs)
- visibility (dust, weak light)
- safety (rot, mold, hidden holes)

## Level 3: Secrecy has procedure
Secrecy tools:
- locked rooms, sealed letters, false ledgers
Secrecy should leave residue when maintained or broken.

## Level 4: Inheritance is a moral trap
Inheritance creates choices:
- accept protection and obligation
- reject it and lose access

## Level 5: Revelation changes the social order
When secrets surface:
- institutions react
- reputations shift
- procedures tighten

## Anti-patterns
- vague dread with no constraints
- secrets with no evidence
- architecture that doesn’t matter

Next: CHECKLIST.md and TEMPLATES.md.`,

  "CHECKLIST.md": `# Gothic Theme Checklist

- [ ] Heritage pressure exists (duty/bloodline/estate)
- [ ] Secret is testable (residue, record, object)
- [ ] Architecture constrains action (keys, wings, sight lines)
- [ ] Decay changes verbs (movement, visibility, safety)
- [ ] Secrecy has procedure and residue (locks, ledgers, letters)
- [ ] Revelation changes social order (reaction, tightened gates)`,

  "TEMPLATES.md": `# Gothic Theme Templates

## Template A: House-as-system card
- Routines:
- Gates:
- Taboo:
- Decay failure mode:
- Secret residue:

## Template B: Secret with residue line
> The secret isn’t hidden by silence. It’s hidden by procedure: [LOCK/LEDGER/LETTER]. Breaking it leaves [RESIDUE].`,

  "EXAMPLES.md": `# Gothic Theme Examples

## Example: Architecture as constraint
> The west wing isn’t “forbidden.” It’s simply missing from the map and absent from conversation. The key exists—on a ring the steward never sets down. If you take it, you gain access and lose innocence, because the house will notice the moment its procedures are broken.`,
});

const THEME_URBAN_FANTASY_PACK = pack("theme-urban-fantasy", {
  "SKILL.md": `---
name: theme-urban-fantasy
description: Urban fantasy as overlapping jurisdictions, hidden markets, and supernatural rules embedded in modern systems.
---

# Urban Fantasy Theme (Hidden Rules + Modern Systems)

Urban fantasy works when the magical layer:
- interacts with modern systems (law, cameras, bureaucracy)
- has jurisdictions (who polices what)
- has hidden markets and procedures

## When to use
- “Magic in the city” exists, but nothing changes in how the city works.
- Supernatural actions have no trace (cameras, records, rumors).
- Secret worlds are purely aesthetic, not procedural.

## Quick start (HJL)
In the next scene, include:
1) Hidden rule (what triggers/limits magic)
2) Jurisdiction overlap (police vs supernatural authority)
3) Leak risk (cameras, logs, witnesses)

## Level 1: Two cities, one footprint
Define:
- what is visible to normal people
- what is visible to insiders
And how the two interpret the same residue differently.

## Level 2: Modern systems are pressure engines
Modern constraints:
- cameras, access logs, phones, bank records
Magic must either respect them or pay to bypass them.

## Level 3: Hidden markets have procedure
Markets need:
- gatekeeping (invitation, token, phrase)
- pricing (money, favors, blood, secrets)

## Level 4: Jurisdiction conflict creates story
Conflicts:
- who can arrest whom
- who controls evidence
- who gets blamed publicly

## Level 5: The veil has costs
Keeping secrecy costs:
- memory edits, cover stories, cleanup teams, debt

## Anti-patterns
- secret worlds with no procedures
- magic that ignores modern traceability
- constant exposition about “the veil”

Next: CHECKLIST.md and TEMPLATES.md.`,

  "CHECKLIST.md": `# Urban Fantasy Theme Checklist

- [ ] Hidden rule exists (trigger/limit/cost)
- [ ] Modern traceability matters (cameras/logs/records)
- [ ] Hidden market has gate + price (procedure)
- [ ] Jurisdiction overlap exists (police vs supernatural)
- [ ] Secrecy has costs (cleanup, debt, cover stories)
- [ ] Residue is interpretable in two layers (normal vs insider)`,

  "TEMPLATES.md": `# Urban Fantasy Theme Templates

## Template A: Two-layer residue
> To the public, it’s [MUNDANE EXPLANATION]. To insiders, it’s [SUPERNATURAL SIGNATURE].

## Template B: Hidden market gate
> “We’re not open.”  
> “I’m not here to shop. I’m here to pay.”  
> (Gate: token/phrase/invitation)`,

  "EXAMPLES.md": `# Urban Fantasy Theme Examples

## Example: Modern systems constrain magic
> The ward holds, but the security camera doesn’t care. It records the frost pattern blooming across the doorframe. You can wipe the footage (trace), you can pay a cleanup team (debt), or you can walk away and let your signature enter a database that will remember you.`,
});

const THEME_MYTHIC_EPIC_PACK = pack("theme-mythic-epic", {
  "SKILL.md": `---
name: theme-mythic-epic
description: Mythic epic as vows, omens, institutions of belief, and choices with generational residue.
---

# Mythic Epic Theme (Vows + Omens + Institutions of Belief)

Mythic epic feels large when:
- vows constrain heroes
- omens are testable signals, not narration
- institutions of belief (temples, oracles, cults) have procedures
- actions echo as long-term residue

## When to use
- “Epic” is only scale and adjectives.
- Prophecy removes agency (“destined, so nothing matters”).
- Gods/omens appear with no rules.

## Quick start (VOI)
In the next scene, include:
1) Vow/obligation (what the hero cannot do without cost)
2) Omen signal (observable, interpretable, testable)
3) Institution procedure (who interprets, who enforces, who records)

## Level 1: Vows are mechanics
Vows constrain:
- methods (no deception, no killing, no retreat)
Breaking vows costs:
- reputation, legitimacy, supernatural backlash, social exile

## Level 2: Omens are signals with uncertainty
Omens should:
- be observable
- allow multiple interpretations
- become clearer through tests

## Level 3: Belief institutions have assets and boundaries
Assets:
- legitimacy, followers, records, ritual access
Boundaries:
- taboos, jurisdiction, orthodoxy enforcement

## Level 4: Choices echo forward
Epic consequences:
- lineage debt
- city-level reputation
- institutional changes

## Level 5: Payoffs honor earlier carriers
Repeat carriers (song, seal, scar) across acts with variation.
Make the payoff feel inevitable in retrospect.

## Anti-patterns
- prophecy that dictates outcomes
- gods that intervene randomly
- epic scale with no procedural constraints

Next: CHECKLIST.md and TEMPLATES.md.`,

  "CHECKLIST.md": `# Mythic Epic Theme Checklist

- [ ] Vow/obligation constrains a method
- [ ] Omen is observable and testable (not narrator decree)
- [ ] Institution procedure exists (interpretation, enforcement, records)
- [ ] Belief institution has assets + boundaries
- [ ] Consequences echo forward (reputation, lineage, institutions)
- [ ] Carriers repeat with variation (song/seal/scar)`,

  "TEMPLATES.md": `# Mythic Epic Theme Templates

## Template A: Vow tradeoff
- Keep vow: [COST NOW]
- Break vow: [GAIN NOW], but pay [BACKLASH] later

## Template B: Omen as test
Omen:
> [OBSERVABLE SIGN]
Interpretations:
- [A]
- [B]
Test:
> You can test it by [ACTION], at cost [COST].`,

  "EXAMPLES.md": `# Mythic Epic Theme Examples

## Example: Omen without destiny lock
> The river runs backward for one minute at dusk. Everyone saw it. No one agrees what it means. The priest calls it a warning; the general calls it enemy sorcery. You can accept an interpretation and act now, or you can test it and pay time while the army marches anyway.`,
});

const THEME_LEGAL_DRAMA_PACK = pack("theme-legal-drama", {
  "SKILL.md": `---
name: theme-legal-drama
description: Legal drama as procedure, evidence, incentives, and jurisdiction (not courtroom speeches).
---

# Legal Drama Theme (Procedure + Evidence + Jurisdiction)

Legal drama works when law is operational:
- procedures gate actions
- evidence is priced and contested
- incentives shape what institutions do
- jurisdiction decides what is even possible

## When to use
- “The law” is a vibe, not a constraint system.
- Court scenes become monologues without stakes.
- Evidence appears magically without discovery cost.

## Quick start (PEJ)
In the next scene, include:
1) Procedure step (filing, warrant, deposition, motion, hearing)
2) Evidence constraint (what exists, where it is, who controls it)
3) Jurisdiction gate (which court/agency has authority)

## Level 1: Procedure is a time engine
Procedures create clocks:
- deadlines, continuances, calendar slots
- approvals, signatures, service requirements

If the protagonist waits, the procedure moves anyway.

## Level 2: Evidence has custody and cost
Evidence should have:
- chain of custody (who touched it)
- admissibility friction (why it can be challenged)
- acquisition cost (time, subpoenas, exposure, favors)

## Level 3: Incentives are real
Actors have incentives:
- prosecutors: conviction rates, politics, budgets
- defense: reputation, billing, triage
- judges: docket pressure, precedent risk
- agencies: optics, jurisdiction turf

## Level 4: Jurisdiction creates leverage
Leverage sources:
- venue choice
- overlapping agencies
- procedural technicalities

## Level 5: Outcomes change future constraints
After a legal win/loss:
- access changes (records sealed/opened)
- procedures tighten/loosen
- reputations shift (who will talk now)

## Anti-patterns
- courtroom speeches that don’t change outcomes
- “gotcha evidence” with no acquisition path
- omnipotent law that appears only for drama

Next: CHECKLIST.md and TEMPLATES.md.`,

  "CHECKLIST.md": `# Legal Drama Theme Checklist

- [ ] Procedure step is on screen (filing/warrant/deposition/motion)
- [ ] Evidence has custody + acquisition cost
- [ ] Jurisdiction gate matters (venue/agency authority)
- [ ] Incentives are defined (career/budget/optics)
- [ ] Clock exists (deadline/docket/time window)
- [ ] Outcome changes constraints (records, access, reputation)`,

  "TEMPLATES.md": `# Legal Drama Theme Templates

## Template A: Evidence acquisition menu
- Subpoena: legal, slow (cost: time)
- Favor: fast (cost: debt/exposure)
- Illicit: immediate (cost: admissibility + heat)

## Template B: Jurisdiction pressure line
> “That’s not my court,” they say. “That’s not my problem—until it is.”

## Template C: Procedure beat
> The clerk doesn’t argue. The clerk stamps. The stamp is a weapon: it decides what exists on paper.`,

  "EXAMPLES.md": `# Legal Drama Theme Examples

## Example: Procedure and custody create stakes
> The file is real only because it was filed before noon. Miss the window and the truth becomes “late.” The evidence isn’t missing; it’s in a back room with a logbook that tells a story about who touched it. You can fight the story, or you can change it—at a price.`,
});

const THEME_MEDICAL_THRILLER_PACK = pack("theme-medical-thriller", {
  "SKILL.md": `---
name: theme-medical-thriller
description: Medical thriller as triage, ethics, systems failure, and institutional pressure (not miracle medicine).
---

# Medical Thriller Theme (Triage + Ethics + Systems Pressure)

Medical thriller works when:
- decisions are constrained (time, staff, supplies)
- information is partial and costly
- ethics and policy create tradeoffs
- institutions leave records (charts, liability, audits)

## When to use
- Medicine is treated as magic with instant certainty.
- Hospital scenes lack time pressure.
- Rules and liability never constrain actions.

## Quick start (TCE)
In the next scene, include:
1) Triage pressure (who must be helped first, and why)
2) Chart/record constraint (what is documented, who can access it)
3) Ethical tradeoff (what you can’t do without consequence)

## Level 1: Time pressure is mechanical
Time creates:
- oxygen windows, bleed-out clocks
- shift changes, OR scheduling
- lab turnaround delays

## Level 2: Uncertainty is realistic and playable
Show partial signals:
- vitals, symptoms, lab hints
Offer test paths:
- imaging, labs, consults
Each path costs time/exposure/authority.

## Level 3: Resources are finite
Scarcity:
- staff, beds, blood, meds, equipment
Scarcity creates conflict without villains.

## Level 4: Policy and liability are gates
Gates:
- consent, protocols, pharmacy controls
- reporting requirements
Bypassing gates creates records and fallout.

## Level 5: Outcomes change the institution
After an event:
- audits, procedure changes, scapegoats
- reputations shift (who will cover for whom)

## Anti-patterns
- miracle diagnosis with no tests
- endless dramatic speeches while time stands still
- illegal actions with no records or consequences

Next: CHECKLIST.md and TEMPLATES.md.`,

  "CHECKLIST.md": `# Medical Thriller Theme Checklist

- [ ] Triage pressure is present (time window, prioritization)
- [ ] Uncertainty exists with test paths (labs/imaging/consult)
- [ ] Resource scarcity matters (beds/blood/staff)
- [ ] Policy/liability gate constrains action (consent/protocol)
- [ ] Records exist (charts, access logs)
- [ ] Aftermath changes procedures/reputation (audit, fallout)`,

  "TEMPLATES.md": `# Medical Thriller Theme Templates

## Template A: Test menu (costed)
- Lab: slow (cost: time)
- Imaging: scarce slot (cost: authority/favor)
- Consult: political (cost: ego/credit)

## Template B: Policy gate line
> “I can do it,” they say, “but if I do, it’s in the chart forever.”

## Template C: Triage choice
> You can save [PATIENT A] now or stabilize [PATIENT B] first. Either choice costs someone something.`,

  "EXAMPLES.md": `# Medical Thriller Theme Examples

## Example: Records and scarcity create suspense
> The blood bank isn’t empty. It’s locked behind policy. The chart terminal asks for an authorization that is, in effect, an accusation: who takes responsibility if this goes wrong? You can wait for the attending and lose the minute you can’t afford—or you can act and let your name enter the audit trail.`,
});

const THEME_CORPORATE_DRAMA_PACK = pack("theme-corporate-drama", {
  "SKILL.md": `---
name: theme-corporate-drama
description: Corporate drama as incentives, KPIs, bureaucracy, and reputational pressure (not generic “greed”).
---

# Corporate Drama Theme (Incentives + Bureaucracy + Reputation)

Corporate drama works when power is procedural:
- approvals and budgets are gates
- KPIs shape behavior
- HR and legal create pressure and deniability
- internal records decide what is “true”

## When to use
- Corporations are vague evil with no procedures.
- Characters can do anything with no approvals.
- Workplace stakes feel too small or too melodramatic.

## Quick start (AKR)
In the next scene, include:
1) Approval gate (who signs, who blocks)
2) KPI incentive (what numbers matter)
3) Reputation risk (who can write the story, on record)

## Level 1: Incentives make behavior predictable
Define for key actors:
- what metric they need
- what risk they fear (scandal, layoff, lawsuit)

## Level 2: Bureaucracy is a maze with shortcuts
Gates:
- access badges, project permissions, calendars
Shortcuts:
- favors, backchannels, “urgent” labels
Shortcuts leave residue (paper trails, debts).

## Level 3: HR and legal are pressure systems
They control:
- language (“we can’t say that”)
- documentation (what gets recorded)
- consequences (PIP, termination, NDAs)

## Level 4: Information is priced internally
Truth costs:
- political capital
- exposure to blame
- debt to a sponsor

## Level 5: Outcomes rewrite the org chart
After a conflict:
- reorgs, promotions, scapegoats
- procedure changes and tightened permissions

## Anti-patterns
- villains who confess
- “CEO can do anything” without boards/legal
- drama without incentives or records

Next: CHECKLIST.md and TEMPLATES.md.`,

  "CHECKLIST.md": `# Corporate Drama Theme Checklist

- [ ] Approval gate exists (sign-off, budget, permission)
- [ ] KPI incentive exists (metric pressure)
- [ ] Reputation risk exists (email trail, HR record, legal)
- [ ] Shortcuts exist with residue (debt/paper trail)
- [ ] HR/legal constrains language and actions
- [ ] Outcome changes structure (reorg, tightened access, promotions)`,

  "TEMPLATES.md": `# Corporate Drama Theme Templates

## Template A: Approval menu
- Formal: request sign-off (cost: time)
- Sponsor: borrow a name (cost: debt)
- Bypass: do it anyway (cost: audit + blame)

## Template B: KPI pressure line
> “I don’t need you to be right,” they say. “I need the number to go up.”

## Template C: Record threat
> The email is the weapon. Whoever writes it first decides what happened.`,

  "EXAMPLES.md": `# Corporate Drama Theme Examples

## Example: Records decide reality
> The meeting ends, and the real fight begins: the follow-up email. If your story is the one on record, you win. If theirs is, you become a problem that can be managed. You can push back publicly (risk), privately (debt), or let it stand and pay later.`,
});

const THEME_POLICE_PROCEDURAL_PACK = pack("theme-police-procedural", {
  "SKILL.md": `---
name: theme-police-procedural
description: Police procedural as jurisdiction, evidence chains, procedures, and politics (not just action scenes).
---

# Police Procedural Theme (Jurisdiction + Procedure + Evidence)

Police procedural works when:
- jurisdiction limits what can be done
- procedure creates time pressure and paper trails
- evidence has custody, admissibility, and costs
- politics and optics shape behavior

## When to use
- “Cops investigate” feels like magic intuition.
- Evidence appears without acquisition friction.
- Authority is infinite or irrelevant.

## Quick start (JPE)
In the next investigation scene, include:
1) Jurisdiction boundary (who has authority here?)
2) Procedure step (interview, warrant, evidence logging, chain of custody)
3) Evidence conflict (what can be challenged, what is missing, who controls it)

## Level 1: Jurisdiction creates leverage and blockage
Show:
- who must be asked for permission
- which agency will fight for control
- what happens if you cross the line (discipline, case tossed)

## Level 2: Procedure is a clock
Procedures create deadlines:
- warrant windows, lab queues, shift changes, court dates
Waiting is never free.

## Level 3: Evidence is contested
Evidence friction:
- contamination risk
- witness credibility
- surveillance blind spots
- “fruit of the poisonous tree” style exclusion

## Level 4: Optics and politics are constraints
Constraints:
- media attention
- department pressure (clearance rates, budgets)
- community trust

## Level 5: Outcomes change future constraints
After a case beat:
- a suspect lawyered up
- procedures tighten
- your reputation shifts inside the department

## Anti-patterns
- omniscient profiling with no tests
- infinite warrants with no judges
- illegal actions with no paper consequences

Next: CHECKLIST.md and TEMPLATES.md.`,

  "CHECKLIST.md": `# Police Procedural Theme Checklist

- [ ] Jurisdiction boundary exists (agency, district, authority)
- [ ] Procedure step is shown (warrant/log/interview/lab)
- [ ] Evidence has custody + contestability
- [ ] A clock exists (lab queue, warrant window, shift)
- [ ] Optics/politics constrain behavior (media, budgets, trust)
- [ ] Aftermath changes constraints (procedure, access, reputation)`,

  "TEMPLATES.md": `# Police Procedural Theme Templates

## Template A: Evidence acquisition menu
- Legal: warrant/subpoena (cost: time)
- Social: persuade/cooperate (cost: leverage/trust)
- Illicit: break rules (cost: admissibility + career heat)

## Template B: Jurisdiction friction line
> “You can chase it,” they say, “but not under our badge.”`,

  "EXAMPLES.md": `# Police Procedural Theme Examples

## Example: Procedure creates suspense
> The crime scene isn’t a puzzle. It’s a schedule. If you don’t log the evidence before shift change, it becomes “unverified,” and unverified things don’t survive court. You can stay and do it right, or you can chase the lead now and risk losing the case on paper.`,
});

const THEME_STARTUP_TECH_PACK = pack("theme-startup-tech", {
  "SKILL.md": `---
name: theme-startup-tech
description: Startup/tech drama as incentives, velocity pressure, technical debt, and reputational narratives on record.
---

# Startup / Tech Theme (Velocity + Incentives + Technical Debt)

Startup/tech stories work when:
- speed is a pressure system
- incentives shape what ships and what breaks
- technical debt becomes future constraints
- narratives on record decide blame and truth

## When to use
- “Tech” is just screens and jargon.
- The company behaves like a single villain.
- Shipping has no consequences (security, outages, trust).

## Quick start (VDR)
In the next scene, include:
1) Velocity pressure (deadline, runway, launch window)
2) Debt reality (what will break later, and how)
3) Record narrative (ticket/email/postmortem defining reality)

## Level 1: Incentives define behavior
Incentives:
- runway, growth metrics, uptime SLOs, investor optics
Define what each actor wants and fears (blame, churn, layoffs).

## Level 2: Technical debt is a gate
Debt creates:
- slow deploys, fragile systems, hidden coupling
Debt makes “easy fixes” expensive or risky.

## Level 3: Security and compliance are constraints
Constraints:
- access permissions
- audit trails
- incident response
Bypassing them creates records and future fallout.

## Level 4: Incident culture is procedural
Procedures:
- on-call escalation
- rollback policies
- postmortems
The postmortem can be a weapon or a repair.

## Level 5: Success creates new pressure
Launch success:
- increases scrutiny
- increases attack surface
- tightens procedures

## Anti-patterns
- genius hacking with no systems
- “we fix it in five minutes” without tradeoffs
- villains without incentives/metrics

Next: CHECKLIST.md and TEMPLATES.md.`,

  "CHECKLIST.md": `# Startup / Tech Theme Checklist

- [ ] Velocity pressure exists (runway, launch, deadline)
- [ ] Incentives are defined (metrics, optics, blame)
- [ ] Technical debt is concrete (failure mode)
- [ ] Security/compliance gate exists (permissions, audit trail)
- [ ] Incident procedure appears (on-call, rollback, postmortem)
- [ ] Outcome creates new pressure (scrutiny, tightened rules)`,

  "TEMPLATES.md": `# Startup / Tech Theme Templates

## Template A: Launch tradeoff menu
- Ship now: hit optics (risk: outage/security)
- Delay: reduce risk (cost: runway/credibility)
- Compromise: ship partial (cost: debt and future constraints)

## Template B: Postmortem power line
> The incident ends when the system recovers. The damage ends when the story is written.`,

  "EXAMPLES.md": `# Startup / Tech Theme Examples

## Example: Debt becomes a chase clock
> The hotfix works, but only because you bypassed permissions that exist for a reason. The log records your name. Tomorrow, the audit will read the same way an enemy reads footprints. You bought uptime—and you bought a future scene.`,
});

const THEME_FINANCE_THRILLER_PACK = pack("theme-finance-thriller", {
  "SKILL.md": `---
name: theme-finance-thriller
description: Finance thriller as leverage, liquidity, compliance, and invisible violence through paperwork and markets.
---

# Finance Thriller Theme (Leverage + Compliance + Liquidity)

Finance thrillers work when:
- money is a power system (access gates)
- compliance and audits are procedural weapons
- liquidity and timing create pressure
- “violence” is reputational, legal, and economic

## When to use
- Finance is reduced to “greed” and numbers.
- Stakes don’t connect to procedures (audits, filings, approvals).
- Market timing and records never matter.

## Quick start (LCL)
In the next scene, include:
1) Leverage source (who can freeze funds, move credit, control access)
2) Compliance gate (KYC/AML, approvals, audits, filings)
3) Liquidity pressure (window where money can move or can’t)

## Level 1: Records decide reality
Records:
- filings, ledgers, emails, approvals, signatures
Whoever controls the record controls the story.

## Level 2: Compliance is a weapon with boundaries
Compliance tools:
- freezes, investigations, suspicious activity reports
Boundaries:
- jurisdiction, optics, internal incentives

## Level 3: Timing is a blade
Timing pressure:
- market close, settlement windows, margin calls
Waiting can be catastrophic.

## Level 4: Leverage is traded like currency
Leverage sources:
- insider knowledge
- access to funding
- blackmail and NDAs

## Level 5: Fallout is institutional
After a move:
- procedures tighten
- allies vanish
- new audits appear

## Anti-patterns
- omnipotent billionaires with no compliance friction
- instant money transfers with no logs
- “the market” as a magical force with no mechanisms

Next: CHECKLIST.md and TEMPLATES.md.`,

  "CHECKLIST.md": `# Finance Thriller Theme Checklist

- [ ] Leverage source exists (credit, freeze power, access control)
- [ ] Compliance gate exists (approval/audit/KYC/filing)
- [ ] Liquidity/timing window exists (settlement, margin, close)
- [ ] Records matter (who signs, who logs)
- [ ] Incentives are defined (career, optics, bonuses)
- [ ] Fallout is institutional (audit, tightened procedure, scapegoats)`,

  "TEMPLATES.md": `# Finance Thriller Theme Templates

## Template A: Money move menu
- Legit: compliance path (cost: time)
- Grey: loophole (cost: debt/optics)
- Illicit: bypass (cost: trace + criminal exposure)

## Template B: Timing pressure line
> “After close, it isn’t money. It’s a promise. Promises get broken.”`,

  "EXAMPLES.md": `# Finance Thriller Theme Examples

## Example: Audit as pursuit
> You can move the funds—but you can’t move the record of moving them. The compliance system doesn’t chase you with guns. It chases you with timestamps. If you act now, you win the window and lose invisibility.`,
});

const THEME_OCCULT_DETECTIVE_PACK = pack("theme-occult-detective", {
  "SKILL.md": `---
name: theme-occult-detective
description: Occult detective as hidden rules, traceable residue, institutions of secrecy, and cases that can be tested.
---

# Occult Detective Theme (Rules + Residue + Institutions)

Occult detective works when the supernatural layer is:
- rule-governed (triggers, limits, costs)
- traceable (residue can be investigated)
- policed (institutions of secrecy have procedure)
- actionable (clues suggest tests)

## When to use
- Occult elements feel like random spooky events.
- Cases rely on narrator reveals instead of evidence.
- Magic ignores modern traceability and institutions.

## Quick start (RRT)
In the next scene, include:
1) Rule uncertainty (unknown agent/rule/cost)
2) Residue clue (physical/social/institutional trace)
3) Test path (a way to verify at a cost)

## Level 1: Supernatural events leave residue
Residue types:
- physical: frost patterns, ash, warped wood, magnetic noise
- social: witnesses with mismatched memories, taboo avoidance
- institutional: “cleanup” logs, sealed reports, unusual permits

## Level 2: Hidden rules are learnable
Provide:
- multiple interpretations early
- a test to narrow them
Avoid “rule announced by narrator.”

## Level 3: Secrecy is procedural
Secrecy institutions:
- clergy orders, private agencies, municipal “special units”
They have:
- access gates, documentation habits, boundaries

## Level 4: Costs are real
Occult costs:
- attention drawn
- contamination
- debt to a patron
- identity risk (being labeled)

## Level 5: Solving changes the city
After a case:
- procedures tighten
- factions react
- rumors spread

## Anti-patterns
- supernatural with no residue
- endless withholding with no tests
- secret institutions with no procedures

Next: CHECKLIST.md and TEMPLATES.md.`,

  "CHECKLIST.md": `# Occult Detective Theme Checklist

- [ ] One unknown is alive (agent/rule/cost)
- [ ] Residue clue exists (physical/social/institutional)
- [ ] Test path exists with cost (time/exposure/debt)
- [ ] Secrecy institution exists (procedure, gates, records)
- [ ] Occult costs matter (attention/contamination/debt)
- [ ] Aftermath changes procedures/factions (city reacts)`,

  "TEMPLATES.md": `# Occult Detective Theme Templates

## Template A: Case beat (RRT)
Rule uncertainty:
> You don’t know [AGENT/RULE/COST].
Residue:
> But you do have [TRACE].
Test:
> You can test it by [METHOD], but it costs [COST].

## Template B: Secrecy institution gate
> “We can show you the file,” they say, “if you sign your name under it.”`,

  "EXAMPLES.md": `# Occult Detective Theme Examples

## Example: Residue invites a test
> The ash isn’t from a fire. It’s too fine, too cold, and it sticks to metal like guilt. The janitor swears he never saw anyone enter the room, but the access log shows the door opened at 3:12 a.m. without a badge. You can chase the log (paper trail) or the ash (ritual trail). Either way, you leave fingerprints.`,
});

const THEME_DARK_FANTASY_PACK = pack("theme-dark-fantasy", {
  "SKILL.md": `---
name: theme-dark-fantasy
description: Dark fantasy through corruption costs, predatory institutions, and hope as a scarce resource.
---

# Dark Fantasy Theme (Corruption + Institutions + Scarce Hope)

Dark fantasy is not “everything is grim.” It is:
- power with moral/material cost
- institutions that exploit scarcity
- hope that exists, but is expensive to protect

## When to use
- The tone is dark, but choices have no meaningful costs.
- Monsters exist, but institutions don’t react or profit.
- Corruption is aesthetic, not mechanical.

## Quick start (PCI)
In the next scene, include:
1) Power cost (what it takes from you)
2) Predatory institution (who profits from suffering)
3) Hope vector (one thing worth saving that can be lost)

## Level 1: Power is always priced
Price types:
- bodily (injury, fatigue)
- social (debt, stigma, exile)
- spiritual (corruption, attention, oath breaking)

## Level 2: Institutions feed on scarcity
Institutions:
- inquisitions, guild monopolies, temples, mercenary companies
They create:
- permits, protection, rationing, “cleansing” services

## Level 3: Monsters are part of the economy
Ask:
- who sells protection
- who sells cures
- who profits from “hunts”

## Level 4: Mercy is a tradeoff
Mercy should cost:
- time, resources, exposure, reputation

## Level 5: Hope is scarce but real
Hope is mechanical:
- a safe route
- an honest ally
- a working ritual

## Anti-patterns
- grimness with no mechanisms
- corruption that never bites
- no hope (becomes flat)

Next: CHECKLIST.md and TEMPLATES.md.`,

  "CHECKLIST.md": `# Dark Fantasy Theme Checklist

- [ ] Power has a cost (bodily/social/spiritual)
- [ ] Predatory institution exists (permits/protection/rationing)
- [ ] Monsters connect to economy (profit, cures, hunts)
- [ ] Mercy is costly (tradeoff)
- [ ] Hope vector exists and is protectable
- [ ] Consequences persist (residue, reactions)`,

  "TEMPLATES.md": `# Dark Fantasy Theme Templates

## Template A: Power price line
> The magic works. It also takes [COST]. You can pay it now, or you can refuse and accept [CONSTRAINT].

## Template B: Institution bite
> “We can protect you,” they say, “if you sign.” The signature is a chain with ink for a lock.`,

  "EXAMPLES.md": `# Dark Fantasy Theme Examples

## Example: Hope with a price
> The healer can save the child, but the herbs are controlled by the guild that sells “purity” to the rich. You can steal the herbs (heat), buy them (debt), or refuse and let the town learn what your mercy is worth.`,
});

const THEME_FAE_COURTS_PACK = pack("theme-fae-courts", {
  "SKILL.md": `---
name: theme-fae-courts
description: Fae courts as contracts, names, etiquette, and debt—social rules that bite like magic.
---

# Fae Courts Theme (Contracts + Names + Etiquette)

Fae court stories work when social rules are literal constraints:
- words bind
- names are power
- gifts are debts
- etiquette is a weapon

## When to use
- “Fae” is only aesthetic whimsy.
- Deals feel arbitrary (“gotcha contract”).
- Court scenes are talky without mechanical stakes.

## Quick start (CNE)
In the next scene, include:
1) Contract surface (what counts as agreement)
2) Name leverage (titles, true names, what cannot be spoken)
3) Etiquette gate (what behavior grants/denies access)

## Level 1: Contracts are procedural
Define:
- what constitutes acceptance (spoken, written, gift taken)
- what constitutes breach
- what enforcement looks like (geas, exile, loss of name)

## Level 2: Gifts are debts
If you accept:
- food, shelter, protection, praise
You incur:
- obligation, favors, silence, reputation costs

## Level 3: Etiquette is an access system
Etiquette controls:
- who can speak first
- who can ask directly
- who can touch objects

## Level 4: Lies are costly; half-truths are tools
Fae often avoid direct lies, but:
- omission, framing, conditional language are weapons
Make the language visible and actionable.

## Level 5: Court politics produces residue
Residue:
- rumors, tokens, recorded favors, public slights
Once created, it is enforceable later.

## Anti-patterns
- gotcha contracts with no procedural warning
- random magic punishment
- etiquette that never affects access or safety

Next: CHECKLIST.md and TEMPLATES.md.`,

  "CHECKLIST.md": `# Fae Courts Theme Checklist

- [ ] Contract surface is defined (what binds)
- [ ] Breach condition is defined (what counts as breaking it)
- [ ] Gift implies debt (obligation is explicit)
- [ ] Etiquette gate affects access (who speaks/touches/asks)
- [ ] Name leverage exists (titles, taboo names, true names)
- [ ] Politics leaves residue (tokens, rumors, favors)`,

  "TEMPLATES.md": `# Fae Courts Theme Templates

## Template A: Deal menu (safe/fast/dirty)
- Safe: ask a formal boon (cost: procedure/time)
- Fast: accept a gift (cost: debt)
- Dirty: exploit etiquette (cost: reputation/retaliation)

## Template B: Contract warning line
> “Take it, then,” they say gently, “if you mean to owe me.”`,

  "EXAMPLES.md": `# Fae Courts Theme Examples

## Example: Etiquette as weapon
> The court does not forbid you from speaking. It forbids you from speaking *first*. The moment you do, the room smiles like a trap. You can wait and lose tempo, or you can break etiquette and pay in reputation that will be collected later as if it were interest.`,
});

const THEME_HOLY_INQUISITION_PACK = pack("theme-holy-inquisition", {
  "SKILL.md": `---
name: theme-holy-inquisition
description: Holy inquisition as doctrine, procedure, confession economy, and institutional power (with incentives and limits).
---

# Holy Inquisition Theme (Doctrine + Procedure + Confession Economy)

Inquisition stories work when belief is institutional:
- doctrine defines what is “true”
- procedure defines what can be proven
- confession is a currency (and a weapon)
- power has boundaries (jurisdiction, optics, rival orders)

## When to use
- Religion is only flavor text.
- “Heretics” are villains with no procedure or incentives.
- Trials feel like arbitrary doom, not institutional mechanisms.

## Quick start (DPC)
In the next scene, include:
1) Doctrine line (what is forbidden and why)
2) Procedure step (witnesses, seals, confession, record)
3) Confession economy (what a confession buys, what silence costs)

## Level 1: Doctrine creates behavioral constraints
Doctrine affects:
- language (taboo words)
- rituals (what must be done)
- access (who can enter)

## Level 2: Procedure creates clocks and paper reality
Procedure:
- summons, hearings, records, seals, approvals
Procedure is how the institution moves without emotion.

## Level 3: Confession is priced
Confession can buy:
- mercy, exile, protection, a clean record
But it also creates:
- leverage, stigma, future control

## Level 4: Power has limits and rivals
Limits:
- nobles, guilds, other temples, foreign jurisdiction
Rivals create leverage and safe cracks.

## Level 5: Outcomes rewrite the social map
After an inquisition move:
- surveillance increases
- procedures tighten
- rumors and fear spread

## Anti-patterns
- arbitrary executions with no process
- omnipotent church with no boundaries
- doctrine that never affects daily choices

Next: CHECKLIST.md and TEMPLATES.md.`,

  "CHECKLIST.md": `# Holy Inquisition Theme Checklist

- [ ] Doctrine constraint exists (taboo, forbidden act)
- [ ] Procedure step is shown (record, seal, summons, witness)
- [ ] Confession has a price and a consequence
- [ ] Institution has boundaries/rivals (jurisdiction limits)
- [ ] Clocks exist (summons dates, hearings, investigations)
- [ ] Aftermath changes social constraints (surveillance, fear, access)`,

  "TEMPLATES.md": `# Holy Inquisition Theme Templates

## Template A: Confession menu
- Confess: gain mercy now (cost: leverage/stigma)
- Deny: keep dignity (cost: procedure escalates)
- Bargain: trade a name (cost: moral + future enemies)

## Template B: Doctrine line
> “It isn’t illegal,” they say. “It’s worse. It’s forbidden.”`,

  "EXAMPLES.md": `# Holy Inquisition Theme Examples

## Example: Procedure as pressure
> The inquisitor doesn’t raise her voice. She raises a seal. Your name is written beside it in careful ink. From this moment, you are not “accused.” You are “summoned.” That one word changes which doors open and which friends become afraid to be seen near you.`,
});

const THEME_INFERNAL_BUREAUCRACY_PACK = pack("theme-infernal-bureaucracy", {
  "SKILL.md": `---
name: theme-infernal-bureaucracy
description: Infernal courts as contracts, procedure, quotas, and debt—hell as an institution with paperwork.
---

# Infernal Bureaucracy Theme (Contracts + Quotas + Procedure)

Infernal bureaucracy works when hell is:
- procedural (forms, seals, jurisdictions)
- transactional (debts and contracts)
- incentive-driven (quotas, promotions, politics)
- bounded (rules that can be exploited)

## When to use
- “Demons” are just monsters with no systems.
- Contracts are gotchas with no warning surfaces.
- Hell feels omnipotent (no limits, no loopholes).

## Quick start (CQP)
In the next scene, include:
1) Contract surface (what binds, what counts as consent)
2) Quota pressure (what the institution needs)
3) Procedure gate (who stamps, who logs, who has authority)

## Level 1: Consent surfaces must be legible
Define:
- spoken acceptance, signature, gift taken, name used
Make the binding surface visible before it bites.

## Level 2: Debt is the core resource
Debt forms:
- favors, names, years, memories
Debt creates ongoing constraints (not one-time punishments).

## Level 3: Procedure creates leverage
Procedure tools:
- appeals, jurisdiction transfers, audits, exceptions
Exceptions exist, but they are expensive.

## Level 4: Incentives create predictable cruelty
Incentives:
- quotas, promotions, rival departments
Predictability makes the institution solvable.

## Level 5: Fallout is permanent on record
Records:
- blacklists, marked names, sealed case files
The record is a scar.

## Anti-patterns
- random punishment with no rules
- gotcha consent with no surfaces
- infinite power with no loopholes

Next: CHECKLIST.md and TEMPLATES.md.`,

  "CHECKLIST.md": `# Infernal Bureaucracy Theme Checklist

- [ ] Consent surface is defined and visible
- [ ] Debt resource is active (names/years/memories)
- [ ] Procedure gate exists (stamps, logs, authority)
- [ ] Quota/incentive exists (predictable behavior)
- [ ] Exceptions exist but are costly (appeal, transfer)
- [ ] Records persist (blacklist, marked names)`,

  "TEMPLATES.md": `# Infernal Bureaucracy Theme Templates

## Template A: Consent warning
> “You can refuse,” they say politely. “But you can’t pretend you didn’t understand.”

## Template B: Procedure loophole offer
> “There is an appeal,” the clerk says, smiling. “There is also a fee.”`,

  "EXAMPLES.md": `# Infernal Bureaucracy Theme Examples

## Example: Quota makes cruelty predictable
> The demon doesn’t threaten you. He offers you a form. He needs three signatures by midnight, and you are one of them. You can fight him, but fighting doesn’t erase the deadline. You can bargain, but bargains create debts that file themselves.`,
});

const THEME_COSMIC_HORROR_PACK = pack("theme-cosmic-horror", {
  "SKILL.md": `---
name: theme-cosmic-horror
description: Cosmic horror as incomprehensible scale with learnable local rules, contamination costs, and agency via tests.
---

# Cosmic Horror Theme (Scale + Rules + Contamination)

Cosmic horror fails when it becomes:
- random doom
- endless vagueness
- helplessness with no tests

Cosmic horror works when:
- scale is implied through small evidence
- local rules can be learned (partially)
- contamination has costs
- agency exists through constrained choices

## When to use
- You want dread without gore spam.
- Supernatural feels too “solvable” or too “untouchable.”
- Players need a way to act without full understanding.

## Quick start (SLC)
In the next scene, include:
1) Scale hint (a small fact that implies vastness)
2) Local rule uncertainty (agent/rule/cost unknown)
3) Contamination cost (what it takes from you to engage)

## Level 1: Scale is shown by mismatch
Scale signals:
- impossible geometry
- time inconsistencies
- records that contradict physical reality

## Level 2: Provide testable local rules
Even if the truth is unknowable, local rules can be tested:
- what triggers attention
- what blocks it
- what makes it worse

## Level 3: Contamination is a resource clock
Contamination costs:
- memory loss, obsession, social isolation, physical decay, attention drawn
Track in bands (low/high/critical).

## Level 4: Institutions respond poorly
Institutions:
- deny, cover up, scapegoat
Their procedures create additional pressure.

## Level 5: Payoffs should narrow uncertainty, not end it
Provide:
- one clarified rule
- one new question
Dread remains, but strategy improves.

## Anti-patterns
- no clues, no tests, only despair
- lore dumps about “infinite cosmos”
- arbitrary madness with no cause

Next: CHECKLIST.md and TEMPLATES.md.`,

  "CHECKLIST.md": `# Cosmic Horror Theme Checklist

- [ ] Scale hint exists (mismatch evidence)
- [ ] One unknown is alive (agent/rule/cost)
- [ ] Local rule is testable (path to partial clarity)
- [ ] Contamination cost exists and escalates (banded)
- [ ] Institutions add pressure (denial, cover-up, procedure)
- [ ] Payoff narrows uncertainty but keeps dread`,

  "TEMPLATES.md": `# Cosmic Horror Theme Templates

## Template A: Scale hint line
> The record says [FACT]. The world says [CONTRADICTORY FACT]. Both can’t be true—and yet both are.

## Template B: Local rule test
Unknown:
> You don’t know [RULE].
Test:
> You can test it by [ACTION], but it costs [CONTAMINATION/EXPOSURE].`,

  "EXAMPLES.md": `# Cosmic Horror Theme Examples

## Example: Partial rule creates agency
> The thing doesn’t react to light. It reacts to *attention*. When you look directly, the air tightens like a held breath. When you look away, it moves. You can test this—use mirrors, use peripheral vision—but every test costs you something: sleep, certainty, and the feeling that your thoughts are private.`,
});

export const THEME_SKILLS: GlobalSkillSeed[] = [
  ...THEME_FANTASY_PACK,
  ...THEME_SCIFI_PACK,
  ...THEME_NOIR_PACK,
  ...THEME_HORROR_PACK,
  ...THEME_ROMANCE_PACK,
  ...THEME_CYBERPUNK_PACK,
  ...THEME_WUXIA_PACK,
  ...THEME_MYSTERY_PACK,
  ...THEME_SLICE_OF_LIFE_PACK,
  ...THEME_POST_APOCALYPSE_PACK,
  ...THEME_WESTERN_PACK,
  ...THEME_HEIST_PACK,
  ...THEME_POLITICAL_THRILLER_PACK,
  ...THEME_STEAMPUNK_PACK,
  ...THEME_SPACE_OPERA_PACK,
  ...THEME_MILITARY_PACK,
  ...THEME_ESPIONAGE_PACK,
  ...THEME_GOTHIC_PACK,
  ...THEME_URBAN_FANTASY_PACK,
  ...THEME_MYTHIC_EPIC_PACK,
  ...THEME_LEGAL_DRAMA_PACK,
  ...THEME_MEDICAL_THRILLER_PACK,
  ...THEME_CORPORATE_DRAMA_PACK,
  ...THEME_POLICE_PROCEDURAL_PACK,
  ...THEME_STARTUP_TECH_PACK,
  ...THEME_FINANCE_THRILLER_PACK,
  ...THEME_OCCULT_DETECTIVE_PACK,
  ...THEME_DARK_FANTASY_PACK,
  ...THEME_FAE_COURTS_PACK,
  ...THEME_HOLY_INQUISITION_PACK,
  ...THEME_INFERNAL_BUREAUCRACY_PACK,
  ...THEME_COSMIC_HORROR_PACK,
];

export const THEME_SKILLS_EXTENDED: GlobalSkillSeed[] = THEME_SKILLS;
