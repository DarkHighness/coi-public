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

const WORLDBUILDING_LOCATION_AS_SYSTEM_PACK = pack("worldbuilding-location-as-system", {
  "SKILL.md": `---
name: worldbuilding-location-as-system
description: Design locations as systems: rules, routines, resources, constraints, and affordances.
---

# Location as a System (Rules, Routines, Resources)

This skill is NOT “describe a cool place.”
A good location *changes decisions*:
- it offers affordances (verbs the environment supports)
- it imposes constraints (risks/costs that bite)
- it contains routines (systems in motion that advance clocks)

## When to use
- Locations feel interchangeable (any tavern, any alley).
- Scenes happen “in a void” with no operational rules.
- Travel and spaces never change risk or cost.

## Quick start (make a location playable in 60 seconds)
Define:
1) one affordance the player can exploit (hide/escape/listen/bargain)
2) one constraint that costs something (law/physics/social)
3) one routine that will change the scene if the player waits
4) one hard oddity that is testable

Then reveal at least one of those within the first paragraph of the scene.

## Level 1: The 4 pillars
1) resources: what can be gained here?
2) constraints: what is hard/dangerous/illegal here?
3) routines: what happens here even if the protagonist does nothing?
4) signals: sensory markers that make it recognizable

## Level 2: Affordances (verbs)
Affordances are verbs supported by environment:
- hide (shadows, crowds, drapes, vents)
- escape (back doors, ladders, alleys, boats)
- listen (thin walls, echo chambers, quiet corners)
- bargain (market stalls, intermediaries, visible prices)

Rule: mention at least one affordance early so the location invites choices.

## Level 3: Constraints that bite (not flavor)
Constraints must create costs:
- law: permits, curfews, jurisdiction boundaries
- physics: slick floors, smoke, narrow corridors, loud gravel
- social: taboos, greetings, status rituals

If you mention a constraint, pay it off within 1–3 turns.

## Level 4: Routines (alive locations)
Write one routine per location:
- guard shift changes at dusk
- market closes and stalls pack up
- temple bell rings (and people react)

Routines create clocks without saying “clock.”

## Level 5: One hard oddity (specific + operational)
Add one concrete oddity that is testable:
- doors are numbered wrong (navigation clue)
- salt is taxed heavily (smuggling economy)
- cups kept upside down (signal or superstition)

Next: CHECKLIST.md and TEMPLATES.md.`,

  "CHECKLIST.md": `# Location as a System Checklist

- [ ] One early affordance (hide/escape/listen/bargain)
- [ ] One constraint with a real cost (law/physics/social)
- [ ] One routine that advances without the protagonist
- [ ] One hard oddity that is testable
- [ ] Constraint is paid off within 1–3 turns
- [ ] At least one routine is made legible via evidence`,

  "TEMPLATES.md": `# Location as a System Templates

## Template A: Location card (internal)
- Name:
- Resources:
- Constraints:
- Routines:
- Affordances:
- Hard oddity:

## Template B: First paragraph reveal
> [SIGNAL] makes the place recognizable. The easiest move here is [AFFORDANCE], but [CONSTRAINT] means it will cost [COST]. In the background, [ROUTINE] is already in motion.

## Template C: Testable oddity
> Everyone does [ODD HABIT]. If you break it, [REACTION] happens—and you learn [SIGNAL].`,

  "EXAMPLES.md": `# Location as a System Examples

## Example: Tavern as a system (not wallpaper)
> The tavern smells of hot fat and wet wool, and the floorboards have been sanded just enough to hide the worst of the stains. A curtain behind the bar is the easiest escape—if you’re fast—but it’s also the one the staff watches. Every hour, the same server circles with a ledger, collecting debts with a smile that never reaches her eyes. And every table keeps its cups upside down until the first drink is paid for. Test that rule, and you’ll learn who owns the room.`,
});

const WORLDBUILDING_FACTION_DYNAMICS_PACK = pack("worldbuilding-faction-dynamics", {
  "SKILL.md": `---
name: worldbuilding-faction-dynamics
description: Make factions act like systems: incentives, assets, boundaries, and escalation.
---

# Faction Dynamics (Incentives, Assets, Escalation)

Factions are pressure systems. They should feel:
- motivated (incentives)
- capable (assets)
- constrained (vulnerabilities)
- predictable (escalation ladders)

## When to use
- Factions exist only as lore.
- Political pressure feels arbitrary.
- NPCs have no institutional backing (or infinite backing).

## Quick start (faction card)
Define:
- motive (what they want)
- method (how they usually get it)
- assets (money, violence, law, information, legitimacy)
- vulnerability (what they fear losing)
- boundary (what they treat as an attack)

Then define an escalation ladder with observable steps.

## Level 1: Assets must create residue
If a faction uses power, it leaves:
- witnesses
- records
- retaliation pressure

This keeps institutions real and prevents “invisible omnipotence.”

## Level 2: Escalation ladder (fair threat)
Write concrete steps:
- low: warnings, price increases, exclusion, rumors
- mid: surveillance, audits, targeted arrests, confiscations
- high: raids, assassinations, public trials, embargo

Rule: escalation should be observable before it becomes lethal.

## Level 3: Internal friction (leverage)
Add at least one internal split:
- idealists vs pragmatists
- old guard vs new blood
- public face vs enforcement wing

This creates leverage and prevents “invincible organizations.”

## Level 4: Transaction surfaces (playable contact points)
Give factions:
- meeting spots
- intermediaries
- documentation habits (seals, tokens, ledgers)

Surfaces create clues and choices.

Next: CHECKLIST.md and TEMPLATES.md.`,

  "CHECKLIST.md": `# Faction Dynamics Checklist

- [ ] Motive + method defined
- [ ] Assets listed (money/violence/law/info/legitimacy)
- [ ] Vulnerability + boundary defined
- [ ] Escalation ladder has 3–4 observable steps
- [ ] At least one internal split exists
- [ ] Transaction surface exists (place/ritual/intermediary)
- [ ] Any faction move leaves residue (records/witnesses/rumors)`,

  "TEMPLATES.md": `# Faction Dynamics Templates

## Template A: Faction card (internal)
- Name:
- Motive:
- Method:
- Assets:
- Vulnerability:
- Boundary:
- Internal split:
- Transaction surface:

## Template B: Escalation ladder
Trigger: [WHAT ADVANCES IT]
- Step 1: [LOW PRESSURE ACTION] (evidence: [OBSERVABLE SIGN])
- Step 2: [MID ACTION] (evidence: ...)
- Step 3: [HIGH ACTION] (evidence: ...)
- Deadline: [WHAT HAPPENS]

## Template C: “Pressure with a way out”
> The faction offers [EXIT CONDITION] if you accept [COST/COMMITMENT]. If you refuse, escalation advances to [NEXT STEP].`,

  "EXAMPLES.md": `# Faction Dynamics Examples

## Example: Escalation becomes legible
> The first sign isn’t violence. It’s prices. The innkeeper won’t say why; he just stops meeting your eyes. By the time you notice the same two men at two different corners, the ledger has your name written in the wrong ink. The faction is moving—and it’s doing it in daylight.`,
});

const WORLDBUILDING_ECONOMY_FRICTION_PACK = pack("worldbuilding-economy-friction", {
  "SKILL.md": `---
name: worldbuilding-economy-friction
description: Use money, scarcity, and logistics to create grounded constraints and choices.
---

# Economy Friction (Scarcity, Prices, Logistics)

Economy friction grounds stakes:
- scarcity makes choices real
- logistics create time pressure
- prices signal power structures

This skill is NOT “make everything expensive.” It is “make tradeoffs visible.”

## When to use
- The world feels costless (infinite resources).
- Travel and supplies never matter.
- Bribes and purchases work like magic.

## Quick start (one scarcity axis + one clock)
1) pick 1–2 scarcity axes (medicine / warmth / legal access / bandwidth)
2) define one logistics clock (delivery / shift change / storm)
3) decide what money cannot buy (taboo, jurisdiction, reputation)

## Level 1: Prices are signals, not math
You don’t need a spreadsheet. You need signal:
- cheap: common + tolerated
- expensive: controlled + taxed + dangerous

Show via behavior:
- haggling, bribes, “not for sale,” sudden silence when money appears

## Level 2: Bribes create residue
If a bribe works, it creates:
- a debt (“you owe me again”)
- a record (someone noticed)
- a moral cost (someone suffers downstream)

If a bribe fails, show why:
- wrong jurisdiction / wrong person / surveillance / taboo

## Level 3: Logistics as clocks
Logistics create pressure naturally:
- goods arrive at dawn
- fuel runs out
- storms close roads
- guards change shifts

Use logistics to move scenes without forced plotting.

Next: CHECKLIST.md and TEMPLATES.md.`,

  "CHECKLIST.md": `# Economy Friction Checklist

- [ ] One scarcity axis is active (medicine/warmth/access/bandwidth)
- [ ] One thing money cannot buy is defined (taboo/jurisdiction/reputation)
- [ ] Spending creates residue (debt/record/moral cost)
- [ ] A logistics clock exists (delivery/shift/weather)
- [ ] Prices are shown via behavior (not math dump)`,

  "TEMPLATES.md": `# Economy Friction Templates

## Template A: “Not for sale”
> “For money?” [NPC laughs / goes quiet]. “No. For that, you need [CREDENTIAL/NAME/DEBT].”

## Template B: Bribe success with residue
> The coin disappears too fast. “Fine.”  
> But now [NPC] owns your name, and someone else saw the exchange.

## Template C: Logistics clock evidence
> The last cart leaves at [TIME]. The next one comes at [TIME]. If you miss it, the trail goes cold.`,

  "EXAMPLES.md": `# Economy Friction Examples

## Example: Money buys access, not legitimacy
> The clerk takes your payment without blinking. The stamp comes down hard. But the second clerk—older, quieter—leans in and tilts the document just enough for you to see the missing seal. “This will open a door,” he murmurs. “It won’t keep you safe once you’re through.”`,
});

const WORLDBUILDING_LAW_AND_JURISDICTION_PACK = pack("worldbuilding-law-and-jurisdiction", {
  "SKILL.md": `---
name: worldbuilding-law-and-jurisdiction
description: Make law and jurisdiction operational: procedures, permissions, and how rules create pressure.
---

# Law and Jurisdiction (Procedures + Permissions + Enforcement)

Law is a worldbuilding engine because it turns “can I?” into “can I here, now, without consequences?”

## When to use
- Authority exists as vibes (“guards are scary”) but doesn’t shape play.
- Crimes have no trace; enforcement is random.
- Regions feel identical (no boundary effects).

## Quick start (PPP)
For the current location, define:
1) Permission: what credential matters (seal, badge, witness, title)?
2) Procedure: what steps must happen (check, stamp, queue, record)?
3) Pressure: what happens if you bypass it (fines, arrest, rumor, faction attention)?

Then show one procedure detail in-scene.

## Level 1: Jurisdiction boundaries create choices
Boundaries:
- city vs temple district
- guild territory
- corporate campus

Crossing boundaries should change:
- who can stop you
- what records exist
- what punishments apply

## Level 2: Procedures are playable friction
Procedures create cost without combat:
- forms, waiting rooms, identity checks
- who has the stamp vs who has the ledger

Procedures are also information sources (records).

## Level 3: Enforcement has incentives (not omniscience)
Define:
- what enforcement wants (bribes? order? quotas? reputation?)
- what they fear (scandal, failure, rival jurisdiction)

This makes enforcement consistent and exploitable.

## Level 4: Penalties leave residue
Punishment creates residue:
- fines create debt
- arrests create records
- warnings create surveillance

## Level 5: Exceptions are expensive
Fast exceptions exist, but they cost:
- debt (favor)
- exposure (your name is recorded)
- reputation (owing the wrong person)

## Anti-patterns
- “guards appear” without procedure or evidence
- instant absolution after major crimes
- law that never affects common actions

Next: CHECKLIST.md and TEMPLATES.md.`,

  "CHECKLIST.md": `# Law and Jurisdiction Checklist

- [ ] Permission gate exists (seal/badge/witness/title)
- [ ] Procedure exists (check/stamp/queue/record)
- [ ] Pressure exists for bypass (fine/arrest/rumor/heat clock)
- [ ] Boundary effects are real (different rules in different areas)
- [ ] Enforcement has incentives and fears (consistent behavior)
- [ ] Penalties create residue (debt/records/surveillance)`,

  "TEMPLATES.md": `# Law and Jurisdiction Templates

## Template A: Gate + bypass options
Gate:
> Without [CREDENTIAL], you can’t do [ACTION] cheaply.
Options:
- Legit: [GET CREDENTIAL] (cost: time/procedure)
- Bribe: [PAY] (residue: debt/record)
- Bypass: [ILLEGAL METHOD] (risk: surveillance/arrest)

## Template B: Enforcement incentive line
> “I don’t care what you did,” [OFFICER] says. “I care what I can *write down*.”`,

  "EXAMPLES.md": `# Law and Jurisdiction Examples

## Example: Procedure creates playable pressure
> The guard doesn’t ask what you want. He asks what you’re carrying. His eyes flick to the ledger before they flick to your face. You can talk your way through the queue, you can pay to skip it, or you can slip in the side door and accept what a missing entry will cost later.`,
});

const WORLDBUILDING_MAGIC_SYSTEM_CONSTRAINTS_PACK = pack("worldbuilding-magic-system-constraints", {
  "SKILL.md": `---
name: worldbuilding-magic-system-constraints
description: Build magic systems as constraints: costs, limits, residue, institutions, and failure modes.
---

# Magic Systems (Constraints, Costs, Residue)

Magic becomes believable and playable when it has:
- hard limits (cannot do)
- soft limits (costs)
- residue (traces)
- institutions (who controls it)
- failure modes (how it goes wrong)

## When to use
- Magic feels like a free solution.
- Spells have no downside, so choices collapse.
- The world doesn’t react to supernatural events.

## Quick start (H + S + R)
For the next magical effect, define:
1) Hard limit: one thing it cannot do
2) Soft cost: what it costs the caster/user
3) Residue: what it leaves behind (detectable by someone)

## Level 1: Limits create verbs
Good limits force alternative methods:
- range, line-of-sight, time to prepare, ingredients, consent

## Level 2: Costs should change future play
Costs that matter:
- fatigue, injury, social suspicion, legal attention, corruption, debt to a patron

Avoid “costs” that are just flavor words.

## Level 3: Residue makes magic part of the world
Residue types:
- physical (frost, scorch, warped material)
- social (witness stories, taboo panic)
- institutional (records, guild interest, temple audits)

## Level 4: Institutions and policing
Define:
- who can practice legally
- what credentials exist
- how violations are detected

## Level 5: Failure modes create story engines
Failure modes:
- backlash, misfire, contamination, attention drawn, wrong target, debt invoked

Failure should create a new constraint, not just “nothing happens.”

## Anti-patterns
- unlimited magic solving every blocker
- no residue/no reaction
- costs that never bite

Next: CHECKLIST.md and TEMPLATES.md.`,

  "CHECKLIST.md": `# Magic System Checklist

- [ ] Hard limit defined (cannot do X)
- [ ] Soft cost defined (fatigue/debt/attention/corruption)
- [ ] Residue defined (physical/social/institutional)
- [ ] Institution/policing defined (who controls/detects)
- [ ] Failure mode defined (how it goes wrong)
- [ ] Costs and failures change future play (new constraints)`,

  "TEMPLATES.md": `# Magic System Templates

## Template A: Spell/effect card
- Effect:
- Hard limit:
- Soft cost:
- Residue:
- Who can detect residue:
- Failure mode:

## Template B: Residue payoff line
> Magic worked. It also left [RESIDUE]. Anyone who knows what to look for will read it as [INTERPRETATION].`,

  "EXAMPLES.md": `# Magic System Examples

## Example: Residue creates a future problem
> The ward holds, and the air in the doorway turns cold enough to sting. You’re safe—for now. But the frost pattern on the frame is a signature. Someone trained will see it and know exactly which school of magic you used.`,
});

const WORLDBUILDING_TRAVEL_AND_DISTANCE_PACK = pack("worldbuilding-travel-and-distance", {
  "SKILL.md": `---
name: worldbuilding-travel-and-distance
description: Make travel meaningful: distance, time, exposure, logistics, and boundary effects.
---

# Travel and Distance (Time + Exposure + Logistics)

Travel matters when it creates:
- time costs (missed windows)
- exposure (being seen, leaving traces)
- logistics problems (supplies, weather, routes)

## When to use
- The world feels small; places are adjacent by narration.
- Travel never changes stakes.
- Chases and arrivals feel arbitrary.

## Quick start (DTE)
For the next movement between locations, define:
1) Distance/time (how long, in concrete terms)
2) Threat/exposure (who might notice, what traces are left)
3) Event (one travel complication or opportunity)

Then show one travel cost signal (fatigue, delay, witness).

## Level 1: Distance is a clock
Distance creates deadlines:
- “If you leave now, you arrive after curfew.”
- “If you detour, you lose the contact window.”

## Level 2: Routes have personalities (constraints + affordances)
Give each route:
- one affordance (cover, speed, concealment)
- one constraint (law, terrain, weather, surveillance)

## Level 3: Logistics create tension without combat
Logistics:
- food, water, fuel, mounts, permits, shelter

You don’t need math. You need tradeoffs.

## Level 4: Boundary effects
Crossing boundaries changes:
- who can stop you
- what rules apply
- what records exist

## Level 5: Travel leaves residue
Residue:
- rumors, sightings, tracked purchases, footprints, timestamps

## Anti-patterns
- teleport travel with no cost
- endless random encounters
- distance that doesn’t affect timing

Next: CHECKLIST.md and TEMPLATES.md.`,

  "CHECKLIST.md": `# Travel and Distance Checklist

- [ ] Time is concrete (hours, curfew, window)
- [ ] Exposure exists (witnesses/traces/records)
- [ ] Route has affordance + constraint
- [ ] Logistics create tradeoffs (supplies/permits/shelter)
- [ ] Boundaries change rules (jurisdiction effects)
- [ ] Travel leaves residue (rumors/timestamps/footprints)`,

  "TEMPLATES.md": `# Travel and Distance Templates

## Template A: Route menu (fast/safe/leverage)
- Fast: [ROUTE] (risk: exposure)
- Safe: [ROUTE] (cost: time)
- Leverage: [ROUTE] (cost: debt/credential)

## Template B: Travel complication (one beat)
> [WEATHER/LAW/TERRAIN] forces a choice: [OPTION A] or [OPTION B], each with a cost.`,

  "EXAMPLES.md": `# Travel and Distance Examples

## Example: Distance creates a moral tradeoff
> The safe road gets you there after curfew. The shortcut gets you there on time—but it cuts through a district where your name is already written down. You can arrive clean and late, or arrive on time and hunted.`,
});

const WORLDBUILDING_CULTURE_AND_RITUAL_PACK = pack("worldbuilding-culture-and-ritual", {
  "SKILL.md": `---
name: worldbuilding-culture-and-ritual
description: Build culture as operational rules: rituals, taboos, status signals, and what they cost to break.
---

# Culture and Ritual (Rules People Live By)

Culture is worldbuilding that changes decisions.
It is not “lore paragraphs.” It is:
- what people assume
- what people punish
- what people trade for belonging

## When to use
- Cultures feel like cosmetic aesthetics (clothes/food only).
- NPC behavior feels generic across regions.
- Taboos exist but never constrain action.

## Quick start (RST)
For this location, define:
1) **Ritual** (what everyone does publicly)
2) **Status signal** (how rank is displayed and enforced)
3) **Taboo** (what cannot be said/done, and why)

Then show one of these within the first paragraph of the scene.

## Level 1: Rituals create predictable behavior
Ritual types:
- greeting order
- payment ritual
- cleanliness/threshold rules
- naming rules (titles, taboo names)

Rituals should be testable: break them and observe reactions.

## Level 2: Taboos are enforcement + incentive
Define:
- who enforces the taboo (family, priest, guard, guild)
- what punishment looks like (shame, fines, exclusion, violence)
- what breaking it might gain (leverage, access, truth)

## Level 3: Status is an access gate
Status gates:
- who can speak first
- who can touch objects
- who can enter rooms

Status is visible in micro-actions (interruptions, seating, eye contact).

## Level 4: Cultural friction creates story
Friction sources:
- outsider mistakes
- conflicting values (honor vs profit)
- rituals that collide with logistics (curfew + feast)

## Level 5: Culture leaves records (memory)
Cultures remember via:
- gossip networks
- public shaming
- ledgers and seals

Actions create residue in social memory.

## Anti-patterns
- “exotic culture” described only as visuals
- taboos with no enforcement or payoff
- cultures that never react to violations

Next: CHECKLIST.md and TEMPLATES.md.`,

  "CHECKLIST.md": `# Culture and Ritual Checklist

- [ ] Ritual defined (public, repeatable)
- [ ] Status signal defined (who ranks higher and how it shows)
- [ ] Taboo defined (rule + why)
- [ ] Enforcement defined (who punishes, how)
- [ ] Breaking taboo has tradeoffs (cost + potential gain)
- [ ] Culture produces memory/records (gossip, shame, ledgers)`,

  "TEMPLATES.md": `# Culture and Ritual Templates

## Template A: Culture card (internal)
- Ritual:
- Status signal:
- Taboo:
- Enforcement:
- Reward for conformity:
- Risk for violation:

## Template B: First-paragraph embed
> Everyone [RITUAL], and anyone who doesn’t gets [REACTION]. The [STATUS SIGNAL] decides who speaks first. One word—[TABOO]—is never said here.`,

  "EXAMPLES.md": `# Culture and Ritual Examples

## Example: Status gate becomes play
> In this market, buyers speak first. Sellers respond. Breaking that order isn’t illegal, but it is insulting, and insults have prices. When you speak out of turn, the nearest vendor doesn’t argue—she simply stops meeting your eyes, and three stalls down someone repeats your words with a laugh that makes you smaller.`,
});

const WORLDBUILDING_INFRASTRUCTURE_AND_UTILITIES_PACK = pack("worldbuilding-infrastructure-and-utilities", {
  "SKILL.md": `---
name: worldbuilding-infrastructure-and-utilities
description: Make infrastructure matter: water, power, transport, sanitation, comms—each as constraints and control points.
---

# Infrastructure and Utilities (Constraints + Control Points)

Infrastructure is an invisible antagonist/ally:
- it constrains action (blackouts, water rationing)
- it creates control points (checkpoints, permits)
- it creates story (who controls repairs, who profits)

## When to use
- Cities feel like backdrops with no systems.
- Travel and crowds don’t change risk.
- Technology/magic exists but infrastructure never fails.

## Quick start (WPTS)
Pick one system and define:
1) Who controls it (guild/corp/temple/council)
2) Failure mode (how it breaks)
3) Pressure clock (what worsens if ignored)
4) Service gate (what credential/payment is needed)

## Level 1: Utilities create routines
Routines:
- water delivery times
- power curfews
- trash collection schedules
- train departures

Routines create clocks without saying “clock.”

## Level 2: Control points create encounters
Control points:
- wells and pumps
- substations
- bridges and tolls
- comm towers

Each control point can be gated (permit, bribe, force).

## Level 3: Failures create constraints
Failure consequences:
- disease risk
- darkness and surveillance shifts
- transport delays
- rationing and riots

## Level 4: Repairs are politics
Repairs require:
- parts (scarcity)
- labor (guild power)
- authority (permits)

## Level 5: Infrastructure leaves records
Records:
- repair logs
- ration cards
- toll books

Records are clues and threats.

## Anti-patterns
- cities with no logistics
- failures that never affect decisions
- infrastructure controlled by “nobody”

Next: CHECKLIST.md and TEMPLATES.md.`,

  "CHECKLIST.md": `# Infrastructure and Utilities Checklist

- [ ] Controller defined (who owns/maintains)
- [ ] Failure mode defined (how it breaks)
- [ ] Routine/clock exists (delivery/curfew/schedule)
- [ ] Control point exists (bridge/well/station/tower)
- [ ] Gate exists (credential/payment/bribe/force)
- [ ] Records exist (logs/cards/books)`,

  "TEMPLATES.md": `# Infrastructure and Utilities Templates

## Template A: Utility card
- System:
- Controller:
- Failure mode:
- Routine:
- Gate:
- Control point:
- Records:

## Template B: Failure beat
> The [SYSTEM] fails in a specific way: [EVIDENCE]. That means [CONSTRAINT]. Fixing it costs [COST] and involves [POWER HOLDER].`,

  "EXAMPLES.md": `# Infrastructure and Utilities Examples

## Example: Water as power
> The well is public, but the pump key is not. The council keeps it on a chain, and the chain is a policy. You can queue and comply, you can bribe the keyholder, or you can break the lock and accept what a broken lock makes you in a town that counts bolts like votes.`,
});

const WORLDBUILDING_HISTORY_AS_RESIDUE_PACK = pack("worldbuilding-history-as-residue", {
  "SKILL.md": `---
name: worldbuilding-history-as-residue
description: Use history as present constraints: scars, records, taboos, and institutions shaped by past events.
---

# History as Residue (Scars + Records + Taboos)

History matters when it is not “backstory” but **constraints and incentives**.
Past events should leave:
- physical scars
- social scars
- institutional procedures

## When to use
- Setting history exists only in lore dumps.
- Places feel timeless (no scars, no changes).
- Factions have no memory of past defeats.

## Quick start (3 residues)
Pick one past event and write:
1) one physical residue (ruin, monument, contamination)
2) one social residue (fear, taboo, proverb)
3) one institutional residue (procedure, law, guild rule)

Then show one residue in the current scene as a constraint.

## Level 1: Scars constrain movement and behavior
Scars:
- collapsed bridge forces routes
- burned district changes policing
- memorial changes public speech

## Level 2: Records are leverage
Records:
- trial transcripts
- permit archives
- payroll books

Records can be stolen, forged, or revealed—each with costs.

## Level 3: Taboos are history made portable
Taboos often encode old disasters:
- “never ring the bell”
- “never light a flame in the temple district”

## Level 4: Institutions are fossils
Institutions keep old fears alive:
- redundant stamp checks
- curfews
- border audits

## Level 5: History creates repeating patterns (and opportunities)
Patterns:
- who profits from the scar
- who wants to reopen the wound
- who enforces “never again”

## Anti-patterns
- encyclopedia history paragraphs mid-scene
- history that never affects current decisions
- “ancient evil” with no present-day procedures

Next: CHECKLIST.md and TEMPLATES.md.`,

  "CHECKLIST.md": `# History as Residue Checklist

- [ ] Past event chosen
- [ ] Physical residue defined (scar/monument/contamination)
- [ ] Social residue defined (fear/taboo/proverb)
- [ ] Institutional residue defined (procedure/law/rule)
- [ ] A current scene shows one residue as a constraint
- [ ] Records create leverage with costs (steal/forge/reveal)`,

  "TEMPLATES.md": `# History as Residue Templates

## Template A: Past event card
- Event:
- Physical residue:
- Social residue:
- Institutional residue:
- Who benefits now:
- Who enforces memory:

## Template B: Constraint-in-scene line
> The [RESIDUE] isn’t decoration. It means you can’t [EASY ACTION] without [COST].`,

  "EXAMPLES.md": `# History as Residue Examples

## Example: Procedure as fossil
> The clerk stamps twice, not because it’s necessary, but because once—years ago—someone made a single stamp mean a massacre. Now the second stamp is ritual and defense. Skipping it isn’t just illegal. It’s a statement.`,
});

export const WORLDBUILDING_SKILLS: GlobalSkillSeed[] = [
  ...WORLDBUILDING_LOCATION_AS_SYSTEM_PACK,
  ...WORLDBUILDING_FACTION_DYNAMICS_PACK,
  ...WORLDBUILDING_ECONOMY_FRICTION_PACK,
  ...WORLDBUILDING_LAW_AND_JURISDICTION_PACK,
  ...WORLDBUILDING_MAGIC_SYSTEM_CONSTRAINTS_PACK,
  ...WORLDBUILDING_TRAVEL_AND_DISTANCE_PACK,
  ...WORLDBUILDING_CULTURE_AND_RITUAL_PACK,
  ...WORLDBUILDING_INFRASTRUCTURE_AND_UTILITIES_PACK,
  ...WORLDBUILDING_HISTORY_AS_RESIDUE_PACK,
];
