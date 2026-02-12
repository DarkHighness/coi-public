/**
 * VFS Global Skills - Main Entry Point
 *
 * This module provides the global skills library for VFS.
 * Skills are generated from atoms and served as read-only markdown files.
 */

import type { VfsFile, VfsFileMap } from "../types";
import { hashContent, normalizeVfsPath } from "../utils";
import type { GlobalSkillSeed } from "./types";
import {
  SKILLS_README_SEED,
  SKILLS_STYLE_SEED,
  SKILLS_TAXONOMY_SEED,
  buildSkillsIndexSeed,
  type SkillIndexEntry,
} from "./manifest";
import {
  generateVfsSkillSeeds,
  getSkillCatalogEntries,
  type SkillCatalogEntry,
} from "./generator";

// ============================================================================
// Theme Skills (Deepened - 10 Core Themes)
// ============================================================================

type ThemeSkillExample = {
  scenario: string;
  wrong: string;
  right: string;
};

type ThemeSkillTemplate = {
  name: string;
  body: string;
};

type ThemeSkillDef = {
  slug: string;
  title: string;
  description: string;
  aliases?: string[];
  whenToLoad: string;
  coreConstraints: string[];
  pressureMechanisms: string[];
  level1: string[];
  level2: string[];
  advanced: string[];
  antiPatterns: string[];
  templates: ThemeSkillTemplate[];
  examples: ThemeSkillExample[];
};

function mdList(items: string[]): string {
  return items.map((i) => `- ${i}`).join("\n");
}

type ThemeDepth = {
  scenePatterns: string[];
  clocks: string[];
  checklist: string[];
};

type ThemeSkillResolvedDef = ThemeSkillDef & ThemeDepth;

// Theme-specific depth blocks (no reliance on themes.ts as a source of truth).
// This is a curated library of reusable mechanisms for each theme skill.
const THEME_DEPTH: Record<string, ThemeDepth> = {
  fantasy: {
    scenePatterns: [
      "Magic adjudication: intent → cost → limitation → failure mode → who notices (guild/temple/creature).",
      "Institution gate: license/ritual/letter → workaround (insider/forgery/bribe) → verification (audit, ward check).",
      "Residue site: threshold → taboo → consequence (curse/debt/attention) → new obligation.",
      "Oath leverage: public vow vs private intent → enforcement → price of breaking face.",
      "Monster ecology: warning signs → mitigation → consequence (not random ambush).",
      "Scarcity engine: components/routes/sanctuaries are limited; someone profits.",
      "Prophecy as faction conflict: ambiguous line → competing interpretations → political moves.",
      "Long-tail debt: power used now creates obligations that return later.",
      "Relic authentication: provenance → test ritual → counterfeit economy → institutional dispute.",
      "Border law: temple edict vs court decree vs local custom; crossing lines changes what is 'allowed'.",
      "Sanctuary logistics: who can host, what it costs, and what breaks neutrality (taboo, pursuit, debt).",
      "Divine politics: gods/spirits have jurisdictions; miracles create paperwork (tithes, vows, pilgrimages).",
    ],
    clocks: [
      "Now: pay a cost or choose a workaround (risk vs duty).",
      "3 days: an institution notices patterns; gates tighten.",
      "7 days: debt/oath comes due (spirit, guild, temple, patron).",
      "Long tail: magic leaves residue (curse, stigma, political backlash).",
    ],
    checklist: [
      "Magic has a cost + limit + failure mode (no wish fulfillment).",
      "At least one institution gate exists with workaround + verification risk.",
      "Residue appears (ruin/taboo/treaty/curse) and constrains choices.",
      "A long-tail obligation advances (debt, oath, patronage).",
      "NPCs have agendas and prices; helpers are not free.",
      "Scarcity is concrete (components, safe routes, sanctuaries).",
      "Scene ends with a choice (pay/bargain/steal/risk corruption).",
      "Authority is plural: at least two institutions disagree on legitimacy.",
      "Miracles and relics leave records (witnesses, seals, rites) that matter later.",
      "The supernatural changes the mundane (trade, travel, law), not just combat.",
    ],
  },
  noir: {
    scenePatterns: [
      "Leverage exchange: every scene trades secrets/favors/protection for information.",
      "Source-cost clue: each clue has a source, motive, and acquisition cost.",
      "Procedural pressure: audits, raids, license threats as system response to exposure.",
      "Double-cross with incentives: betrayal is legible in hindsight.",
      "Fair red herring: reveals a different secret that explains behavior.",
      "Violence ladder: intimidation → injury → killing; heat rises each step.",
      "Reputation fracture: scandal changes access (doors close, allies demand prices).",
      "Compromise ending: winning costs dignity, safety, or loyalty.",
      "Paper trail warfare: records are altered/withheld; proving tampering becomes a scene engine.",
      "Witness management: protection, intimidation, or bribery shifts what can be said and who can hear it.",
      "Paid narrative: press/rumor brokers sell versions of the truth; publicity becomes leverage.",
      "Internal enemies: 'good' institutions have factions (IA, prosecutors, unions) with competing incentives.",
    ],
    clocks: [
      "Now: leverage moves; someone pays to silence or expose.",
      "24h: evidence/witnesses change; pressure increases.",
      "7 days: institutional response (audit/raid/freeze) reshapes access.",
      "Long tail: reputational debt and obligation chains persist.",
    ],
    checklist: [
      "Each clue has source + motive + acquisition cost.",
      "At least one leverage relationship advances (debt/blackmail/dependency).",
      "Institutional pressure exists when exposure rises.",
      "Violence is consequential (injury, heat, witnesses, revenge).",
      "Red herrings are fair (explain behavior, don't contradict facts).",
      "Scene ends with a compromise choice (pay/lie/expose/take fall).",
      "A cover story is required for at least one action (and can be checked later).",
      "Someone competent tries to control the narrative (documents, alibis, press).",
      "A 'win' creates a new debt or damages a relationship permanently.",
    ],
  },
  horror: {
    scenePatterns: [
      "Threat rule: what it wants/avoids → warning signs → escalation.",
      "Temporary safety: shelter with a failure mode; safety buys time, not victory.",
      "Exposure clock: signs → contact → breach → irreversible change.",
      "Resource bleed: light/ammo/medicine/sleep drain forces choices.",
      "Isolation: help delayed/unavailable; communication unreliable or dangerous.",
      "Uncertain ally: fear makes people irrational; trust has costs.",
      "Dangerous knowledge: truth increases exposure or social risk.",
      "Aftermath scar: stigma/trauma/registry marks persist.",
      "Ritual mitigation: each 'countermeasure' has a price and a way it can backfire.",
      "Contagion vector: define how it spreads (touch, rumor, file, dream) and what slows it.",
      "Taboo enforcement: community rules create conflict (break taboo to survive, pay social cost).",
      "False normalcy: a comforting routine hides a crack; reveal it by breaking the routine.",
    ],
    clocks: [
      "Now: warning signs escalate; safety is fragile.",
      "Tonight: exposure increases; the threat tests boundaries.",
      "3 days: resources run low; irreversible change approaches.",
      "Long tail: scars and stigma persist.",
    ],
    checklist: [
      "Threat rule is consistent; escalation is legible.",
      "Safety is temporary and has a failure mode.",
      "Resource bleed forces choices (not just mood).",
      "Information is partial and costs something to confirm.",
      "Allies behave plausibly under fear and self-preservation.",
      "Aftermath leaves persistent constraint (scar/stigma/taboo).",
      "Countermeasures exist but are costly or risky (no easy immunity).",
      "Exposure has a concrete vector and threshold (what triggers 'too late').",
      "The ending changes the protagonist's life (scar, belief, record, isolation).",
    ],
  },
  cyberpunk: {
    scenePatterns: [
      "Access gate (badge/contract) → workaround (key/insider) → audit trail (logs) → delayed response.",
      "Heat ledger: jobs create heat that changes gates and watchlists in 7 days.",
      "Service contract pressure: maintenance/subscription → dependency → leverage.",
      "Incident response ladder: anomaly → review → containment → raid (not omniscience).",
      "Counterplay symmetry: spoof/jam/hack has detection thresholds and costs.",
      "Identity economy: forged IDs → verification risk → broker obligations.",
      "Infrastructure chokepoint: data center/lock/pump is objective; fights are consequence.",
      "Cover story scene: plausible deniability is a required step.",
      "Medical debt lever: clinic/corp owns treatment; health becomes a contract and a leash.",
      "Broker spiral: favors for access create obligation chains with receipts and deadlines.",
      "Territory protocol: gangs vs corp security have different rules; crossing zones changes tactics.",
      "Supply-chain sabotage: shipments, parts, and maintenance schedules become action targets.",
    ],
    clocks: [
      "Now: anomaly is logged; you gain speed but create a trail.",
      "24h: review triggers; access gates tighten.",
      "7 days: audit/crackdown cycle reshapes access and assets.",
      "Long tail: watchlists/blacklists/warrants persist.",
    ],
    checklist: [
      "At least one access gate exists with workaround + audit trail.",
      "Every hack/spoof has counterplay and detection thresholds.",
      "Heat ledger advances (future access changes).",
      "Maintenance dependency creates leverage (clinic/corp/gang).",
      "Security response is procedural, not instant omniscience.",
      "Scene ends with speed vs traceability vs legality tradeoff.",
      "At least one 'receipt' exists (log, camera, transaction, witness) that can be audited later.",
      "A broker/contractor exists who can help—but demands collateral or ongoing service.",
      "Infrastructure and logistics matter (power, comms, supply, medical, transportation).",
    ],
  },
  mystery: {
    scenePatterns: [
      "Three-lane clues: scene evidence + witness/social + documents/records; each lane costs something.",
      "Evidence decay: tomorrow differs; time changes what can be found.",
      "Suspect logic: motive/means/opportunity + one alibi flaw that can be tested.",
      "Fair red herring: points to another secret, not the core crime.",
      "Heat escalation: questioning changes NPC behavior and access gates.",
      "Reveal as action: each reveal changes access/alliances/risk.",
      "Institutional proof: define what convinces courts/temples/corps.",
      "End scene with next lead + decision: two routes with tradeoffs.",
      "Timeline reconstruction: force the table to place events; contradictions become playable tests.",
      "Proof vs persuasion: what convinces people differs (judge, elder, corp counsel, mob boss).",
      "Conflicting testimony: each witness is right about one thing and wrong about another (bias, fear).",
      "Misdirection has cost: suspects take actions that create new evidence trails or risks.",
    ],
    clocks: [
      "Now: you can get a clue, but it costs time/money/exposure.",
      "Tomorrow: evidence decays; suspects counter-move.",
      "7 days: institutional outcome forces a decision (trial/crackdown/deal).",
      "Long tail: truth destabilizes power; access changes permanently.",
    ],
    checklist: [
      "At least one actionable lead is produced this turn.",
      "Clue has a source and is interpretable (not single obvious meaning).",
      "Time pressure changes evidence or incentives.",
      "Suspects act rationally; counter-moves are plausible.",
      "Reveal changes choices, not just lore.",
      "Two next routes exist with clear tradeoffs.",
      "What counts as 'proof' is explicit for the current authority.",
      "At least one testable contradiction exists (timeline, alibi, record).",
      "A partial truth is weaponized (someone uses it to gain leverage).",
    ],
  },
  romance: {
    scenePatterns: [
      "Chemistry engine: desire(A)+desire(B)+incompatibility+external pressure.",
      "Care through action: gestures with costs; words are cheap unless backed.",
      "Boundary tension: consent/propriety/safety lines constrain choices.",
      "Misunderstanding with incentives: secrets protect something real.",
      "Public/private split: scandal economy turns intimacy into leverage.",
      "Trust tests: small repeated tests → rupture → repair; keep it earned.",
      "World intersection: class/law/institutions shape consequences.",
      "Irreversible threshold: confession/commitment changes future options.",
      "Shared project: solving a concrete problem forces collaboration (and exposes values).",
      "Third-party meddling: family, bosses, sects push incompatible outcomes with believable incentives.",
      "Love triangle with dignity: each choice has cost; no cartoon rivals.",
      "Repair scene: apology is specific, restitution is tangible, and boundaries are respected.",
    ],
    clocks: [
      "Now: a trust test; action vs avoidance shifts tone.",
      "1 week: external pressures collide with intimacy.",
      "1 month: commitment/rupture threshold becomes irreversible.",
      "Long tail: relationship choices reshape allies and access.",
    ],
    checklist: [
      "Care is shown via action with a cost (not speeches).",
      "A boundary creates tension (consent/propriety/safety/duty).",
      "External pressure intersects relationship (class/law/institutions).",
      "Trust shifts incrementally; misunderstandings have incentives.",
      "Scene ends with vulnerability choice (reach out/withdraw/lie/honesty).",
      "At least one repair/restitution action occurs after harm (not immediate forgiveness).",
      "A third party applies pressure that would exist even without romance (family, work, law).",
      "Intimacy changes future options (allies, reputations, access) in a concrete way.",
    ],
  },
  wuxia: {
    scenePatterns: [
      "Face economy: public claim → witness → apology/oath as outcome.",
      "Technique lineage: owner → cost → forbidden use consequences.",
      "Debt chain: gratitude owed → demanded service → new obligation cascade.",
      "Parallel authorities: jianghu vs imperial; warrants collide with honor.",
      "Tournament as politics: duels are stages for alliances and propaganda.",
      "Humiliation as weapon: loss of face triggers gates closing and bounties opening.",
      "Travel as gameplay: inns, letters of passage, ambush zones, rival routes.",
      "Master-disciple tension: duty vs desire; betrayal has costs.",
      "Inner injury as price: pushing power grants victory now but creates a recovery clock.",
      "Martial geography: terrain and routes privilege certain styles (bridges, rooftops, boats, forests).",
      "Righteous vs demonic labels: propaganda weaponizes morality; factions reframe incidents.",
      "Sect reputation ledger: letters and rumors update gates (inns, escorts, healers, patrons).",
    ],
    clocks: [
      "Now: face is on the line; the outcome becomes public record.",
      "3 days: sects respond; invitations/bounties shift access.",
      "7 days: debt obligations come due.",
      "Long tail: lineage webs reshape allies/enemies across regions.",
    ],
    checklist: [
      "Honor/face stakes are explicit and witnessed.",
      "Technique logic includes costs/limits; no free power spikes.",
      "Debt/obligation chain advances (gratitude, vows, patronage).",
      "Parallel authorities affect choices (jianghu vs imperial).",
      "Consequences propagate via letters, rumors, and bounties.",
      "A technique has lineage politics (who owns it, who polices it, who wants it).",
      "Victory has aftermath (face, injury, obligation), not a clean reset.",
      "Travel/time is explicit (routes, inns, escorts) so pursuit and evasion are playable.",
    ],
  },
  heist: {
    scenePatterns: [
      "3-layer security: physical + procedural (paperwork/audit) + social (identity/trust).",
      "Window scene: shift change/audit gap/festival creates timing constraints.",
      "Complication ladder: success triggers the next layer; complications are system response.",
      "Intel has cost: recon reveals, but creates exposure (witness/log).",
      "Exit-first design: escape is harder; plan aftermath and heat.",
      "Inside leverage: access broker sells keys/invites; betrayal has incentives.",
      "Procedural security: reports, audits, compliance, scapegoats after incident.",
      "Irreversibility: once the vault opens, future access changes structurally.",
      "Fence and laundering: converting loot creates scenes (buyers, proofs, disputes, law).",
      "Crew fault line: personal conflict maps onto a security layer; trust breaks at the worst time.",
      "Contingency trigger: define 'if X then Y' so improvisation feels like planning, not deus ex.",
      "Loot is a story object: it has provenance, claimants, and a verification method.",
    ],
    clocks: [
      "Now: window opens; layer 1 can be bypassed at a cost.",
      "1 hour: response ladder escalates; exits shrink.",
      "24h: incident reports/audits begin; scapegoats and crackdowns appear.",
      "Long tail: heat changes future access; blacklists and new gates persist.",
    ],
    checklist: [
      "Security has 3 layers (physical/procedural/social).",
      "A timing window exists and matters.",
      "Complications are system response, not random punishment.",
      "Exit/aftermath and heat are planned (audits, checkpoints).",
      "Intel and workarounds have costs and verification risks.",
      "A fence/buyer exists with verification and bargaining power.",
      "Cover identities get checked somewhere (badge, paperwork, social proof).",
      "The loot changes future access (claims, audits, obligations).",
    ],
  },
  "post-apocalypse": {
    scenePatterns: [
      "Bottleneck resource: who controls water/fuel/medicine → rationing politics → conflict.",
      "Settlement cost: joining requires labor/tribute/oath → enforcement → consequence of refusal.",
      "Salvage run: prize + hazard + counterfeit/repair bottleneck.",
      "Travel attrition: time/resources/exposure; chokepoints and gangs exist.",
      "Violence is logistical: bullets and wounds are clocks; medicine scarcity matters.",
      "Community politics: permits, scapegoats, expulsions, protection rackets.",
      "Old-world residue: registries, borders, ruins, trauma shape current law.",
      "Hope with cost: kindness creates obligations and reveals character.",
      "Disease ecology: outbreaks, quarantine, and medicine supply become story clocks.",
      "Fuel and transport: vehicles are power, but maintenance and parts are gates.",
      "New faiths and myths: meaning-making becomes institution (cults, oaths, taboos).",
      "Infrastructure triage: water/power/comms failures force governance choices.",
    ],
    clocks: [
      "Now: bottleneck choice sets faction response (pay/steal/work).",
      "3 days: shortages/disease escalate; routes become contested.",
      "7 days: settlement politics harden (ration changes, raids).",
      "Long tail: recovery debt and trauma reshape communities.",
    ],
    checklist: [
      "Bottleneck resource is concrete and politically controlled.",
      "Travel/logistics costs are explicit (time, water, exposure).",
      "Violence has injury clocks; medicine scarcity matters.",
      "Community membership has costs and enforcement.",
      "Old-world residue constrains choices (zones, registries, ruins).",
      "Medicine/disease pressure exists (injury is not a reset button).",
      "A salvaged asset has provenance and claimants (someone wants it back).",
      "A compromise deal exists that keeps people alive but costs ideals.",
    ],
  },
  "slice-of-life": {
    scenePatterns: [
      "Routine → small disruption → choice → gentle consequence tomorrow.",
      "Favor economy: kindness creates obligations; repay or relationship shifts.",
      "Schedule constraints: shifts, rent day, school deadlines as clocks.",
      "Micro-conflict: etiquette, pride, jealousy with incentives.",
      "Community memory: gossip velocity changes access to help/opportunity.",
      "Recurring NPCs with independent lives; world continues off-screen.",
      "Institution presence: landlord, clinic, school, job HR as subtle gates.",
      "Slow arc: repair, mastery, belonging earned without stakes inflation.",
      "Space as character: the shop, apartment, street has constraints and rituals that shape scenes.",
      "Interleaved subplots: small threads braid (neighbors, work, family) and echo each other.",
      "Slow reveal: history shows through habits and avoidance, not monologues.",
      "Repair economy: apologies and help are specific tasks with time costs.",
    ],
    clocks: [
      "Now: routine disruption forces a small tradeoff.",
      "Tomorrow: gentle consequence lands (awkwardness, trust shift).",
      "This week: obligations accumulate (rent day, exams, shifts).",
      "Long tail: relationships evolve; small choices compound.",
    ],
    checklist: [
      "Routine anchors the scene; disruption is specific.",
      "Choices cost time/energy/money; consequences persist gently.",
      "Favor economy and gossip velocity are present.",
      "Recurring NPCs have incentives and independent lives.",
      "Avoid stakes inflation; deepen meaning instead.",
      "At least one relationship shifts by 1% (trust, belonging, understanding).",
      "A place constraint matters (hours, weather, money, transit, noise).",
      "A repair action occurs after friction (small restitution, not instant harmony).",
    ],
  },
  "face-slapping-reversal": {
    scenePatterns: [
      "Opening mechanics: start from visible humiliation/underestimation, then plant one reversible leverage seed.",
      "Reversal chain: suppression → small proof → public turn → accountability.",
      "Status gate pressure: titles/credentials/lineage block access until proof breaks one gate.",
      "Receipt play: every comeback leaves an auditable object (recording, seal, witness, ledger).",
      "Crowd energy curve: private confidence rises before public recognition catches up.",
      "Countermove discipline: opponents retaliate procedurally (audits, bans, social exclusion), not as cartoon villains.",
    ],
    clocks: [
      "Now: take short-term loss to secure long-term leverage.",
      "24h: first concrete win flips one access gate.",
      "7 days: procedural backlash or public vindication reshapes status.",
      "Long tail: reversal success creates scrutiny and new rivals.",
    ],
    checklist: [
      "Opening includes clear suppression and a plausible reason others underestimate the protagonist.",
      "Each reversal is paid by preparation, receipts, or alliances (no instant omnipotence).",
      "Public opinion changes through visible events, not narration-only claims.",
      "At least one gate remains hard after each win to preserve pressure.",
      "Consequences persist: winning today creates tomorrow's retaliation or expectation.",
    ],
  },
  "tragic-angst": {
    scenePatterns: [
      "Opening mechanics: set an attachment + an irreconcilable pressure (duty, timing, survival, class).",
      "Misunderstanding with incentives: concealment protects someone, but compounds damage.",
      "Deferred truth: revelations arrive late enough to hurt, early enough to change choices.",
      "Harm ledger: emotional wounds map to concrete losses (status, shelter, trust, custody, safety).",
      "No-villain tragedy: multiple actors pursue reasonable goals that collide.",
      "Repair attempt with friction: apology + restitution + boundary, and forgiveness may still fail.",
    ],
    clocks: [
      "Now: choose between honesty and immediate protection.",
      "48h: silence creates secondary damage (rumor, mistrust, procedural penalty).",
      "7 days: accumulated hurt forces rupture or costly confrontation.",
      "Long tail: scars alter future intimacy, alliances, and life trajectory.",
    ],
    checklist: [
      "Pain is tied to character values and concrete stakes, not abstract suffering.",
      "Every major misunderstanding has a believable incentive and cost.",
      "Characters retain agency; tragedy comes from choices under constraint.",
      "At least one repair path exists, even if it fails.",
      "Emotional beats change future options (trust, access, social standing).",
    ],
  },
  "healing-redemption": {
    scenePatterns: [
      "Opening mechanics: establish wound + safe anchor + one small actionable step.",
      "Micro-repair loop: trigger → grounding action → support response → measured progress.",
      "Boundary-respect scenes: care is explicit, consent-based, and specific.",
      "Competence return: regained routine skill signals healing better than speeches.",
      "Setback without reset: relapse changes pace but does not erase prior progress.",
      "Community scaffolding: clinics, peers, family, mentors provide imperfect support with limits.",
    ],
    clocks: [
      "Now: one manageable care action is chosen.",
      "This week: routines and support obligations test commitment.",
      "This month: identity shifts from survival-only to purpose and contribution.",
      "Long tail: healed choices reshape relationships and social role.",
    ],
    checklist: [
      "Healing is shown through behavior change, not declarations alone.",
      "Support has boundaries and costs; helpers are not infinitely available.",
      "Setbacks are meaningful but non-catastrophic by default.",
      "Progress is incremental and accumulative.",
      "Redemption includes restitution where harm was caused.",
    ],
  },
  "mystery-horror": {
    scenePatterns: [
      "Opening mechanics: present one unsettling anomaly + one practical investigation task.",
      "Dual-lane pressure: every clue increases understanding and exposure at the same time.",
      "Evidence decay under dread: waiting changes both facts and threat behavior.",
      "Rule-fragment reveals: each new rule of the threat clarifies one tactic and closes another.",
      "Institutional denial vs panic: authorities underreact publicly while private containment escalates.",
      "Sanity/social erosion: fear degrades trust, witness reliability, and coordination.",
    ],
    clocks: [
      "Now: gain a clue at the cost of safety/exposure.",
      "Tonight: threat adapts to your current tactic.",
      "3 days: containment or outbreak phase changes access and movement.",
      "Long tail: truth leaves stigma, quarantine records, and recurring risk.",
    ],
    checklist: [
      "Clues are fair and actionable, but never fully remove dread.",
      "Threat rules are consistent and revealed in partial layers.",
      "Safety is temporary; each refuge has a failure mode.",
      "Investigation choices produce tangible tradeoffs.",
      "Aftermath persists (injury, records, trauma, social consequences).",
    ],
  },
  "epic-worldbuilding": {
    scenePatterns: [
      "Opening mechanics: frame one world-scale tension (empire, faith, ecology, technology) through a local scene.",
      "Layered institutions: at least two authorities conflict over legitimacy and enforcement.",
      "History residue chain: old settlement/war/catastrophe creates today's constraints.",
      "Macro-to-micro linkage: policy or warfront shifts alter local prices, routes, and loyalties.",
      "Frontier + center contrast: rules differ by distance from power center.",
      "Long campaign arcs: victories solve one layer while unlocking deeper systemic debt.",
    ],
    clocks: [
      "Now: local gate choice reveals one systemic pressure.",
      "7 days: faction/institution reactions shift access and alliances.",
      "1 season: resource, climate, or political cycles change strategic map.",
      "Long tail: regime, doctrine, and infrastructure transitions reshape eras.",
    ],
    checklist: [
      "World scale is expressed through concrete local consequences.",
      "Institutions have capacity limits, procedures, and incentives.",
      "At least one long-tail obligation carries across arcs.",
      "Geography/logistics meaningfully constrain strategy.",
      "Lore reveals create new playable decisions, not exposition-only blocks.",
    ],
  },
  "ip-faithful-adaptation": {
    scenePatterns: [
      "Opening mechanics: anchor iconic premise, then open one player-driven branch that stays canon-compatible.",
      "Canon boundary card: immutable pillars vs flexible interpretation zones.",
      "Voice and motif carryover: recurring symbols, rhetoric, and relationship dynamics stay recognizable.",
      "Constraint-driven invention: new content must explain why it could coexist with known events.",
      "Character integrity gate: actions must remain legible under the source character logic.",
      "Fan-trust loop: every deviation has an in-world reason and a continuity receipt.",
    ],
    clocks: [
      "Now: establish one canonical anchor in scene action.",
      "This arc: branch while preserving core pillars and tone signatures.",
      "Major reveal: reconcile new material with known timeline/relationships.",
      "Long tail: accumulated deviations are reviewed against canon integrity.",
    ],
    checklist: [
      "Source pillars are explicit before major divergence.",
      "New elements preserve character voice, motives, and world logic.",
      "Deviations include continuity receipts (timeline, witness, record, consequence).",
      "Adaptation avoids direct copy-paste while remaining recognizably faithful.",
      "Player agency can redirect outcomes without breaking core canon identity.",
    ],
  },
  "era-modern": {
    scenePatterns: [
      "ID/process gate → workaround → trail → delayed audit response.",
      "Procedural conflict: permits, queues, inspections, compliance as scenes.",
      "Cover story: plausible deniability is a step with cost.",
      "Media narrative: public story vs private truth; reputation as gate.",
      "Contract/debt: rent day, liability, collections as clocks.",
      "Response ladder: warning → detain → raid; capacity limits exist.",
      "Evidence standards: what convinces institutions; investigations are procedural.",
      "Institutional memory: records persist; actions return later.",
      "Insurance/liability: accidents trigger forms, claims, and investigations as clocks.",
      "Digital identity gameplay: accounts, OTPs, biometrics, lockouts; recovery has costs and trails.",
      "HR/legal asymmetry: institutions protect themselves; individuals need proof, allies, and leverage.",
      "Optics/PR pressure: narratives spread faster than facts; 'looking bad' changes access immediately.",
    ],
    clocks: [
      "Now: action creates a record (log/witness/transaction).",
      "24h: review begins (investigation/HR/compliance/police).",
      "7 days: audits/freezes/warrants/blacklists reshape access.",
      "Long tail: institutional memory changes the map permanently.",
    ],
    checklist: [
      "A procedural/ID gate appears with workaround and trail.",
      "Institutional memory exists (logs, records, witnesses).",
      "Response ladder is coherent and capacity-limited.",
      "Deadlines are concrete (rent day, court dates, shifts).",
      "Cover story is treated as gameplay when needed.",
      "A digital system constrains action with realistic failure modes (lockouts, logs, review).",
      "Proof standards are explicit for the current authority (HR, police, court, landlord).",
      "A mundane anchor detail grounds the scene (time, money, transit, paperwork).",
    ],
  },
  "era-ancient": {
    scenePatterns: [
      "Ritual legitimacy: rites are gates; refusal has social/legal costs.",
      "Jurisdiction boundary: clan vs magistrate vs temple.",
      "Travel and escort: passes, tolls, inns; rumor velocity is explicit.",
      "Seasonal scarcity: grain, water rights, conscription as politics.",
      "Public shame/apology: face traded for access.",
      "Records are human: seals, scribes, witnesses; forgery + audits exist.",
      "Ancestor duty: obligations and vendettas are long-tail arcs.",
      "Disaster legitimacy: famine/flood reshapes politics and scapegoats.",
      "Grain ledger politics: taxes, granaries, and missing shipments create investigations and riots.",
      "Omen economy: prophecies and portents are used for legitimacy; priests become power brokers.",
      "Scribe corruption: recordkeepers sell access; proving fraud requires witnesses and seals.",
      "Bloodline rites: marriage, adoption, and heirs are legal tools with ritual gates.",
    ],
    clocks: [
      "Now: ritual/face economy determines immediate access.",
      "3 days: rumor and brokers react (favor demands, retaliation).",
      "1 season: scarcity shifts routes, taxes, and law.",
      "Long tail: oaths and vendettas reshape future alliances.",
    ],
    checklist: [
      "Ritual legitimacy creates a gate with an explicit price.",
      "Jurisdiction boundaries matter (clan/court/temple).",
      "Travel and rumor velocity constrain action.",
      "Face/obligation enforcement exists and changes access tomorrow.",
      "Seasonality/scarcity can shift routes and politics.",
      "Records have gatekeepers (scribes, seals, witnesses) and can be contested.",
      "Scarcity is political (granaries, taxes, conscription), not just scenery.",
      "Lineage obligations exist and can be leveraged (marriage, heirs, adoption).",
    ],
  },
  "era-feudal": {
    scenePatterns: [
      "Oath/patronage gate: fealty opens access and creates obligations.",
      "Status markers gate access (letters, rings, sponsors).",
      "Guild/temple monopolies: controlled goods/routes with permits and workarounds.",
      "Slow justice: fines/confiscation/exile/indenture generate story.",
      "Rumor velocity: scandal fast; official news slow; misinformation is leverage.",
      "War logistics: supply, siege clocks, occupation costs.",
      "Marriage/hostage politics: lineage webs create alliances and threats.",
      "Jurisdiction collision: temple law vs noble decree vs guild codes.",
      "Heraldry and proof: coats, seals, and witnesses determine who is 'legitimate' in disputes.",
      "Serf obligations: labor/taxes/levies are enforced; evasion creates pursuit and punishment clocks.",
      "Siege math: food, disease, morale, and bribery determine outcomes more than heroics.",
      "Tithe economy: church taxes and exemptions become leverage; heresy trials are procedural weapons.",
    ],
    clocks: [
      "Now: oath decision opens one gate and closes another.",
      "7 days: messengers/rumor propagate consequences.",
      "1 season: harvest/war shifts scarcity, taxes, and law.",
      "Long tail: lineage and debt obligations persist.",
    ],
    checklist: [
      "Oaths/patronage create obligations that return later.",
      "Status markers gate access.",
      "Monopolies and toll routes create friction.",
      "Penalties generate story (not dead ends).",
      "Seasonality can shift scarcity and politics.",
      "Legitimacy can be proven/contested (seals, heraldry, witnesses).",
      "War outcomes depend on supply and morale clocks (not only duels).",
      "Lineage politics (marriage/hostages/heirs) creates durable stakes.",
    ],
  },
  "era-republican": {
    scenePatterns: [
      "Press + police: exposure triggers procedural retaliation.",
      "Concession boundary: different laws across streets; jurisdiction hopping.",
      "Club/patronage: invitations and sponsors gate access; scandal is currency.",
      "Bank/debt: contracts, collections, bribes, audits pressure choices.",
      "Corruption gates: specific bribe points + principled actors + verification risk.",
      "Surveillance partial: blind spots exist; logs reviewed later.",
      "Faction lattice: warlords, unions, foreign interests, police compete.",
      "Deadline beats: trials, banquets, announcements as clocks.",
      "Foreign concessions: consular law vs local police creates safe havens and traps.",
      "Union strikes: work stoppages change city logistics; bosses and police counter-move procedurally.",
      "Bank run panic: rumors trigger withdrawals; cash flow becomes a clock with scapegoats.",
      "Modern comms: telegraph/phone/newsprint accelerates rumor and coordination (and leaves records).",
    ],
    clocks: [
      "Now: exposure has immediate social effect.",
      "24h: police response shifts; checkpoints adjust.",
      "7 days: audits/asset freezes/blacklists reshape access.",
      "Long tail: faction realignment persists.",
    ],
    checklist: [
      "Media exposure and procedural retaliation are both in play.",
      "Jurisdiction boundaries can be used tactically.",
      "Bribe gates are specific and risky (audits exist).",
      "Debt/contract pressure creates clocks.",
      "Factions have incentives and internal tension.",
      "At least one cross-jurisdiction move exists (concession/law boundary) with tradeoffs.",
      "Records exist (papers, phones, registries) and can be leveraged or audited later.",
      "A faction uses institutions (police, unions, banks, press) rather than pure violence.",
    ],
  },
  "style-scifi": {
    scenePatterns: [
      "Capability triangle: access + cost/maintenance + counterplay (define all three).",
      "Audit trail: actions become investigations later; logs are stakeholders.",
      "Infrastructure bottlenecks: power/comms/transport define what is possible.",
      "Security posture: convenience vs control vs cost; informs response ladder.",
      "False positives + blind spots: friction and opportunity.",
      "Tech reshapes class: badge zones, subscriptions, private policing.",
      "Regulation vs black market: bans create markets; audits create workarounds.",
      "Second-order consequences: capability changes institutions and culture.",
      "Engineering tradeoff: gain X by sacrificing Y (power, heat, time, noise, mass).",
      "Life support as governance: air/water/temperature quotas become law and politics.",
      "AI policy surface: alignment rules, safety locks, and liability define who can deploy what.",
      "Hard failure modes: radiation, vacuum, cascade faults; safety buys time, not immunity.",
    ],
    clocks: [
      "Now: capability use trades power for traceability.",
      "24h: monitoring flags anomalies; containment begins.",
      "7 days: regulation/audit cycles tighten; black markets adapt.",
      "Long tail: second-order consequences reshape institutions.",
    ],
    checklist: [
      "Capabilities define access + cost + counterplay.",
      "Maintenance/failure mode exists (no free miracles).",
      "Audit trails exist; actions can be reviewed later.",
      "Infrastructure constraints are present (power/comms/transport).",
      "Second-order consequences are acknowledged.",
      "At least one engineering tradeoff is dramatized (not just lore).",
      "A governance rule exists because of infrastructure constraints (quotas, locks, liability).",
      "Failure modes are physical/procedural and drive scenes (containment, repairs, quarantines).",
    ],
  },
  "style-supernatural": {
    scenePatterns: [
      "Rule of the unseen: what it wants/avoids → warning signs → escalation.",
      "Ritual procedural: materials/time/witnesses → failure consequence.",
      "Knowledge gate: archives/initiation/oaths; truth has costs.",
      "Institution overlap: temple/agency/cult policing the unseen.",
      "Exposure escalation: learning/using power attracts attention.",
      "Relic economy: authentication/forgery/audits; pilgrimage routes as logistics.",
      "Secrecy logistics: double lives, cover-ups, stigma and registries.",
      "Schisms: doctrine disputes drive internal politics and conflict.",
      "Pact bargaining: terms, collateral, loopholes, and enforcement create story engines.",
      "Possession ladder: influence → control → assimilation; intervention has costs and stigma.",
      "Exorcism bureaucracy: permits, quarantine, evidence of 'supernatural cause' as a gate.",
      "Masquerade pressure: protecting secrecy forces lies, burnable identities, and scapegoats.",
    ],
    clocks: [
      "Now: ritual buys time; failure has visible consequence.",
      "Tonight: exposure escalates; the unseen tests boundaries.",
      "3 days: institutions react (cover-ups, witch hunts, quarantine).",
      "Long tail: pacts and residue persist; doctrine politics intensify.",
    ],
    checklist: [
      "The unseen has rules and an escalation pattern.",
      "Rituals have cost/time/materials and failure consequence.",
      "Knowledge is gated and dangerous; truths have prices.",
      "Institutions exist and enforce boundaries.",
      "Exposure escalation creates clocks; safety is temporary.",
      "Pacts/deals have terms, collateral, and enforcement (no free gifts).",
      "Secrecy costs time/relationships and creates cover story gameplay.",
      "A doctrine dispute or institutional faction conflict moves the plot.",
    ],
  },
  "trade-mercantilism": {
    scenePatterns: [
      "Route + chokepoint: controller sets taxes/bribes/permits; workarounds exist.",
      "Paperwork surface area: manifests/stamps/weights; audits and forgery gameplay.",
      "Credit obligation: lender terms → default consequence → obligation chain.",
      "Shock pricing: storms/raids/strikes change prices and alliances in 7 days.",
      "Smuggling system: storage, laundering, insider stamps, verification risks.",
      "Contract warfare: clauses, penalties, delivery windows, force majeure.",
      "Protection racket: underworld services + violence + informants.",
      "Politics of trade: embargoes, monopolies, patronage, concessions.",
      "Letter of credit gameplay: trust network, guarantors, and fraud investigations.",
      "Tariff war: policy changes create sudden arbitrage and retaliation clocks.",
      "Convoy protection: insurance/escorts/tolls; violence is priced, not free.",
      "Information asymmetry: someone knows a price/route/ban first; secrets become currency.",
    ],
    clocks: [
      "Now: paperwork/inspection gate forces a choice.",
      "3 days: route shock changes prices; rivals move.",
      "7 days: verification catches forgeries; contracts come due.",
      "Long tail: market shifts create new alliances/monopolies.",
    ],
    checklist: [
      "Route + chokepoint + controller are defined.",
      "Verification exists (stamps/weights/manifests) with audit risk.",
      "Credit/debt exists with default consequences.",
      "Prices move under shocks; scarcity creates politics.",
      "Smuggling has systemic costs and risks (not teleport).",
      "At least one contract clause matters (penalty, window, quality, force majeure).",
      "A trust network exists (guarantor, broker, guild) and can break under scandal.",
      "A market move creates winners/losers who counter-move procedurally.",
    ],
  },
  "court-intrigue": {
    scenePatterns: [
      "Ceremony as communication: seating, gifts, titles encode threats and alliances.",
      "Status gate: who may speak/enter/own; breach has a price.",
      "Archive control: documents as weapons; access is gated and surveilled socially.",
      "Procedure as violence: audits, seizures, invitations revoked, exile by decree.",
      "Scandal economy: gossip velocity + cover-ups; truth destabilizes power.",
      "Faction chess: 3 factions + internal split; appointments as battleground.",
      "Patronage demands: allies require favors or silence; obligation chains.",
      "Succession clock: heirs, marriages, treaties as campaign drivers.",
      "Protocol trap: etiquette rules create 'legal' insults; escaping costs face or favors.",
      "Gift debt: presents are contracts; refusing or over-gifting has consequences.",
      "Spymaster network: informants have incentives; false reports are a weapon.",
      "Hostage calculus: wards, marriages, and guarantees are governance tools with personal costs.",
    ],
    clocks: [
      "Now: public ceremony sets face and access for the next scene.",
      "3 days: factions counter-move via procedure (audits, appointments).",
      "7 days: scandal crystallizes; invitations and titles shift.",
      "Long tail: succession and reforms reshape power.",
    ],
    checklist: [
      "Status gate is explicit and enforced.",
      "Procedure is weaponized (audits, revocations, seizures).",
      "Scandal economy exists (rumor velocity and cover-ups).",
      "Factions have incentives and internal splits.",
      "Ceremony communicates threats and alliances.",
      "At least one protocol rule is relevant (seating, titles, gift etiquette).",
      "Documents/archives have gatekeepers and can be contested or forged.",
      "A favor creates a chain (repayment date, witness, leverage).",
    ],
  },
  "suspense-thriller": {
    scenePatterns: [
      "Visible clock: action/hesitation advances a timer.",
      "Partial clue with cost: confirm via risky fast path vs safe slow path.",
      "Pursuit ladder: tail → ambush → raid; antagonist is rational.",
      "False security: temporary relief hides a bigger trap.",
      "Exposure management: witnesses/logs/rumors create trails; cover stories cost time.",
      "Resource attrition: sleep, money, ammo, allies; fatigue creates mistakes.",
      "Irreversible thresholds: once crossed, options shrink; make it legible.",
      "Aftermath: heat, warrants, burned contacts persist into later scenes.",
      "Misdirection duel: both sides plant misleading trails; verification becomes gameplay.",
      "Competent antagonist: give them constraints, intel sources, and predictable priorities.",
      "Hostage calculus: saving one thing costs another (time, exposure, moral compromise).",
      "Safehouse failure mode: shelter buys time but creates new trails and obligations.",
    ],
    clocks: [
      "Now: a choice advances the clock (time vs exposure).",
      "Tonight: pursuit escalates; safe options shrink.",
      "3 days: institutions react; trails become audits and raids.",
      "Long tail: irreversible thresholds lock in consequences.",
    ],
    checklist: [
      "A visible clock exists and advances coherently.",
      "Information is partial; confirmation has a cost.",
      "Antagonist response ladder is rational and escalating.",
      "Exposure/trail management is present (logs, witnesses, rumors).",
      "Irreversible thresholds are legible (options shrink later).",
      "The antagonist can be outplayed using their constraints (capacity, rules, incentives).",
      "At least one verification step exists (confirm trail, validate intel) with tradeoffs.",
      "Temporary safety has a failure mode (raids, betrayals, audits, exhaustion).",
    ],
  },
  "chinese-short-drama": {
    scenePatterns: [
      "Reversal beat: public scene → status gate → reveal → immediate consequence → next pressure beat.",
      "Face economy: humiliation/apology/vow changes access tomorrow.",
      "Institution reaction: audits, seizures, invitations revoked; procedure is weapon.",
      "Sponsor/patronage: favors demanded; refusing costs protection and face.",
      "Deadline beats: banquet, trial day, wedding, announcement as clocks.",
      "Evidence standard: what convinces court/temple/guild; proof is a mechanic.",
      "Multi-faction chess: 3 factions, internal splits; betrayals have incentives.",
      "Cliffhanger with agency: tension rises but choices remain real.",
      "3-scene mini-arc: setup → reversal → consequence, then immediately reveal the next gate.",
      "Receipts beat: every twist leaves a 'proof object' (seal, letter, witness, ledger) that can be audited.",
      "Public/private split: private truth vs public story; saving face is a mechanic, not flavor.",
      "Speed with fairness: keep reveals legible in hindsight (who knew what, and why now).",
    ],
    clocks: [
      "Now: cliffhanger beat with agency lands (status gate + reveal).",
      "24h: public reaction and procedure weaponization begins.",
      "7 days: audits/seizures/appointments reshape access and alliances.",
      "Long tail: debts, vows, and reputational marks persist as arcs.",
    ],
    checklist: [
      "Reversal beat lands without contradicting established facts.",
      "Cliffhanger preserves player agency.",
      "Institutional reaction is procedural and fast.",
      "Face economy and patronage obligations drive pressure.",
      "Deadlines are concrete (banquet/trial/wedding/announcement).",
      "Each episode/turn adds a new gate (status/procedure/proof) rather than only new information.",
      "A proof object exists that can later be used against someone (receipt, witness, ledger).",
      "Characters pursue self-interest with incentives; betrayals are legible, not random.",
    ],
  },
  "element-war": {
    scenePatterns: [
      "Supply line objective: depot/route/chokepoint is target; battle is consequence.",
      "Campaign clock: rations/ammo/morale/politics forces decisions.",
      "Occupation cost: policing rules → insurgency sabotage → legitimacy blowback.",
      "Civilian market pressure: requisition → scarcity → riots/profiteers.",
      "Attrition: disease, desertion, corruption as silent killers.",
      "Strategic raids: burning depots changes maps.",
      "Alliance debt: wartime deals create obligations due later.",
      "Reconstruction paperwork: victory creates audits, contracts, corruption arcs.",
      "Rules of engagement: constraints create dilemmas (hostages, civilians, reprisals, tribunals).",
      "POW and intelligence economy: prisoners are leverage; exchanges and interrogations have costs.",
      "Morale operations: propaganda, pay, rest, and leadership legitimacy determine cohesion.",
      "Logistics sabotage: bridges, rails, fuel, and medicine are targets that reshape campaigns.",
    ],
    clocks: [
      "Now: a supply choice changes the front immediately.",
      "3 days: rations/morale clocks bite; markets react.",
      "7 days: occupation/insurgency reshapes control.",
      "Long tail: reconstruction and legitimacy crises persist.",
    ],
    checklist: [
      "Supply line/chokepoint exists and matters more than fights.",
      "A campaign clock exists (rations/ammo/morale/politics).",
      "Civilian market pressure is visible (scarcity, refugees).",
      "Occupation costs and insurgency methods are explicit.",
      "Victory creates new obligations (reconstruction, legitimacy, audits).",
      "Rules/constraints create dilemmas (ROE, tribunals, reprisals), not just tactics.",
      "Intelligence and prisoners create leverage scenes (exchange, betrayal, propaganda).",
      "Morale and pay/rest matter; units are organizations with incentives.",
    ],
  },
  "element-law": {
    scenePatterns: [
      "Jurisdiction boundary: authority stops somewhere; edge cases create play.",
      "Capacity-limited enforcement: response time/detention/evidence standards matter.",
      "Bribe gate + principled actor: corruption is specific and bounded.",
      "Appeal path: timelines, costs, and workarounds create gameplay.",
      "Procedure as weapon: summons, asset freezes, permits revoked.",
      "Penalties generate story: confiscation, bond, exile, indenture.",
      "Registry memory: marks and blacklists persist; travel restrictions bite.",
      "Contested truth: official vs folk vs private archives shape outcomes.",
      "Discovery bargaining: what documents exist, who can obtain them, and what it costs (time, risk, bribes).",
      "Plea/deal economy: settlements trade truth for speed; consequences persist socially.",
      "Precedent politics: similar cases become weapons; judges/elders have incentives and biases.",
      "Enforcement capture: the law exists, but who enforces it (and how) is the real gate.",
    ],
    clocks: [
      "Now: enforcement capacity and evidence standards shape immediate risk.",
      "3 days: investigation/summons begins; paperwork freezes possible.",
      "7 days: trial/appeal/penalty outcomes reshape assets and access.",
      "Long tail: registry marks and reform/backlash cycles persist.",
    ],
    checklist: [
      "Jurisdiction boundary exists; authority is not universal.",
      "Enforcement capacity is finite; response time matters.",
      "Evidence standard is defined (what counts as proof).",
      "Bribe gate + principled actor exist; corruption is risky.",
      "Appeal path exists; penalties generate next actions.",
      "A procedure step is dramatized (summons, discovery, hearing, appeal), not skipped.",
      "Enforcement incentives are explicit (who benefits, who is punished, who is protected).",
      "A record/registry exists and can be weaponized later (marks, blacklists, warrants).",
    ],
  },
  "element-academy": {
    scenePatterns: [
      "Credential gate: exam/project grants access; failure has lasting consequences.",
      "Schedule power: office hours, deadlines, rotations as clocks.",
      "Mentor gatekeeper: incentives and quotas shape help and obstruction.",
      "Rival procedural sabotage: complaints, audits, file flags, rumors.",
      "Scarce resources: labs, invites, scholarships; competition creates pressure.",
      "Discipline system: misconduct investigations as procedural weapon.",
      "Workarounds with risk: cheating, forged letters, bribed clerks; audits exist.",
      "Graduation debt: service, oaths, patronage obligations due later.",
      "Funding politics: grants, patrons, and donors shape what research is 'allowed'.",
      "Publication gate: journals, conferences, and citations as status gates with reviewers as actors.",
      "Club/house factions: social groups control access to events, notes, and alumni networks.",
      "Academic integrity traps: plagiarism and data issues have investigation clocks and stigma.",
    ],
    clocks: [
      "Now: schedule and gatekeepers determine today's options.",
      "This week: exam/project deadline forces tradeoffs and rival moves.",
      "7 days: audits/misconduct procedures trigger if shortcuts were taken.",
      "Long tail: credentials and reputation alter future access.",
    ],
    checklist: [
      "A credential gate exists with a deadline (exam/project).",
      "Schedule constraints matter (office hours, rotations).",
      "Mentor/gatekeeper incentives are defined (quotas, risk).",
      "Rival has procedural leverage (complaints, audits, rumors).",
      "Shortcuts have audit risks; institutional memory persists.",
      "At least one resource gate exists (lab slot, funding, invite, publication) with gatekeepers.",
      "Reputation has receipts (grades, citations, letters) that can be audited or disputed.",
      "A shortcut offers short-term gain but creates a long-term stain (integrity/procedure).",
    ],
  },
  "element-urban": {
    scenePatterns: [
      "District gates: badges/curfews/permits; one street can be a boundary.",
      "Witness density: anonymity costs; logs/rumors create trails.",
      "Hidden routes: tunnels/rooftops/sewers have risks and stakeholders.",
      "Infrastructure bottlenecks: transit/water/power/comms create objectives.",
      "Informant ecology: clerks, doormen, operators, street kids; info has price.",
      "Underworld services: safehouses, forged IDs, bribed inspectors with audit risks.",
      "Heat ledger: actions tighten gates in 7 days; policing adapts procedurally.",
      "Disaster stress test: quarantine/rationing politics reshapes access.",
      "Housing pressure: rent, eviction, zoning, and landlords create clocks and leverage.",
      "Transit disruption: strikes, breakdowns, checkpoints reshape routes and expose plans.",
      "Gentrification politics: redevelopment shifts who controls gates and who gets erased.",
      "Emergency services: hospitals, fire, sanitation have procedures that can help or trap.",
    ],
    clocks: [
      "Now: district gates and witnesses create immediate friction.",
      "Tonight: curfews and patrol patterns change routes and exposure.",
      "7 days: heat ledger tightens checkpoints; rumors reshape access.",
      "Long tail: infrastructure failure/redevelopment shifts faction power.",
    ],
    checklist: [
      "District gates exist and shape routes (badges/curfews/permits).",
      "Witness density means trails exist; anonymity has costs.",
      "Hidden routes exist with risks and stakeholders (tokens/logs).",
      "Infrastructure bottleneck exists and can cascade into politics.",
      "Informant ecology exists; info has price and counterplay.",
      "At least one urban system constrains action (housing, transit, hospitals, sanitation).",
      "A faction map exists by neighborhood (who controls what gate, and how).",
      "A 'receipt' exists in the city (camera, clerk, record, rumor) that can be audited later.",
    ],
  },
  "element-espionage": {
    scenePatterns: [
      "Source ecology: each intel source has incentive + constraint + price (no free leaks).",
      "Channel gate: dead drop/courier/encrypted comms has latency and leaves traces.",
      "Verification duel: confirm via independent source vs controlled test (unique lie).",
      "Cover maintenance: credentials open doors but create audit trails and renewal deadlines.",
      "Sting operation: controlled leak → watch who moves → arrest/scapegoat ladder.",
      "Compartment break: no one knows everything; you must bridge compartments at cost.",
      "Pattern exposure: meetings + money + access logs create a detectable signature.",
      "Damage control: narrative control + internal purges reshape access and allies.",
    ],
    clocks: [
      "Now: operation creates trace (pattern, log, money).",
      "24h: watchlist/review begins; small gates tighten.",
      "7 days: counterintel escalates (sting, detain, raid).",
      "Long tail: burned sources and compromised channels reshape future play.",
    ],
    checklist: [
      "Intel has source + channel + verification method + trace.",
      "Counterintel is procedural and capacity-limited (not omniscient).",
      "Cover stories and credentials are gameplay (renewal, audits, witnesses).",
      "Verification forces tradeoffs (speed vs secrecy vs certainty).",
      "A sting/deception is possible for both sides.",
    ],
  },
  "element-medicine": {
    scenePatterns: [
      "Injury clock: bleeding/infection/shock/exposure ticks; treatment changes future constraints.",
      "Access gate: clinic/temple/lab requires ID/payment/sponsor/triage; workaround exists.",
      "Capacity bottleneck: beds, staff, supplies create queues and bribe points.",
      "Poison vector: onset + antidote access gate + counterfeit risk.",
      "Forensics chain: collection → seal → transport → processing → interpretation (tampering vectors).",
      "Proof standard mismatch: court vs public vs institution require different receipts.",
      "Counterfeit medicine: need + scarcity + weak enforcement creates a market and stings.",
      "Aftercare constraints: recovery time, restrictions, stigma/records persist.",
    ],
    clocks: [
      "Now: stabilize vs hide vs pursue the suspect (tradeoff).",
      "Tonight: infection/exposure escalates; treatment options narrow.",
      "3 days: audits/records/witnesses surface; tampering becomes possible.",
      "Long tail: scars, disability, and medical records change access permanently.",
    ],
    checklist: [
      "At least one injury is a clock with failure modes.",
      "Treatment access is gated (and workaround has audit risk).",
      "Capacity limits exist (queues, shortages, bribery).",
      "Proof has chain-of-custody with tampering vectors.",
      "Consequences persist (scar, stigma, record, debt).",
    ],
  },
  "element-maritime": {
    scenePatterns: [
      "Port gate: customs/quarantine/inspection with manifests and stamps; audits exist.",
      "Berth/harbor control: pilots, tides, fees; schedules create windows.",
      "Season clock: wind/storm window forces depart-now vs wait-weeks choices.",
      "Cargo dispute: weight, spoilage, forged seals, missing crates as scene engines.",
      "Protection system: convoy schedule, escorts, insurance requirements and fraud checks.",
      "Legal piracy: letters of marque, prize courts, and contraband definitions.",
      "Blockade as economy weapon: shortages + smuggling + enforcement ladder.",
      "Supply-line objective: docks, depots, repair yards matter more than battles.",
    ],
    clocks: [
      "Now: clearance gate forces paperwork/bribe/workaround choice.",
      "48h: weather window shifts; route feasibility changes.",
      "7 days: audits/claims disputes/insurance investigations begin.",
      "Long tail: blacklists, seizure records, and port politics persist.",
    ],
    checklist: [
      "At least one port gate exists (customs/quarantine/inspection).",
      "Routes have chokepoints + controllers; seasonality matters.",
      "Cargo has proof documents and dispute vectors.",
      "Protection is procedural (convoy/insurance/patrols), not random.",
      "Failure modes have clocks (weather, blockade, disease, audits).",
    ],
  },
  "element-diplomacy": {
    scenePatterns: [
      "Treaty skeleton: scope → concessions → verification → enforcement → guarantees.",
      "Audience protocol gate: titles, seating, gifts, witnesses determine access.",
      "Safe conduct: letters of passage create corridors with breach thresholds.",
      "Guarantee play: hostages/escrow/guarantor/oath; failure modes exist.",
      "Breach ladder: protest → inspection demand → sanctions → raids/proxy war.",
      "Excluded actor sabotage: spoilers exploit ambiguity and jurisdiction seams.",
      "Jurisdiction chess: embassy immunity and border law create safe havens and traps.",
      "Narrative diplomacy: optics and public story affects enforcement appetite.",
    ],
    clocks: [
      "Now: protocol and face decide immediate access.",
      "24h: protest notes and inspection demands.",
      "7 days: sanctions/visa denial/asset holds reshape leverage.",
      "Long tail: guarantees bind factions; betrayal reshapes alliances for seasons.",
    ],
    checklist: [
      "Agreement has verification + enforcement + guarantee (not vibes).",
      "Protocol rules matter (gift debt, witnesses, titles).",
      "Breach thresholds are explicit with a timeline ladder.",
      "A spoiler exists who benefits from escalation or ambiguity.",
      "Diplomacy changes access (routes, ports, archives, audiences).",
    ],
  },
  "element-finance": {
    scenePatterns: [
      "Ledger gate: who records value and how identity is proven (seals/tokens/biometrics/witnesses).",
      "Debt clock: payment dates + default ladder (fees → seizure → warrant).",
      "Receipt warfare: invoices, ledgers, logs become weapons and evidence.",
      "Audit cadence: holds pending review; reconciliation creates delayed consequences.",
      "Freeze power: partial holds, limits, full freezes; triggers are procedural.",
      "Letters of credit: trust network with document gates and fraud investigations.",
      "Fraud vectors: forgery, identity theft, insider abuse; counterplay exists.",
      "Black market clearing: laundering creates new obligations and exposure.",
    ],
    clocks: [
      "Now: transfer creates a receipt and a trace.",
      "24h: hold/review can start; access tightens.",
      "7 days: reconciliation/audit escalates into freezes and warrants.",
      "Long tail: debt, blacklists, and reputational marks persist.",
    ],
    checklist: [
      "Value is ledgered somewhere with access gates.",
      "Ownership proof exists and can be contested.",
      "Debt has a ladder, not a binary.",
      "Audits have realistic latency and capacity limits.",
      "Freeze power exists and is rule-driven.",
    ],
  },
  "element-media": {
    scenePatterns: [
      "Channel + gatekeeper: who can publish and who can block (editors, censors, algorithms, priests).",
      "Censorship creates markets: backchannels, coded speech, rumor brokers.",
      "Proof vs story mismatch: public requires vivid receipts; authorities require documents/logs.",
      "Response ladder: whisper → headline → official statement → crackdown.",
      "Narrative warfare: controlled leaks, scapegoats, denials with plausible deniability.",
      "Reputation mark: doors open/close; surveillance changes; protection offers appear.",
      "False positives: censorship hits innocents; corruption gates appear.",
      "Time decay: stories peak and die; archives remain as long-tail weapons.",
    ],
    clocks: [
      "Now: publication moves attention; opponents counter-narrate.",
      "24h: gatekeepers respond (takedown, ban, statement, intimidation).",
      "7 days: investigations/crackdowns/blacklists reshape access.",
      "Long tail: archives and stigma persist; future checks reference the record.",
    ],
    checklist: [
      "At least one channel and gatekeeper exists.",
      "Proof standards differ by audience and create choices.",
      "A response ladder exists with a timeline (not instant omniscience).",
      "Censorship/backchannels exist with failure modes.",
      "Reputation marks persist and change access tomorrow.",
    ],
  },
};

function escapeYamlBlock(s: string): string {
  return s.replace(/\r/g, "").trim();
}

function buildThemeFrontmatter(def: ThemeSkillDef): string {
  const tags = ["theme", def.slug, ...(def.aliases ?? [])].join(", ");
  return `---
name: theme-${def.slug}
version: 1.0.0
description: |
  ${escapeYamlBlock(def.description).replace(/\n/g, "\n  ")}
tags: [${tags}]
domain: theme
priority: medium
---`;
}

function buildThemeSkillMarkdown(def: ThemeSkillResolvedDef): string {
  const patternsMd =
    def.scenePatterns.length === 0
      ? ""
      : `## Scene Patterns\n\n${mdList(def.scenePatterns)}\n`;

  const clocksMd =
    def.clocks.length === 0 ? "" : `## Clocks\n\n${mdList(def.clocks)}\n`;

  const checklistMd =
    def.checklist.length === 0
      ? ""
      : `## Checklist\n\n${mdList(def.checklist)}\n`;

  const templatesMd =
    def.templates.length === 0
      ? ""
      : `## Templates\n\n${def.templates
          .map((t) => `### ${t.name}\n\n\`\`\`\n${t.body.trim()}\n\`\`\`\n`)
          .join("\n")}`;

  const examplesMd =
    def.examples.length === 0
      ? ""
      : `## Examples\n\n${def.examples
          .map(
            (e) =>
              `### ${e.scenario}\n\n**Wrong**:\n> ${e.wrong
                .trim()
                .replace(/\n/g, "\n> ")}\n\n**Right**:\n> ${e.right
                .trim()
                .replace(/\n/g, "\n> ")}\n`,
          )
          .join("\n")}`;

  return `${buildThemeFrontmatter(def)}

# ${def.title} Theme

${def.description}

## When to Use

- ${def.whenToLoad}

## Core Constraints

${mdList(def.coreConstraints)}

## Pressure Mechanisms

${mdList(def.pressureMechanisms)}

## Level 1 (Quick Start)

${mdList(def.level1)}

## Level 2 (Scene Engines)

${mdList(def.level2)}

## Advanced (Campaign Drivers)

${mdList(def.advanced)}

## Anti-patterns

${mdList(def.antiPatterns)}

${patternsMd}${clocksMd}${checklistMd}${templatesMd ? `${templatesMd}\n` : ""}${examplesMd ? `${examplesMd}\n` : ""}`;
}

function buildResolvedThemeSkillDefs(): ThemeSkillResolvedDef[] {
  const defs: ThemeSkillDef[] = [
    {
      slug: "fantasy",
      title: "Fantasy",
      description:
        "Fantasy is about power with costs: magic, institutions, myth, and material reality colliding. Make the supernatural meaningful by constraining it and letting society react.",
      whenToLoad:
        "When running a fantasy-genre adventure (magic, myth, ancient powers, feudal or guild institutions).",
      coreConstraints: [
        "Magic has **costs** and **limits** (no wish fulfillment).",
        "Power has **institutions** (guilds, courts, churches, academies).",
        "Myth leaves **residue** (ruins, taboos, old treaties, cursed sites).",
        "Material concerns persist (food, shelter, travel time, money).",
      ],
      pressureMechanisms: [
        "Magical debt/corruption and the price of power.",
        "Institutional politics (licenses, heresy, monopoly, patronage).",
        "Scarcity of components, routes, or safe sanctuaries.",
        "Social stigma and legal constraints around forbidden arts.",
      ],
      level1: [
        "Define one magic rule: cost + failure mode.",
        "Define one institution: what it controls + what it fears.",
        "Define one relic/residue site: access gate + consequence.",
        "Give the player a choice: pay, bargain, steal, or risk corruption.",
      ],
      level2: [
        "Use **oaths** and **titles** as access control (promises have teeth).",
        "Make monsters ecological (they eat, migrate, fear fire, hate iron).",
        "Make prophecy ambiguous: it creates factions, not certainty.",
        "Turn enchantment into logistics: maintenance, audits, counterfeit wards.",
      ],
      advanced: [
        "Build a three-era residue chain (old empire → rupture → current compromise).",
        "Let institutions collide: temple law vs court law vs guild codes.",
        "Make magic economics matter: monopolies, smuggling, relic authentication.",
        "Create a long arc: power gained now creates obligations due later.",
      ],
      antiPatterns: [
        "Unlimited magic with no cost/limits.",
        "NPCs who exist only to help (no agendas, no prices).",
        "Evil as a monolith with no logic.",
        "Prophecy as a railroading device rather than a pressure engine.",
      ],
      templates: [
        {
          name: "Magic Adjudication",
          body: `- Spell intent:
- Cost to pay now:
- Hidden cost later:
- Failure mode:
- Who notices (institution/creature):`,
        },
        {
          name: "Institutional Gate",
          body: `- Controlled resource (license/route/relic):
- Gatekeeper:
- Paperwork/ritual:
- Workaround (insider/forgery/bribe):
- Audit/verification risk:`,
        },
      ],
      examples: [
        {
          scenario: "Magic with a cost",
          wrong: `The wizard solves the problem with a spell. No side effects.`,
          right:
            "The spell works, but it burns the caster’s hands black. He can cast twice more before losing all feeling. The guild healer offers treatment—for a favor.",
        },
      ],
    },
    {
      slug: "noir",
      title: "Noir",
      description:
        "Noir is about leverage: secrets, debts, compromises, and institutional rot. Information has a price, and victory often costs something you care about.",
      whenToLoad:
        "When running a noir-style mystery/crime story (corruption, leverage chains, moral compromises).",
      coreConstraints: [
        "Everyone has leverage (secrets, dependencies, debts).",
        "Information costs something (money, favors, exposure, blood).",
        "Law is a tool used by actors, not an impartial arbiter.",
        "Moral victories carry personal costs; clean wins are rare.",
      ],
      pressureMechanisms: [
        "Time pressure (someone is watching; evidence decays).",
        "Debt and obligation chains (patronage, blackmail, protection).",
        "Reputation damage and social fallout.",
        "Escalating violence as leverage fails.",
      ],
      level1: [
        "Write a leverage triangle: A has dirt on B; B owes C; C wants A silenced.",
        "Make every clue have a source and a motive.",
        "Put a price on truth (cash, favor, risk).",
        "End scenes with a choice: pay, betray, expose, or take the fall.",
      ],
      level2: [
        "Use institutions as pressure: audits, raids, 'procedural' delays.",
        "Make red herrings fair: they explain behavior even if not the culprit.",
        "Keep violence consequential: injuries, heat, witnesses, revenge.",
        "Use double-crosses that are legible in hindsight (incentives).",
      ],
      advanced: [
        "Build a corruption lattice (money ↔ law ↔ media/temple).",
        "Let 'truth' destabilize power: reveals cause crackdowns and market shifts.",
        "Make the protagonist complicit: winning requires a compromise.",
        "Keep a case clock: what changes in 24h / 7 days / 30 days.",
      ],
      antiPatterns: [
        "Clues that appear when convenient with no acquisition cost.",
        "Violence without consequences (no heat, no injuries, no grief).",
        "Villains as pure evil with no leverage logic.",
        "Random twists that contradict established facts.",
      ],
      templates: [
        {
          name: "Leverage Triangle",
          body: `- Person A wants:
- Person B hides:
- Person C controls:
- What happens if exposed:
- The price of silence:`,
        },
      ],
      examples: [
        {
          scenario: "Information has a price",
          wrong: `The bartender tells you everything for free.`,
          right:
            "The bartender knows—but only after closing. He wants you to move a package first, and he warns: if the cops see you here again, he loses his license.",
        },
      ],
    },
    {
      slug: "horror",
      title: "Horror",
      description:
        "Horror is managed fear: incomplete information, escalating exposure, and temporary safety. The threat is real and adapts; the world offers hard choices, not clean rescues.",
      whenToLoad:
        "When running horror or supernatural thriller content (dread, isolation, escalation, survival decisions).",
      coreConstraints: [
        "The threat is real (it can harm/kill; consequences persist).",
        "Information is incomplete (uncertainty fuels dread).",
        "Escape is costly (no clean getaway).",
        "Safety is temporary (the threat adapts).",
      ],
      pressureMechanisms: [
        "Isolation (help far/unavailable).",
        "Resource depletion (light, ammo, medicine, sanity).",
        "Escalating exposure (more sightings, closer contact).",
        "Countdown to irreversible change (infection, ritual, dawn).",
      ],
      level1: [
        "Define one rule of the threat (what it wants, what it avoids).",
        "Define one fragile safe spot and how it can fail.",
        "Track a fear clock: signs → contact → breach → catastrophe.",
        "Make every survival action cost something (noise, light, blood).",
      ],
      level2: [
        "Use warning signs: smell, silence, temperature, pattern.",
        "Make the threat learn: it tests boundaries, then exploits them.",
        "Make allies uncertain: fear makes people irrational or selfish.",
        "Use dread, not jump scares: reveal in slices, not full exposure.",
      ],
      advanced: [
        "Tie horror to institutions: cover-ups, quarantines, cult logistics.",
        "Make 'knowledge' dangerous: learning a truth increases exposure.",
        "Use moral dilemmas: survival vs innocence, truth vs panic.",
        "Plan aftermath: scars, stigma, and recurring consequences.",
      ],
      antiPatterns: [
        "Monsters revealed too early with full explanation.",
        "Deus ex machina rescues that erase stakes.",
        "Jump scares without buildup or consequence.",
        "Violence replacing dread (gore without meaning).",
      ],
      templates: [
        {
          name: "Threat Rule Card",
          body: `- What it wants:
- What it cannot do:
- Warning signs:
- How it escalates:
- What buys time (not victory):`,
        },
      ],
      examples: [
        {
          scenario: "Temporary safety",
          wrong: `You hide and you're safe.`,
          right:
            "You hide in the pantry—until the banging stops. Then the scratching begins, slow and patient, right where the boards are thinnest.",
        },
      ],
    },
    {
      slug: "cyberpunk",
      title: "Cyberpunk",
      description:
        "Cyberpunk is high tech with low trust: corporations, surveillance, debt, and body modification. Make tech social: every capability has access control, maintenance, and counterplay.",
      whenToLoad:
        "When running a cyberpunk or high-tech dystopia story (corps, surveillance, debt, cyberware).",
      coreConstraints: [
        "Corporations often outrank governments in practical power.",
        "Surveillance is pervasive; anonymity has a cost.",
        "Bodies are modifiable, but modifications have tradeoffs and maintenance.",
        "Debt is a chain (contracts, subscriptions, rent, medical bills).",
      ],
      pressureMechanisms: [
        "Corporate retaliation and internal faction politics.",
        "Digital trails and audit logs (the world remembers).",
        "Cyberware dependencies and service contracts.",
        "Credit scoring, debt collection, and black-market identities.",
      ],
      level1: [
        "Define one surveillance baseline and one blind spot.",
        "Define one service contract (what it grants, what it monitors).",
        "Define one counterplay with cost (keys, insiders, time).",
        "Make every job create 'heat' that changes access in 7 days.",
      ],
      level2: [
        "Use audit cycles: crackdowns change how bribes/workarounds work.",
        "Make corporate power procedural: permits, HR, compliance, incident response.",
        "Make hacking non-magical: recon, foothold, payload, escape, fallout.",
        "Make street networks valuable: fixers sell access and cover stories.",
      ],
      advanced: [
        "Build a dependency web: who owns infrastructure, data, and identity.",
        "Let tech reshape class: badge zones, private policing, subscription survival.",
        "Run a war over chokepoints: ports, data centers, pumping stations, locks.",
        "Keep a ledger of consequences: asset freezes, warrants, bounty boards.",
      ],
      antiPatterns: [
        "Hacking as instant magic with no logs, no response, no failure.",
        "Corporations as monolithic evil with no internal incentives.",
        "Tech without social consequence (no class, no law, no economics).",
        "Style over substance: neon aesthetics with no systems.",
      ],
      templates: [
        {
          name: "Job Heat",
          body: `- What was touched (system/person/infrastructure):
- What log exists:
- Who reviews it:
- Response ladder:
- 7-day change (new gate/checkpoint):`,
        },
      ],
      examples: [
        {
          scenario: "Audit trails",
          wrong: `You spoof your badge and walk in.`,
          right:
            "You spoof your badge and walk in—then the system logs a badge used in two zones at once. Security doesn't pounce now; it schedules an audit tomorrow. You have a clock.",
        },
      ],
    },
    {
      slug: "mystery",
      title: "Mystery",
      description:
        "Mystery is about discoverable truth under pressure. Clues must be obtainable; interpretation must be uncertain; time should change evidence and incentives.",
      whenToLoad:
        "When running investigation-focused scenarios (clues, suspects, evidence decay, revelations).",
      coreConstraints: [
        "Clues are discoverable (no unsolvable mysteries).",
        "Evidence requires interpretation (multiple readings possible).",
        "Information has sources (who says it, why would they know).",
        "Time affects evidence (witnesses forget, scenes change).",
      ],
      pressureMechanisms: [
        "Competing investigators and interests.",
        "Witnesses who might disappear or be intimidated.",
        "Evidence degradation/destruction.",
        "Repeat risk (killer strikes again; deadline).",
      ],
      level1: [
        "Build 3 clue lanes: scene evidence, witness/social, documents/records.",
        "Write 3 suspects with motive + means + opportunity + alibi flaw.",
        "Make every clue cost time, money, or exposure.",
        "Guarantee at least one actionable lead per scene.",
      ],
      level2: [
        "Use fair red herrings: they explain a secret, not the core crime.",
        "Design reveals that recontextualize earlier facts (not contradict).",
        "Track 'heat': asking questions changes NPC behavior and access.",
        "Use evidence standards (what convinces law/institutions).",
      ],
      advanced: [
        "Run a clue clock: each day changes what can be found.",
        "Let truth destabilize power (crackdowns, bribes, blackmail).",
        "Make the solution require a decision (public accuse vs private deal).",
        "Make the villain rational: self-preservation drives counter-moves.",
      ],
      antiPatterns: [
        "Clues that require mind-reading or author knowledge.",
        "Solutions requiring external meta knowledge.",
        "Twists that invalidate established facts.",
        "Endless clue dumps with no choices or consequences.",
      ],
      templates: [
        {
          name: "3-Lane Clues",
          body: `- Scene evidence:
- Witness/social:
- Documents/records:
- What each lane costs:
- What changes tomorrow:`,
        },
      ],
      examples: [
        {
          scenario: "Fair red herring",
          wrong: `A random suspect confesses then dies.`,
          right:
            "The 'suspect' lied because they were smuggling medicine. That explains the hidden ledger and the late-night trips—but not the murder. Now the clue has value without being the solution.",
        },
      ],
    },
    {
      slug: "romance",
      title: "Romance",
      description:
        "Romance is a pressure engine for vulnerability, timing, and personal stakes. Chemistry emerges from connection plus conflict—not from declarations.",
      whenToLoad:
        "When romantic relationships are central or strongly influencing decisions and scenes.",
      coreConstraints: [
        "Vulnerability is required (emotional risk).",
        "Chemistry comes from conflict + connection (not perfection).",
        "Timing matters; the wrong moment can doom the right people.",
        "Stakes are personal but consequential (status, duty, safety).",
      ],
      pressureMechanisms: [
        "External obstacles (family, society, duty, distance).",
        "Internal conflict (fear, trauma, incompatible goals).",
        "Rival interests (exes, suitors, competing priorities).",
        "Deadlines (departure, marriage, confession, scandal).",
      ],
      level1: [
        "Define two desires and one incompatibility (why it’s hard).",
        "Show care through action, not speeches (help, sacrifice, attention).",
        "Add one boundary (consent, propriety, safety) that creates tension.",
        "End scenes with a choice: reach out, withdraw, lie, or risk honesty.",
      ],
      level2: [
        "Use misunderstandings with incentives, not stupidity.",
        "Let intimacy create vulnerability to external pressure (blackmail, duty).",
        "Keep arcs earned: small changes, repeated trust tests.",
        "Make romance intersect the world: class, law, institutions.",
      ],
      advanced: [
        "Run a relationship clock: trust → rupture → repair → commitment (or fracture).",
        "Make public/private boundaries matter (scandal economy).",
        "Use irreversibility: one confession changes future options.",
        "Keep agency: romance changes choices; it does not override them.",
      ],
      antiPatterns: [
        "Love at first sight without development.",
        "Obstacles that exist only to delay (no incentives).",
        "Partners who have no life outside romance.",
        "Resolution without earned growth and consequences.",
      ],
      templates: [
        {
          name: "Chemistry Engine",
          body: `- What they want (A):
- What they want (B):
- Incompatibility:
- External pressure:
- A small trust test this scene:`,
        },
      ],
      examples: [
        {
          scenario: "Care through action",
          wrong: `He says he loves her.`,
          right:
            "He changes his plan to keep her safe—then admits it costs him something. She notices the lie he told for her and asks what it will cost later.",
        },
      ],
    },
    {
      slug: "wuxia",
      title: "Wuxia",
      description:
        "Wuxia is honor, lineage, and debt in the jianghu—an alternate legal order. Reputation is currency; techniques have sources; obligations and face create pressure.",
      whenToLoad:
        "When running martial arts / jianghu adventures with sect politics, blood debts, and honor codes.",
      coreConstraints: [
        "Honor and face function as currency (public reputation has cost).",
        "Lineage and school matter (techniques have sources and owners).",
        "Debts of gratitude must be repaid (obligation chains).",
        "Jianghu has its own law distinct from imperial authority.",
      ],
      pressureMechanisms: [
        "Sect rivalries and appointment politics.",
        "Blood debts and vengeance obligations.",
        "Public humiliation and reputation collapse.",
        "Master-disciple obligations and forbidden techniques.",
      ],
      level1: [
        "Define one code: what earns face, what loses it.",
        "Define one sect: what technique it owns and why it matters.",
        "Define one debt: who owes whom, and what they demand.",
        "Make every duel have stakes beyond injury (name, oath, access).",
      ],
      level2: [
        "Use tournaments as political stages (alliances and propaganda).",
        "Make technique costs real: injury, qi deviation, oath constraints.",
        "Let honor be weaponized: force apologies, public vows, hostage etiquette.",
        "Use parallel authorities: imperial warrants vs jianghu adjudication.",
      ],
      advanced: [
        "Build a lineage web: masters, disciples, betrayals, secret manuals.",
        "Use reputation markets: bounties, rumors, patronage letters.",
        "Make travel meaningful: escorts, inns, letters of passage, ambush zones.",
        "Run long arcs: debt repayment cascades into new obligations.",
      ],
      antiPatterns: [
        "Fights without stakes or consequences.",
        "Dishonor with no social/legal cost.",
        "Power levels as pure numbers with no technique logic.",
        "Modern morality with no cultural mechanism to support it.",
      ],
      templates: [
        {
          name: "Duel Stakes",
          body: `- Public claim:
- What is wagered (face/title/access):
- Secret agenda:
- Third-party witness:
- Oath demanded:`,
        },
      ],
      examples: [
        {
          scenario: "Honor as constraint",
          wrong: `He attacks from behind because it's smart.`,
          right:
            "He considers it—then sees the crowd. If he strikes, he wins the fight but loses the jianghu. He chooses a different tactic: forcing the rival to admit wrongdoing publicly.",
        },
      ],
    },
    {
      slug: "heist",
      title: "Heist",
      description:
        "Heist is layered security under time pressure. Plans reveal through action; complications are inevitable; roles matter; exits are harder than entries.",
      whenToLoad:
        "When running heist/caper/infiltration scenarios (security layers, timing windows, complications).",
      coreConstraints: [
        "Security has layers (bypass one, face another).",
        "Roles matter (each specialist has unique value).",
        "Timing is critical (windows open/close).",
        "Complications escalate (nothing goes perfectly).",
      ],
      pressureMechanisms: [
        "Response ladder escalation (guards → lockdown → raid).",
        "Closing time windows and expiring access tokens.",
        "Trust fractures and potential betrayal.",
        "Unexpected variables (witnesses, audits, equipment failure).",
      ],
      level1: [
        "Define 3 security layers: physical, procedural, social.",
        "Define one window (shift change, audit gap, festival, storm).",
        "Define one choke point (door, elevator, checkpoint) and its controller.",
        "Plan the exit first; entry is easy, escape is narrative.",
      ],
      level2: [
        "Use 'inside-out' complications: success triggers the next layer.",
        "Make counterplay symmetrical: alarms exist, but can be delayed at a cost.",
        "Make intel imperfect: recon reveals, but creates exposure.",
        "Use 'reveal of preparation' only if it was plausible and paid for.",
      ],
      advanced: [
        "Run a heat ledger: future access changes after the job.",
        "Make factions bid for the outcome (double clients, buyouts, betrayals).",
        "Make security procedural: reports, audits, compliance, scapegoats.",
        "Add irreversibility: once the vault is opened, the world changes.",
      ],
      antiPatterns: [
        "Perfect plans that work perfectly.",
        "Security that exists only to be bypassed (no incentives).",
        "Complications that are random punishment, not system response.",
        "Consequences that don't persist (no heat, no audits).",
      ],
      templates: [
        {
          name: "3-Layer Security",
          body: `- Physical layer:
- Procedural layer (paperwork/audit):
- Social layer (trust/identity):
- Window:
- Response ladder:`,
        },
      ],
      examples: [
        {
          scenario: "Exit is harder than entry",
          wrong: `You steal it and leave.`,
          right:
            "You steal it—and the building doesn't chase you. It locks down the district. Cameras don't stop you; they record you. Tomorrow the audit begins. Your exit is now a week-long problem.",
        },
      ],
    },
    {
      slug: "post-apocalypse",
      title: "Post-Apocalypse",
      description:
        "Post-apocalypse is survival under scarcity where safety is temporary. Communities extract obligations; the old world leaves residue; violence is logistical.",
      whenToLoad:
        "When running survival or post-collapse scenarios (scarcity, fragile communities, old-world residue).",
      coreConstraints: [
        "Resources are scarce (food, water, medicine, fuel, ammo).",
        "Safety is temporary (no permanent haven).",
        "Communities have costs (joining creates obligations).",
        "The old world leaves residue (ruins, tech, laws, trauma).",
      ],
      pressureMechanisms: [
        "Resource depletion and rationing politics.",
        "Territorial conflict and patrol boundaries.",
        "Environmental hazards (radiation, storms, fauna).",
        "Disease/injury without modern supply chains.",
      ],
      level1: [
        "Define one bottleneck resource and who controls it.",
        "Define one safe place and its cost (labor, loyalty, tribute).",
        "Define one ruin with a hazard + a prize.",
        "Make travel expensive and information slow.",
      ],
      level2: [
        "Make violence logistical: bullets are money, wounds are clocks.",
        "Make communities political: ration cards, permits, scapegoats.",
        "Make salvage imperfect: counterfeit meds, broken parts, audit risks.",
        "Use 'hope' as rare: small kindness with a cost.",
      ],
      advanced: [
        "Build a recovery debt arc: who rebuilds, who profits, who is excluded.",
        "Let old systems persist: registries, property claims, military zones.",
        "Make ecology react: migration, contamination, famine cycles.",
        "Run multi-faction pressure over chokepoints (water pump, bridge, depot).",
      ],
      antiPatterns: [
        "Unlimited ammunition and supplies.",
        "Survival aesthetics without hardship (no logistics).",
        "Communities that are stable without enforcement.",
        "Monsters without ecological logic or resource impact.",
      ],
      templates: [
        {
          name: "Settlement Cost",
          body: `- Bottleneck resource:
- Who controls it:
- Joining cost (labor/tribute/oath):
- Enforcement:
- Failure consequence:`,
        },
      ],
      examples: [
        {
          scenario: "Scarcity politics",
          wrong: `The settlement welcomes you.`,
          right:
            "The settlement welcomes you—then assigns you to the pump crew. Refuse and you lose ration priority. Accept and you learn the pump is failing, and the foreman sells spare parts on the side.",
        },
      ],
    },
    {
      slug: "slice-of-life",
      title: "Slice-of-Life",
      description:
        "Slice-of-life is about small stakes with real weight: routines, relationships, and incremental change. The drama comes from timing, obligations, and the texture of everyday consequences.",
      whenToLoad:
        "When running low-stakes, everyday-focused scenarios (community ties, routines, small conflicts).",
      coreConstraints: [
        "Small stakes feel big to the people living them.",
        "Routines create rhythm; disruption is dramatic.",
        "Relationships are central (community ties, favors, reputations).",
        "Time passes naturally (seasons, aging, change).",
      ],
      pressureMechanisms: [
        "Social obligations and expectations (favors, promises, gossip).",
        "Economic pressure (rent, bills, job schedules).",
        "Relationship strain (miscommunication with incentives).",
        "Personal goals vs responsibilities (tradeoffs).",
      ],
      level1: [
        "Open with routine + small disruption.",
        "Give 2-3 recurring NPCs with their own needs.",
        "Make choices cost time/energy/money (not death).",
        "Track a community reputation thread (gossip velocity).",
      ],
      level2: [
        "Use micro-conflicts: etiquette, pride, debt, jealousy, schedules.",
        "Let kindness have costs and returns (favors, obligations).",
        "Use seasonal/weekly clocks (festival, exams, harvest, rent day).",
        "Keep consequences gentle but persistent (awkwardness, trust shifts).",
      ],
      advanced: [
        "Build a slow arc: relationship repair, craft mastery, belonging earned.",
        "Make institutions present: school, workplace, landlord, guild, clinic.",
        "Use 'quiet crises' (illness, layoffs, moving away) as long pressure.",
        "Avoid stakes inflation; deepen meaning instead.",
      ],
      antiPatterns: [
        "Artificial drama injection (random violence) to 'spice it up'.",
        "Stakes inflation to world-saving plots.",
        "Characters with no independent lives outside the protagonist.",
        "Resolution without growth or lasting change.",
      ],
      templates: [
        {
          name: "Routine Scene",
          body: `- Routine:
- Small disruption:
- What it costs (time/money/face):
- Who notices (gossip):
- A gentle consequence tomorrow:`,
        },
      ],
      examples: [
        {
          scenario: "Small stakes, real weight",
          wrong: `You help your neighbor and everyone is happy.`,
          right:
            "You help your neighbor—so you miss your shift. The manager docks your pay. Now you must choose: apologize and swallow pride, ask for a favor, or take a second job that costs time with friends.",
        },
      ],
    },
    {
      slug: "face-slapping-reversal",
      title: "Face-Slapping Reversal",
      aliases: ["shuangwen"],
      description:
        "Face-slapping reversal stories deliver earned status flips: the underestimated protagonist collects receipts, survives suppression, and reverses power in public view.",
      whenToLoad:
        "When the narrative needs high-satisfaction reversals, status humiliation payback, and momentum built from visible wins.",
      coreConstraints: [
        "Reversals must be earned through preparation, leverage, or receipts.",
        "Opposition uses realistic social/procedural power, not cartoon omnipotence.",
        "Each win changes gates but also increases scrutiny.",
        "Public recognition lags behind private competence.",
      ],
      pressureMechanisms: [
        "Status barriers (titles, credentials, lineage, gatekeepers).",
        "Procedural retaliation (audits, bans, social exclusion, procurement blocks).",
        "Expectation inflation (today's miracle becomes tomorrow's baseline).",
        "Rival coalition behavior after public embarrassment.",
      ],
      level1: [
        "Open with a concrete humiliation + a hidden capability seed.",
        "Define one first-turn reversal that is small but undeniable.",
        "Bind momentum to evidence objects (recording, witness, ledger, seal).",
        "Write the key fields with reversal logic: narrativeStyle/backgroundTemplate/example/worldSetting/protagonist_preference.",
      ],
      level2: [
        "Chain reversals via procedural checkpoints, not pure speeches.",
        "Keep one unresolved gate after each victory to preserve tension.",
        "Turn crowd reaction into a mechanic (doors open/close by reputation).",
        "Make antagonist countermoves rational and legible.",
      ],
      advanced: [
        "Run a public-proof ladder (private clue → local witness → institutional acknowledgment).",
        "Make victories reshape market/institution incentives, not only emotions.",
        "Use delayed blowback arcs: audits, alliances, succession politics.",
        "Keep protagonist growth beyond revenge (responsibility after elevation).",
      ],
      antiPatterns: [
        "Instant invincibility with no setup or receipts.",
        "One-note humiliation loops with no structural change.",
        "Opponents becoming stupid only to enable payoff.",
        "Payback scenes that erase long-tail consequences.",
      ],
      templates: [
        {
          name: "Reversal Ladder",
          body: `- Public humiliation vector:
- Hidden leverage seed:
- First undeniable proof:
- Countermove expected:
- Next gate to break:`,
        },
      ],
      examples: [
        {
          scenario: "Earned reversal",
          wrong: `Everyone suddenly respects you after one speech.`,
          right:
            "The board mocks your proposal—until you produce signed shipment logs and a live vendor call. One director switches sides immediately; two others open an audit instead of conceding. You win access, not total victory.",
        },
      ],
    },
    {
      slug: "tragic-angst",
      title: "Tragic Angst",
      aliases: ["nuewen"],
      description:
        "Tragic angst stories intensify emotional stakes through incompatible duties, delayed truths, and costly choices where everyone loses something meaningful.",
      whenToLoad:
        "When the core appeal is heartbreak, regret, and emotionally high-pressure decisions under social or moral constraints.",
      coreConstraints: [
        "Pain must connect to values and relationships, not random suffering.",
        "Misunderstandings need believable incentives for concealment.",
        "Major reveals reframe choices without invalidating prior facts.",
        "Characters keep agency under constraint.",
      ],
      pressureMechanisms: [
        "Duty vs desire conflicts (family, law, class, survival).",
        "Timing windows that close before full truth arrives.",
        "Social punishment systems (reputation, custody, inheritance, legitimacy).",
        "Emotional debt accumulation after each compromise.",
      ],
      level1: [
        "Define one attachment and one irreconcilable external pressure.",
        "Design one concealment that protects now but harms later.",
        "Create a rupture trigger tied to a concrete deadline.",
        "Write the key fields with emotional causality: narrativeStyle/backgroundTemplate/example/worldSetting/protagonist_preference.",
      ],
      level2: [
        "Run harm as ledgered consequences (trust, access, safety, status).",
        "Stage repair attempts with restitution and boundary friction.",
        "Use partial truths that empower third-party interference.",
        "Keep each tragic beat choice-driven, not fate-only.",
      ],
      advanced: [
        "Build multi-arc tragedy where early mercy creates later costs.",
        "Let institutions weaponize private pain procedurally.",
        "Tie emotional climax to irreversible civic/familial outcomes.",
        "End with transformed identity, not only broken romance.",
      ],
      antiPatterns: [
        "Suffering porn without character logic.",
        "Random amnesia/accidents used only as cheap pain triggers.",
        "Immediate forgiveness that ignores prior harm.",
        "Villain-of-the-week replacing relational tragedy mechanics.",
      ],
      templates: [
        {
          name: "Delayed Truth Trap",
          body: `- What is concealed:
- Why concealment seems necessary now:
- Deadline before reveal loses value:
- Who pays first:
- Long-tail scar:`,
        },
      ],
      examples: [
        {
          scenario: "Constraint-driven heartbreak",
          wrong: `They separate because fate is cruel.`,
          right:
            "She forges his discharge papers to save him from conscription, but the forgery implicates her brother's unit. By the time he learns the truth, the tribunal date is tomorrow and testifying can save only one of them.",
        },
      ],
    },
    {
      slug: "healing-redemption",
      title: "Healing Redemption",
      aliases: ["zhiyu"],
      description:
        "Healing redemption stories focus on recovery with boundaries: gradual repair, accountable change, and renewed purpose built through repeated small actions.",
      whenToLoad:
        "When the narrative aims for comfort, growth, and credible redemption arcs instead of escalation-heavy conflict.",
      coreConstraints: [
        "Healing is incremental and behavior-based.",
        "Support systems have capacity limits and boundaries.",
        "Setbacks alter pace but do not hard-reset all progress.",
        "Redemption requires restitution where harm occurred.",
      ],
      pressureMechanisms: [
        "Routine maintenance (therapy, work shifts, medication, check-ins).",
        "Trigger management under real-life obligations.",
        "Trust rebuilding with skeptical stakeholders.",
        "Resource constraints around care access.",
      ],
      level1: [
        "Open with one wound, one safe anchor, one actionable step.",
        "Define one routine that demonstrates progress.",
        "Define one restitution action with a measurable cost.",
        "Write the key fields to emphasize recovery loops: narrativeStyle/backgroundTemplate/example/worldSetting/protagonist_preference.",
      ],
      level2: [
        "Use micro-repair scenes: trigger → coping action → relational response.",
        "Show care through consent-respecting behavior, not rescue fantasies.",
        "Keep setbacks specific and solvable through support + effort.",
        "Link progress to regained competence and community contribution.",
      ],
      advanced: [
        "Design long arcs where identity shifts from survival to stewardship.",
        "Let forgiven relationships still keep boundaries and memory.",
        "Use institutions (clinic/school/work) as imperfect but useful scaffolds.",
        "Make purpose sustainable through systems, not one epiphany.",
      ],
      antiPatterns: [
        "Miracle healing that skips process and accountability.",
        "Helpers with infinite patience/resources and no needs.",
        "Setbacks that fully erase prior growth for drama spikes.",
        "Redemption declared without restitution to harmed parties.",
      ],
      templates: [
        {
          name: "Recovery Loop",
          body: `- Trigger:
- Grounding action:
- Support contact:
- Small win this week:
- Next boundary to respect:`,
        },
      ],
      examples: [
        {
          scenario: "Accountable redemption",
          wrong: `He apologizes once and everything is fine.`,
          right:
            "He apologizes, then volunteers the night shift for a month to cover the losses he caused, attends every review meeting, and accepts that trust returns in stages. His friend helps—but still keeps account access revoked.",
        },
      ],
    },
    {
      slug: "mystery-horror",
      title: "Mystery Horror",
      aliases: ["xuanyi"],
      description:
        "Mystery horror combines fair investigation with escalating dread: each clue increases understanding while narrowing safety.",
      whenToLoad:
        "When the story needs both clue-solving and fear escalation (unknown threat, unreliable safety, institutional coverups).",
      coreConstraints: [
        "Clues are discoverable and fair.",
        "Threat rules are consistent but partially revealed.",
        "Safety is temporary and costly.",
        "Investigation actions increase exposure.",
      ],
      pressureMechanisms: [
        "Evidence decay and contamination.",
        "Threat adaptation to repeated tactics.",
        "Institutional denial/public panic divergence.",
        "Trust erosion among witnesses/allies.",
      ],
      level1: [
        "Open with one anomaly and one practical next lead.",
        "Define one temporary refuge and its failure condition.",
        "Define a fear clock: sign → contact → breach → aftermath.",
        "Write key fields with clue+dread coupling: narrativeStyle/backgroundTemplate/example/worldSetting/protagonist_preference.",
      ],
      level2: [
        "Reveal threat rules in fragments that change tactics.",
        "Make each clue purchase cost time, safety, or social credibility.",
        "Let institutions respond procedurally (contain, deny, exploit).",
        "Use witness unreliability with reasons (fear, coercion, stigma).",
      ],
      advanced: [
        "Run dual clocks: evidence integrity and containment collapse.",
        "Make truth itself dangerous via legal/social fallout.",
        "Tie final confrontation to a proof decision, not only combat.",
        "Design aftermath scars that persist into future arcs.",
      ],
      antiPatterns: [
        "Jump-scare spam with no investigable structure.",
        "Omniscient exposition that removes uncertainty too early.",
        "Threat behavior changing randomly between scenes.",
        "Clean endings that erase trauma and institutional residue.",
      ],
      templates: [
        {
          name: "Clue-Exposure Pair",
          body: `- Clue acquired:
- Acquisition cost:
- Exposure created:
- Temporary safety step:
- What fails next if delayed:`,
        },
      ],
      examples: [
        {
          scenario: "Fair clues under dread",
          wrong: `You find a clue and the danger pauses.`,
          right:
            "The tape confirms the corridor pattern—but playback triggers the building's quarantine protocol. Doors seal, power reroutes, and your witness refuses to stay unless you destroy the only copy.",
        },
      ],
    },
    {
      slug: "epic-worldbuilding",
      title: "Epic Worldbuilding",
      aliases: ["shishi"],
      description:
        "Epic worldbuilding scales from local scenes to civilizational forces: institutions, logistics, myths, and historical residue all push player choices.",
      whenToLoad:
        "When the campaign needs grand scope (empires, sects, wars, epochs) while keeping scenes playable and choice-driven.",
      coreConstraints: [
        "World-scale forces must manifest as local constraints.",
        "Institutions need procedures, capacity limits, and incentives.",
        "History creates present-day residue and obligations.",
        "Logistics/geography shape strategy and access.",
      ],
      pressureMechanisms: [
        "Faction competition across legal, military, and economic fronts.",
        "Seasonal/resource cycles affecting campaigns.",
        "Center vs frontier governance differences.",
        "Legitimacy contests (ritual, law, archive, force).",
      ],
      level1: [
        "Pick one world-scale tension and show it through one local gate scene.",
        "Define two authorities with conflicting legitimacy claims.",
        "Define one logistics chokepoint and who controls it.",
        "Write key fields for scale coherence: narrativeStyle/backgroundTemplate/example/worldSetting/protagonist_preference.",
      ],
      level2: [
        "Link policy or war shifts to concrete prices/routes/jobs.",
        "Make lore reveals unlock new choices, not passive exposition.",
        "Use multi-era residue chains to explain current institutions.",
        "Keep faction behavior procedural and interest-driven.",
      ],
      advanced: [
        "Run season-length clocks for campaigns, harvests, doctrine, and succession.",
        "Design obligation webs that survive regime changes.",
        "Model how infrastructure transitions reshape social hierarchy.",
        "Allow player interventions to redirect history without flattening complexity.",
      ],
      antiPatterns: [
        "Lore dumps disconnected from scene decisions.",
        "Empire-scale claims without logistics/capacity grounding.",
        "Monolithic factions with no internal splits.",
        "World change that never affects daily life.",
      ],
      templates: [
        {
          name: "Macro-to-Micro Link",
          body: `- World-scale pressure:
- Local gate it creates:
- Institution enforcing it:
- Immediate player tradeoff:
- Long-tail obligation:`,
        },
      ],
      examples: [
        {
          scenario: "Playable grand scale",
          wrong: `The empire is unstable.`,
          right:
            "The imperial grain decree cuts border rations by 20%. Overnight, convoy permits triple in price, militia recruitment spikes, and your town's temple starts issuing debt-marked meal tokens.",
        },
      ],
    },
    {
      slug: "ip-faithful-adaptation",
      title: "IP Faithful Adaptation",
      aliases: ["ip"],
      description:
        "IP-faithful adaptation preserves source identity while enabling player-driven branches through continuity-aware invention.",
      whenToLoad:
        "When adapting known IP/worlds where tone, character logic, and canon pillars must remain recognizable.",
      coreConstraints: [
        "Canon pillars are explicit before divergence.",
        "Character voice/motivation remains source-legible.",
        "New content must coexist with known timeline and world logic.",
        "Player agency can branch outcomes without breaking identity core.",
      ],
      pressureMechanisms: [
        "Continuity checks across timeline, institutions, and relationships.",
        "Fan-trust risk when deviating without receipts.",
        "Adaptation boundaries: immutable pillars vs flexible zones.",
        "Trademarked iconic beats requiring reinterpretation, not copy-paste.",
      ],
      level1: [
        "Declare 3 canonical anchors and 1 flexible branch zone.",
        "Define one continuity receipt method (record, witness, timeline note).",
        "Define one branch choice that changes route but keeps tone identity.",
        "Write key fields with canon alignment: narrativeStyle/backgroundTemplate/example/worldSetting/protagonist_preference.",
      ],
      level2: [
        "Use source motifs/rhetoric to keep recognizability without literal cloning.",
        "Make deviations explicit with in-world causes and consequences.",
        "Protect core character integrity under stress decisions.",
        "Track canon pressure as a design clock each arc.",
      ],
      advanced: [
        "Model alternate corridor planning that preserves thematic invariants.",
        "Let new factions/events stress but not erase canonical foundations.",
        "Maintain adaptation ledger for unresolved continuity debts.",
        "Use player choices to reinterpret destiny while preserving franchise identity.",
      ],
      antiPatterns: [
        "Direct copying of signature scenes/dialogue as a substitute for design.",
        "Name-skin adaptation with broken world logic.",
        "Character actions that violate established motivation without cause.",
        "Canon purism that removes all meaningful player agency.",
      ],
      templates: [
        {
          name: "Canon Boundary Card",
          body: `- Immutable pillar:
- Flexible zone:
- Proposed deviation:
- Continuity receipt:
- Player agency branch outcome:`,
        },
      ],
      examples: [
        {
          scenario: "Faithful but branchable",
          wrong: `Recreate the original arc beat-for-beat.`,
          right:
            "The mentor still disappears at the canonical midpoint, but because the player secured archive access earlier, the disappearance is reframed as a staged extraction. The same theme remains; route and suspects change.",
        },
      ],
    },

    // =========================================================================
    // Era / Style / Elements (curated building blocks)
    // =========================================================================
    {
      slug: "era-modern",
      title: "Modern Era",
      description:
        "Modern settings are run by systems: paperwork, registries, contracts, media, and institutional memory. Make 'the world remembers' a pressure engine (logs, witnesses, surveillance, audit trails).",
      whenToLoad:
        "When the story is modern/industrial/post-industrial: police, media, finance, bureaucracy, and fast rumor velocity.",
      coreConstraints: [
        "Institutions gate access (permits, IDs, credentials, property).",
        "Information leaves trails (logs, cameras, records, transactions).",
        "Violence triggers procedural response (investigation, warrants, crackdowns).",
        "Money is contractual (debt, rent, liability, insurance, audits).",
      ],
      pressureMechanisms: [
        "Audit cycles and paperwork bottlenecks.",
        "Media attention and reputation damage (public vs private truth).",
        "Police/security response ladders (warn → detain → raid).",
        "Deadlines (rent day, court dates, shifts, surveillance review windows).",
      ],
      level1: [
        "Define one ID/process gate and one workaround (insider, forgery, bribe, timing).",
        "Define one log/witness trail and who can query it.",
        "Define a response ladder for illegal acts (who escalates, how fast).",
        "End scenes with a concrete tradeoff: speed vs traceability vs legality.",
      ],
      level2: [
        "Make cover stories necessary (plausible deniability as gameplay).",
        "Use institutions as pressure (compliance, courts, inspections).",
        "Make resources administrative (account freeze, permit revoked, blacklist posted).",
        "Let rumors travel fast but distort (misinformation as conflict).",
      ],
      advanced: [
        "Build a stakeholder lattice: money ↔ law ↔ media ↔ force.",
        "Keep a consequences ledger: small acts become audits in 7 days.",
        "Use documentation warfare: paperwork as weapons and shields.",
        "Let systems fail under load: disasters create triage politics and corruption spikes.",
      ],
      antiPatterns: [
        "Modern aesthetics with no institutions (no IDs, no records, no process).",
        "Crime with no procedural response (no heat, no warrants).",
        "Surveillance as perfect omniscience (no blind spots, no false positives).",
        "Money as flavor text (no contracts, no debt, no liability).",
      ],
      templates: [
        {
          name: "Modern Gate",
          body: `- Gate (ID/process):
- Workaround:
- Log/witness trail:
- Response ladder:
- 7-day consequence:`,
        },
      ],
      examples: [
        {
          scenario: "Trail-based tension",
          wrong: "You do it and leave. Nothing follows.",
          right:
            "You do it and leave—and it works. Tomorrow the review team notices the anomaly in the log. You have a 24-hour window to shape the narrative or burn the trail.",
        },
      ],
    },
    {
      slug: "era-feudal",
      title: "Feudal / Medieval",
      description:
        "Feudal settings are about obligations and distance: oaths, patronage, land, lineage, temple legitimacy, guild monopoly, and slow logistics. Power is personal, but enforced through institutions.",
      whenToLoad:
        "When the setting is pre-modern/feudal: nobles, vassals, guilds, temples, slow travel, and public reputation.",
      coreConstraints: [
        "Power is tied to land and oaths (fealty, tribute, service).",
        "Law is jurisdictional and personal (who you serve matters).",
        "Travel is expensive and slow; information velocity varies.",
        "Legitimacy is brokered (temple, court, lineage, tradition).",
      ],
      pressureMechanisms: [
        "Patronage chains and debt obligations.",
        "Status gates (who can enter where; who may speak to whom).",
        "Guild monopolies and toll routes.",
        "Honor/face and public shame as enforcement.",
      ],
      level1: [
        "Define one obligation chain (who owes whom, what is demanded).",
        "Define one jurisdiction boundary (court vs temple vs guild).",
        "Define one travel cost (time, exposure, escorts, tolls).",
        "Make access depend on status markers (letters, rings, sponsor).",
      ],
      level2: [
        "Use ceremonies as politics: seating, titles, oaths as weapons.",
        "Make scarcity seasonal: harvest, winter, sieges.",
        "Use justice as story engine: fines, confiscation, exile, indenture.",
        "Use rumor velocity: scandal travels faster than caravans.",
      ],
      advanced: [
        "Build a residue chain: old treaties shaping current borders and taboos.",
        "Let institutions collide: temple law vs noble decree vs guild codes.",
        "Make war logistical: supply lines, siege clocks, occupation costs.",
        "Let lineage networks drive long arcs (marriage, heirs, hostages).",
      ],
      antiPatterns: [
        "Feudal vibes with modern logistics (instant travel, infinite supplies).",
        "Kings as omnipotent with no capacity or blowback.",
        "Honor with no enforcement or incentives.",
        "Guilds/temples as flavor with no gates or monopolies.",
      ],
      templates: [
        {
          name: "Oath + Gate",
          body: `- Oath/obligation:
- Gatekeeper:
- Status marker:
- Workaround:
- Consequence if dishonored:`,
        },
      ],
      examples: [
        {
          scenario: "Jurisdiction boundary",
          wrong: "The guards arrest anyone anywhere.",
          right:
            "The duke’s guards stop at the temple steps. Inside, only the clerics can judge. The player can force a choice: risk sacrilege or take the slow legal route.",
        },
      ],
    },
    {
      slug: "trade-mercantilism",
      title: "Trade & Mercantilism",
      description:
        "Trade-focused stories run on routes, chokepoints, contracts, and fraud. Make commerce generate play: prices move, licenses gate, audits bite, and caravans create clocks.",
      whenToLoad:
        "When the story emphasizes trade, merchants, tariffs, supply chains, shipping, smuggling, and market politics.",
      coreConstraints: [
        "Goods move through routes with chokepoints (bridges, ports, passes).",
        "Permits/inspections gate legal trade; black markets fill gaps.",
        "Credit and debt create obligations; default has consequences.",
        "Fraud exists: counterfeit goods, forged papers, rigged weights.",
      ],
      pressureMechanisms: [
        "Tariffs, inspections, and bribe gates.",
        "Price volatility from shocks (storms, raids, strikes, sanctions).",
        "Rival merchants, guild monopolies, and protection rackets.",
        "Audit trails: ledgers, manifests, stamps, witness signatures.",
      ],
      level1: [
        "Define one route + chokepoint + controller.",
        "Define one regulated good and its paperwork surface area.",
        "Define one credit obligation and one default consequence.",
        "Make trade decisions tradeoffs: speed vs safety vs legality.",
      ],
      level2: [
        "Use contract warfare: clauses, penalties, delivery windows.",
        "Use verification: weights, seals, registries, inspectors.",
        "Let smuggling be systemic: storage, laundering, insider stamps.",
        "Tie trade to politics: embargoes, monopolies, patronage.",
      ],
      advanced: [
        "Build a supply shock arc (7 days) that reshapes prices and alliances.",
        "Let scarcity trigger social conflict (riots, scapegoats, crackdowns).",
        "Use multi-actor bargaining: money vs force vs law vs legitimacy.",
        "Let the player change the market (new route, burned depot, exposed fraud).",
      ],
      antiPatterns: [
        "Trade as shopping lists with no gates or consequences.",
        "Smuggling as free teleport (no chokepoints, no audits).",
        "Prices that never change under shock.",
        "Merchants with no incentives beyond 'greedy'.",
      ],
      templates: [
        {
          name: "Route Card",
          body: `- Route:
- Chokepoint controller:
- Regulated good:
- Paperwork/permit:
- Smuggling workaround:
- Verification/audit risk:`,
        },
      ],
      examples: [
        {
          scenario: "Paperwork as gameplay",
          wrong: "You ship it and get paid.",
          right:
            "You ship it—then customs flags the manifest: wrong stamp series. You can bribe the inspector, forge a new stamp, or reroute through the marsh port where smugglers rule.",
        },
      ],
    },
    {
      slug: "court-intrigue",
      title: "Court Intrigue",
      description:
        "Court intrigue is politics under ceremony: status gates, face economy, appointment wars, and controlled information. Make every scene a leverage exchange, not just dialogue.",
      whenToLoad:
        "When the story is palace/court focused: ministers, nobles, succession, etiquette, scandals, faction wars.",
      coreConstraints: [
        "Status gates everything (who may speak, where you may stand).",
        "Information is controlled and weaponized (archives, gossip, censored reports).",
        "Legitimacy matters (rites, decrees, lineage, omens).",
        "Violence is political: open force is costly; procedure and scandal are weapons.",
      ],
      pressureMechanisms: [
        "Appointment and audit cycles (promotion, demotion, investigations).",
        "Scandal economy (public shame, rumor velocity, cover-ups).",
        "Faction patronage (sponsors demand obedience).",
        "Access tokens (invitations, seals, escort rights) that expire.",
      ],
      level1: [
        "Define 3 factions with goals + red lines.",
        "Define 1 etiquette rule whose breach has a price.",
        "Define 1 controlled archive and who can access it.",
        "End scenes with a leverage choice: expose, bargain, submit, or counter-scheme.",
      ],
      level2: [
        "Use ceremony as communication (seating, gifts, titles as threats).",
        "Use bureaucratic weapons: audits, warrants, confiscation, exile.",
        "Make allies conditional: support requires favors or silence.",
        "Keep truth dangerous: revealing it destabilizes power and triggers crackdowns.",
      ],
      advanced: [
        "Run a succession clock: illness, heirs, treaties, marriage alliances.",
        "Make institutions collide: temple vs court vs military vs merchants.",
        "Use long-tail obligations: pardons, debts, oaths that come due later.",
        "Make reforms costly: anti-corruption creates new corruption methods.",
      ],
      antiPatterns: [
        "Intrigue as random betrayal with no incentives.",
        "Etiquette as flavor with no enforcement.",
        "Scandals that disappear with no institutional reaction.",
        "Factions as monoliths with no internal tension.",
      ],
      templates: [
        {
          name: "Leverage Exchange",
          body: `- What each side wants:
- What each side fears:
- Public constraint (ceremony/law):
- Private weapon (scandal/audit/blackmail):
- The price of cooperation:`,
        },
      ],
      examples: [
        {
          scenario: "Procedure as weapon",
          wrong: "They fight in the palace.",
          right:
            "They don't fight. They audit. They freeze accounts. They revoke invitations. They exile rivals under proper procedure—then everyone watches who signed the order.",
        },
      ],
    },
    {
      slug: "suspense-thriller",
      title: "Suspense / Thriller",
      description:
        "Suspense is structured uncertainty under time pressure. Use clocks, partial information, and escalating exposure. Keep actions reversible early and irreversible late.",
      whenToLoad:
        "When the story should feel tense: chases, investigations under threat, conspiracies, ticking clocks, narrow escapes.",
      coreConstraints: [
        "Time pressure matters (deadlines, pursuit, decay of evidence).",
        "Information is partial; certainty is earned at a cost.",
        "Exposure escalates (the more you act, the more you are seen).",
        "Safety is temporary; hiding buys time, not victory.",
      ],
      pressureMechanisms: [
        "Clocks and deadlines (24h/7 days consequences).",
        "Pursuit escalation (tail → ambush → raid).",
        "Resource constraints (sleep, money, ammo, allies).",
        "Trust constraints (who is compromised, who leaks).",
      ],
      level1: [
        "Define one clock and advance it on action/hesitation.",
        "Define one partial clue and one cost to confirm it.",
        "Define one escalation ladder for the antagonist.",
        "End turns with an actionable pressure question (what next?).",
      ],
      level2: [
        "Use false security: temporary relief that hides a bigger trap.",
        "Keep choices constrained: every option costs time or exposure.",
        "Keep antagonists rational: counter-moves make sense in hindsight.",
        "Make surveillance imperfect but dangerous (blind spots + audits).",
      ],
      advanced: [
        "Layer clocks (personal, institutional, physical) and let them conflict.",
        "Make revelations destabilize alliances and institutions.",
        "Use irreversible thresholds: once crossed, future options shrink.",
        "Keep aftermath: heat, warrants, burned contacts.",
      ],
      antiPatterns: [
        "Random scares without clocks or escalation logic.",
        "Antagonist omniscience with no surveillance/informant system.",
        "Convenient escapes with no cost or trail.",
        "Tension without choices (only narration).",
      ],
      templates: [
        {
          name: "Thriller Clock",
          body: `- Clock (what happens at 0):
- Trigger to advance:
- Escalation step:
- One confirmable clue + cost:
- Temporary safety + failure mode:`,
        },
      ],
      examples: [
        {
          scenario: "Partial info with cost",
          wrong: "You instantly know who is following you.",
          right:
            "You suspect you're followed. Confirming means doubling back through a camera-heavy street—fast, but logged. Or taking the alley—slower, but safer. Either way, you pay.",
        },
      ],
    },
    {
      slug: "chinese-short-drama",
      title: "Chinese Short Drama (Structure)",
      description:
        "Short-drama style emphasizes frequent reversals, cliffhangers, and high social leverage—without breaking causality. Use tight scenes, visible status swings, and institutional reactions.",
      whenToLoad:
        "When aiming for Chinese short-drama pacing: fast turns, social stakes, frequent reveals, cliffhangers (but still consistent and choice-driven).",
      coreConstraints: [
        "Reversals must follow incentives and evidence (no random twists).",
        "Status and reputation move quickly; gossip is fast.",
        "Institutions react: audits, punishments, invitations revoked, titles granted.",
        "Scenes are tight: one conflict, one choice, one consequence per beat.",
      ],
      pressureMechanisms: [
        "Public shame vs private leverage.",
        "Deadline beats (banquet, trial day, wedding, announcement).",
        "Sponsor/patronage demands.",
        "Escalating procedural retaliation (investigation → decree → seizure).",
      ],
      level1: [
        "End each turn with a concrete pressure beat (invitation, accusation, decree, ultimatum).",
        "Make one status gate visible (who may speak/enter/own).",
        "Make one reveal actionable (changes alliances, access, or risk).",
        "Keep player agency: reversals change choices; they don't remove them.",
      ],
      level2: [
        "Use ceremonies as mechanics: seating, gifts, titles, oaths.",
        "Use audit cycles and registries as weapons.",
        "Make antagonists rational: they protect face and interests.",
        "Keep consequences persistent: reputational damage changes access tomorrow.",
      ],
      advanced: [
        "Run multi-faction chess: 3 factions, each with internal split.",
        "Let the protagonist pay costs: favors owed, debts, oaths, evidence risk.",
        "Use evidence standards (what convinces court/temple/guild).",
        "Design a long-tail reckoning: today's victory becomes tomorrow's audit.",
      ],
      antiPatterns: [
        "Twists that contradict established facts.",
        "Constant humiliation without mechanism (no gates, no enforcement).",
        "Antagonists who are stupid to enable reversals.",
        "Railroading cliffhangers that remove player agency.",
      ],
      templates: [
        {
          name: "Reversal Beat",
          body: `- Public scene:
- Status gate:
- Reveal (actionable):
- Immediate consequence:
- Next pressure beat (deadline):`,
        },
      ],
      examples: [
        {
          scenario: "Reversal with mechanism",
          wrong: "Suddenly the emperor appears and saves you.",
          right:
            "The audit ledger appears—because you planted it. It forces the minister to choose: admit guilt publicly or take the blame quietly. Either way, the court reacts. Your win creates a new enemy.",
        },
      ],
    },

    // =========================================================================
    // Additional modular building blocks (era/style/elements)
    // =========================================================================
    {
      slug: "era-ancient",
      title: "Ancient Era",
      description:
        "Ancient-era stories are powered by hierarchy, ritual legitimacy, slow logistics, and local law. Distance, seasonality, and face/obligation should be active constraints.",
      whenToLoad:
        "When the setting is ancient/classical: temples, clans, court rites, caravans, local magistrates, and slow information.",
      coreConstraints: [
        "Legitimacy is ritualized (rites, omens, lineage, divine approval).",
        "Law is local and personal (jurisdiction boundaries matter).",
        "Travel is slow and costly; escorts and passes are gameplay.",
        "Records exist but are human: seals, scribes, archives, gossip.",
      ],
      pressureMechanisms: [
        "Rites and ceremonies as access gates (seating, gifts, oaths).",
        "Seasonal scarcity (harvest, winter, floods) and route chokepoints.",
        "Honor/face enforcement and obligation chains.",
        "Temple/guild monopolies and local power brokers.",
      ],
      level1: [
        "Define one ritual gate and its price (time/sacrifice/tribute).",
        "Define one jurisdiction boundary (temple vs court vs clan).",
        "Define one travel chokepoint and its controller.",
        "Make rumor velocity explicit (scandal fast, official news slow).",
      ],
      level2: [
        "Use public shame/apology as a mechanic (face can be traded for access).",
        "Make paperwork physical: seals, witnesses, copied ledgers; forgery has audits.",
        "Make scarcity produce politics: grain stores, water rights, conscription.",
        "Use vendettas and ancestral duties as long-tail obligations.",
      ],
      advanced: [
        "Build a three-era residue chain (old dynasty → rupture → compromise).",
        "Make reform costly: anti-corruption creates new corruption channels.",
        "Run a multi-stakeholder lattice: temple ↔ magistrate ↔ merchants ↔ militia.",
        "Let disasters reshape legitimacy (famine → riots → scapegoats → decrees).",
      ],
      antiPatterns: [
        "Ancient aesthetic with modern logistics (instant travel, infinite supplies).",
        "Rituals as flavor with no gate/enforcement.",
        "Honor with no incentives or consequences.",
        "Omniscient bureaucracy with perfect records and no human bottlenecks.",
      ],
      templates: [
        {
          name: "Ritual Gate",
          body: `- Ritual:
- Price (time/tribute/sacrifice):
- Gatekeeper:
- Workaround (insider/forgery):
- Consequence if refused:`,
        },
      ],
      examples: [
        {
          scenario: "Ritual as access control",
          wrong: "You enter the sacred hall because the plot needs it.",
          right:
            "You can enter the sacred hall only after cleansing and a witness-signature. Skip it and you may enter—but your name is recorded as 'unclean,' changing how guards and merchants treat you tomorrow.",
        },
      ],
    },
    {
      slug: "era-republican",
      title: "Republican / Art Deco",
      description:
        "Republican-era (early modern) stories run on modern institutions layered over old social orders: police, newspapers, banks, warlords, guilds, and political clubs. Make surveillance partial and politics procedural.",
      whenToLoad:
        "When the setting resembles early 20th century: newspapers, banks, police, concessions, clubs, and competing factions.",
      coreConstraints: [
        "Institutions exist, but capacity is uneven (patchy enforcement, corruption).",
        "Media and rumor velocity are high; reputation swings quickly.",
        "Money is contractual: debts, banks, audits, bribes, concessions.",
        "Old status systems persist inside new procedures (face, lineage, patrons).",
      ],
      pressureMechanisms: [
        "Police response ladders and political 'campaigns' (crackdowns).",
        "Press exposure, propaganda, and scandal economies.",
        "Faction conflict: warlords, clubs, unions, foreign interests.",
        "Paperwork gates: permits, stamps, registries, pass cards.",
      ],
      level1: [
        "Define one media outlet and what it can ruin or protect.",
        "Define one police gate (permit/checkpoint) and a workaround with risk.",
        "Define one debt/contract that creates an obligation clock.",
        "End scenes with a public/private tension choice.",
      ],
      level2: [
        "Use concessions/jurisdiction boundaries: different rules across streets.",
        "Make corruption specific: bribe gates, audits, and principled actors.",
        "Keep surveillance partial: blind spots exist, but logs/audits happen later.",
        "Use clubs and patronage as access brokers (invites, sponsors).",
      ],
      advanced: [
        "Build a stakeholder lattice: money ↔ law ↔ media ↔ force ↔ foreign interests.",
        "Use strikes, shortages, and refugees as political pressure engines.",
        "Let revelations trigger procedural retaliation (audits, seizures, warrants).",
        "Keep long-tail consequences: blacklists, travel bans, asset freezes.",
      ],
      antiPatterns: [
        "Modern props with no procedural response (crime without heat).",
        "Media as omniscient narrator (no incentives, no sources).",
        "Corruption as universal and random (no mechanisms).",
        "Factions as monoliths without internal incentives.",
      ],
      templates: [
        {
          name: "Press + Police",
          body: `- Media outlet:
- What it wants:
- Police gate:
- Workaround:
- Audit/log trail:
- 7-day consequence:`,
        },
      ],
      examples: [
        {
          scenario: "Procedural retaliation",
          wrong: "You expose the official and he disappears.",
          right:
            "You expose the official. The next day, permits freeze under an 'anti-corruption audit.' Your bank account is flagged. The official doesn't vanish—he weaponizes procedure.",
        },
      ],
    },
    {
      slug: "style-scifi",
      title: "Sci-Fi Style",
      description:
        "Sci-fi is about capability boundaries and second-order consequences. Make technology social: access control, maintenance, audit trails, and counterplay. Treat society as a system reacting to new capabilities.",
      whenToLoad:
        "When the story is sci-fi: advanced tech, space, AI, biotech, cybernetics, surveillance, or futuristic institutions.",
      coreConstraints: [
        "Capabilities have access + cost + counterplay (no free miracles).",
        "Infrastructure and logistics matter (power, comms, transport, maintenance).",
        "Information leaves trails (logs, sensors, audits).",
        "Institutions adapt: law, markets, and culture respond to new tech.",
      ],
      pressureMechanisms: [
        "Maintenance bottlenecks and service contracts.",
        "Security/audit cycles and escalation ladders.",
        "Resource constraints (fuel, air, bandwidth, medical supplies).",
        "Ethical/legal friction (licenses, bans, black markets).",
      ],
      level1: [
        "Define one capability and its counterplay (detect/jam/spoof).",
        "Define one maintenance failure mode (battery, calibration, corruption).",
        "Define one access gate (license, credential, key, sponsor).",
        "Make choices tradeoffs: power vs traceability vs legality.",
      ],
      level2: [
        "Use audit trails: actions become investigations later.",
        "Design blind spots and false positives (friction and opportunity).",
        "Make tech reshape class: badge zones, subscription survival, private policing.",
        "Keep counterplay symmetric: defenders have procedures and backups.",
      ],
      advanced: [
        "Build multi-stakeholder conflict over chokepoints (ports, data centers, locks).",
        "Model long arcs: a capability triggers regulation and new black markets.",
        "Use 'system memory': registries, reputation scores, warrants, watchlists.",
        "Make disasters systemic: cascading failures and triage politics.",
      ],
      antiPatterns: [
        "Tech as magic with no access/cost/counterplay.",
        "Perfect surveillance with no blind spots or audits.",
        "Worldbuilding as gadget list (no second-order consequences).",
        "Instant solutions that erase constraints (no maintenance, no logistics).",
      ],
      templates: [
        {
          name: "Capability Card",
          body: `- Capability:
- Access gate:
- Cost/maintenance:
- Counterplay:
- Audit trail:
- Failure mode:`,
        },
      ],
      examples: [
        {
          scenario: "Second-order consequence",
          wrong: "You use the tech and it solves everything.",
          right:
            "You use the tech and it works—then it changes the world: regulators tighten licenses, corporations start audits, and smugglers sell counterfeit keys. You solved one problem and created three.",
        },
      ],
    },
    {
      slug: "style-supernatural",
      title: "Supernatural Style",
      description:
        "Supernatural stories treat the unseen as a system: rules, costs, thresholds, and institutions that police it. Keep mysteries intact by gating knowledge and making rituals procedural.",
      whenToLoad:
        "When the story includes ghosts, curses, demons, occult agencies, exorcism, wards, or hidden-world institutions.",
      coreConstraints: [
        "The supernatural has rules and failure modes (no wish fulfillment).",
        "Knowledge is gated (archives, initiations, oaths, dangerous truths).",
        "Rituals are procedural: costs, materials, time, witnesses.",
        "Institutions exist: cults, temples, hunters, occult bureaus.",
      ],
      pressureMechanisms: [
        "Exposure escalation: the more you know, the more it notices.",
        "Resource scarcity: relics, wards, salt, holy water, sigils.",
        "Jurisdiction conflicts: temple law vs state law vs occult rules.",
        "Social stigma and secrecy logistics (double lives).",
      ],
      level1: [
        "Define one rule of the supernatural (what it wants/avoids).",
        "Define one ritual with cost + failure consequence.",
        "Define one knowledge gate (initiation, archive, oath).",
        "Make safety temporary; rituals buy time, not omnipotence.",
      ],
      level2: [
        "Use institutions: permits, heresy trials, occult audits, registries.",
        "Design counterplay: wards can fail, seals can be forged, rituals can be interrupted.",
        "Let belief and fraud coexist: counterfeit relics, false prophets, audits.",
        "Tie to mundane systems: hospitals, police reports, media cover-ups.",
      ],
      advanced: [
        "Build a schism ecology: factions within the faith/agency conflict over doctrine.",
        "Use residue chains: old curses leave institutional and psychological scars.",
        "Run long-tail obligations: pacts, debts, oaths that come due later.",
        "Make revelations destabilize power: truth triggers crackdowns and witch hunts.",
      ],
      antiPatterns: [
        "Supernatural as random spooky events (no rules).",
        "Rituals as instant buttons (no cost/time/material).",
        "Hidden world with no institutions or enforcement.",
        "Exposition dumps that destroy mystery (no gating).",
      ],
      templates: [
        {
          name: "Ritual Card",
          body: `- Goal:
- Cost:
- Materials:
- Time window:
- Failure consequence:
- What it attracts (exposure):`,
        },
      ],
      examples: [
        {
          scenario: "Ritual buys time",
          wrong: "You exorcise it and it's gone forever.",
          right:
            "You seal it for three nights. The seal requires incense and a witness mark. The third night, the incense runs out. Now you must find more, negotiate with a temple clerk, or improvise—with consequences.",
        },
      ],
    },
    {
      slug: "element-war",
      title: "War (Element)",
      description:
        "War as an element should be driven by logistics, occupation costs, and political blowback. Depots and chokepoints are objectives; battles are consequences.",
      whenToLoad:
        "When adding war/campaign elements to any story: armies, sieges, occupations, raids, insurgency, wartime markets.",
      coreConstraints: [
        "Combat power is limited by supply lines and cohesion.",
        "Occupation is expensive: policing rules and insurgency are inevitable.",
        "Civilian markets react: requisition, famine, profiteers, refugees.",
        "Information is delayed and distorted (fog of war).",
      ],
      pressureMechanisms: [
        "Ration/ammo/morale clocks.",
        "Chokepoints: bridges, locks, passes, depots.",
        "Political deadlines: treaties, elections, succession crises.",
        "Insurgency sabotage of infrastructure.",
      ],
      level1: [
        "Define one supply origin + route + chokepoint.",
        "Define one campaign clock (rations/ammo/morale/politics).",
        "Define one occupation rule and one insurgency method.",
        "Make civilian fallout visible (prices, disease, refugees).",
      ],
      level2: [
        "Use attrition: disease, desertion, corruption, exhaustion.",
        "Make raids strategic: burning depots changes maps.",
        "Let politics weaponize procedure: audits, purges, scapegoats.",
        "Make alliances conditional: war creates debts and betrayals.",
      ],
      advanced: [
        "Make war economy feedback a plot arc (contracts → coups).",
        "Run multi-front pressure: internal revolt while external war continues.",
        "Let victories create new costs (occupation, reconstruction, legitimacy).",
        "Keep long-tail trauma and resentment.",
      ],
      antiPatterns: [
        "War as endless battles with no logistics or markets.",
        "Occupation as 'we won, so it's ours' with no policing cost.",
        "Violence without injury clocks or resource constraints.",
        "Armies teleporting across maps.",
      ],
      templates: [
        {
          name: "Campaign Card",
          body: `- Supply line:
- Chokepoint:
- Campaign clock:
- Occupation rule:
- Civilian fallout:
- Insurgency method:`,
        },
      ],
      examples: [
        {
          scenario: "Depot objective",
          wrong: "You win the war by winning a big battle.",
          right:
            "You win by burning the depot that feeds the front. The battle never happens—because the enemy retreats when rations run out. Then you inherit refugees and riots. Victory has paperwork.",
        },
      ],
    },
    {
      slug: "element-law",
      title: "Law & Procedure (Element)",
      description:
        "Law as an element is authority + enforcement capacity + corruption gates + appeal paths. Use it to create friction, leverage, and predictable reaction—not random punishment.",
      whenToLoad:
        "When adding legal/procedural elements: investigations, trials, permits, warrants, jurisdiction conflicts, corruption.",
      coreConstraints: [
        "Jurisdiction boundaries matter (authority stops somewhere).",
        "Enforcement capacity is finite (coverage, response time, detention limits).",
        "Evidence standards exist (what counts as proof).",
        "Appeals and exceptions have costs and timelines.",
      ],
      pressureMechanisms: [
        "Audits, inspections, and procedural freezes.",
        "Bribe gates and principled actors who cannot be bought.",
        "Registries and blacklists (institutional memory).",
        "Penalties that create story (confiscation, bond, exile).",
      ],
      level1: [
        "Define one jurisdiction boundary and one enforcement bottleneck.",
        "Define one always-punished crime and one buyable infraction.",
        "Define one evidence standard and one appeal path.",
        "Make penalties generate next actions (not dead ends).",
      ],
      level2: [
        "Use procedure as weapon: asset freezes, permit revocations, summons.",
        "Make corruption specific: gates, prices, audits, intermediaries.",
        "Make law interact with status: who gets searched, who gets counsel.",
        "Make trials political: legitimacy brokers shape outcomes.",
      ],
      advanced: [
        "Run a legal clock: investigation → summons → trial → enforcement.",
        "Let revelations shift law: reforms and backlash cycles.",
        "Use contested truth: official record vs folk story vs private archive.",
        "Keep long-tail consequences: registry marks and travel restrictions.",
      ],
      antiPatterns: [
        "Law as omnipotent hammer with no capacity limits.",
        "Random punishment with no evidence standards.",
        "Perfect corruption (everyone buyable) with no principled actors.",
        "Trials as speeches with no procedure or incentives.",
      ],
      templates: [
        {
          name: "Jurisdiction Card",
          body: `- Authority:
- Boundary:
- Enforcement capacity:
- Evidence standard:
- Bribe gate:
- Appeal path:`,
        },
      ],
      examples: [
        {
          scenario: "Appeal creates gameplay",
          wrong: "You're arrested; game over.",
          right:
            "You're arrested and released on bond with a summons in three days. You can prepare evidence, bribe a clerk, find a sponsor, or flee—each choice has a trail and a price.",
        },
      ],
    },
    {
      slug: "element-academy",
      title: "Academy / Institution (Element)",
      description:
        "Academy stories are about gates, schedules, and credential power: exams, patronage, discipline, and rivalries. Make education a pipeline with costs and audits.",
      whenToLoad:
        "When adding an academy/institution element: schools, guild training, magic academies, corporate training programs, exams.",
      coreConstraints: [
        "Credentials gate access and status (licenses, ranks, invitations).",
        "Schedules are power (deadlines, rotations, office hours, exams).",
        "Patronage and rivalry shape opportunity.",
        "Records exist (scores, misconduct, registries) with long tails.",
      ],
      pressureMechanisms: [
        "Exam clocks and project deadlines.",
        "Discipline systems and probation (procedural punishment).",
        "Competition for scarce resources (labs, mentors, scholarships).",
        "Scandal economy and reputation damage among peers.",
      ],
      level1: [
        "Define one credential gate and the exam/project that grants it.",
        "Define one mentor gatekeeper and their incentive.",
        "Define one rival and what they can sabotage procedurally.",
        "Make the schedule a constraint (time costs).",
      ],
      level2: [
        "Use audits and misconduct investigations as story engines.",
        "Make workarounds risky: cheating, forged letters, bribed clerks.",
        "Make curriculum tied to the world: internships, fieldwork, patrons.",
        "Let graduation create obligations: debt, service, oaths.",
      ],
      advanced: [
        "Build faction politics inside the institution (departments, sects, clubs).",
        "Make credentials alter law/economy access (permits, licenses).",
        "Run a long arc: one scandal reshapes future access and allies.",
        "Let reforms create backlash cycles (anti-cheating → new cheating).",
      ],
      antiPatterns: [
        "Academy as set dressing with no gates or schedules.",
        "Rivals as bullies with no procedural leverage.",
        "Instant competence with no training or cost.",
        "No institutional memory (scores/misconduct vanish).",
      ],
      templates: [
        {
          name: "Exam Clock",
          body: `- Credential:
- Deadline:
- Gatekeeper:
- Rival sabotage:
- Workaround + audit risk:
- Consequence of failure:`,
        },
      ],
      examples: [
        {
          scenario: "Schedule as power",
          wrong: "You meet the dean whenever you want.",
          right:
            "The dean has office hours once a week. Missing it delays your permit by seven days. A rival tries to push your file into 'incomplete' status. Time becomes leverage.",
        },
      ],
    },
    {
      slug: "element-urban",
      title: "Urban Pressure (Element)",
      description:
        "Urban stories run on density: surveillance, witnesses, traffic, permits, rent, and layered jurisdictions. Make cities act like machines with bottlenecks and hidden routes.",
      whenToLoad:
        "When adding an urban element: cities, megacities, districts, slums, corporate zones, dense social networks.",
      coreConstraints: [
        "Witness density is high; anonymity costs effort or money.",
        "Districts have gates: badges, curfews, permits, tariffs.",
        "Infrastructure bottlenecks exist (transit, water, power, comms).",
        "Gossip velocity is fast and distorting.",
      ],
      pressureMechanisms: [
        "Checkpoints and zoning restrictions.",
        "Rent day, debt collection, and service cutoff clocks.",
        "Traffic/chokepoints and response times.",
        "Informant ecology: clerks, street kids, doormen, CCTV operators.",
      ],
      level1: [
        "Define 3 districts with one gate each (badge/permit/curfew).",
        "Define one hidden route (maintenance tunnels, rooftops, sewers) with risks.",
        "Define one infrastructural bottleneck that can fail or be exploited.",
        "Make witnesses/logs create a trail that can be managed at a cost.",
      ],
      level2: [
        "Use layered jurisdictions: different rules across one street.",
        "Make underworld services systemic: safehouses, forged IDs, bribed clerks.",
        "Make infrastructure failures cascade into politics (triage, riots).",
        "Make neighborhoods react: local bosses, unions, temples, corp security.",
      ],
      advanced: [
        "Build a heat ledger: each act changes future access and policing.",
        "Let markets react: shortages, price spikes, protection rackets.",
        "Run long arcs: redevelopment, displacement, faction consolidation.",
        "Use disasters as stress tests: quarantine zones and rationing politics.",
      ],
      antiPatterns: [
        "City as backdrop with no gates, no bottlenecks, no witnesses.",
        "Perfect anonymity in dense environments.",
        "Procedural response that never happens (no audits, no patrols).",
        "Districts with no meaningful differences.",
      ],
      templates: [
        {
          name: "3-District Map",
          body: `- District A gate:
- District B gate:
- District C gate:
- Hidden route + risk:
- Bottleneck:
- Informant stream:`,
        },
      ],
      examples: [
        {
          scenario: "Hidden route has a cost",
          wrong: "You take a secret tunnel and avoid everything.",
          right:
            "You take the maintenance tunnel—then need a union token to open the inner hatch. The token is logged. You avoided cameras, but created an audit trail with a new stakeholder.",
        },
      ],
    },
    {
      slug: "element-espionage",
      title: "Espionage & Counterintel (Element)",
      description:
        "Espionage as an element is a procedural system: sources, channels, verification costs, and traces—plus counterintelligence that reacts with capacity limits and ladders.",
      whenToLoad:
        "When adding spy/informant/infiltration/deception elements to any story: leaks, stings, covert operations, internal security, political policing.",
      coreConstraints: [
        "Every intel has a source with motive and constraints.",
        "Intel travels via channels with latency and traces.",
        "Verification is possible but costly (time, exposure, money).",
        "Counterintelligence is procedural and capacity-limited (not omniscient).",
      ],
      pressureMechanisms: [
        "Watchlist and audit triggers (logs, patterns, money).",
        "Stings and controlled leaks.",
        "Compartmentalization and internal purges.",
        "Burned identities/sources as long-tail constraints.",
      ],
      level1: [
        "Define 2 sources with incentive + constraint + price.",
        "Define 1 channel with latency + trace (dead drop/courier/comm).",
        "Define 1 verification method with cost + risk.",
        "Add a choice: speed vs secrecy vs certainty.",
      ],
      level2: [
        "Run an op as a scene engine: recruit → handle → protect → extract.",
        "Use controlled tests: feed a unique lie and see where it appears.",
        "Make cover maintenance real: renewals, witnesses, audits, receipts.",
        "Keep counterintel coherent: watch → question → detain → raid.",
      ],
      advanced: [
        "Model a source network: handler chains, safe meetings, protection costs.",
        "Run deception warfare: false documents, staged events, narrative control.",
        "Let security posture evolve: incidents tighten gates and reassign personnel.",
        "Make long-tail fallout: burned channels reshape future access and allies.",
      ],
      antiPatterns: [
        "Intel as magic narrator (no source, no motive).",
        "Instant verification with no trace or cost.",
        "Omniscient counterintel that always knows everything.",
        "Random betrayals with no incentive trail.",
      ],
      templates: [
        {
          name: "Intel Card",
          body: `- Source + motive:
- Channel + latency:
- Verification method + cost:
- Trace/receipt:
- Counterintel trigger:
- Escalation ladder:`,
        },
      ],
      examples: [
        {
          scenario: "Verification creates tradeoffs",
          wrong: "You know it's true because a spy told you.",
          right:
            "You can confirm it quickly by querying a clerk (leaves a log) or slowly by observing movement (info may stale). Either way, you create traces counterintel can review tomorrow.",
        },
      ],
    },
    {
      slug: "element-medicine",
      title: "Medicine & Forensics (Element)",
      description:
        "Medicine as an element is harm + capacity + proof: injuries become clocks, treatment is gated, and evidence is processed through chain-of-custody with standards and tampering vectors.",
      whenToLoad:
        "When adding medical/forensic elements: injuries and recovery, poisons, clinics/temples, autopsies, evidence standards, and proof disputes.",
      coreConstraints: [
        "Injuries are persistent via clocks and recovery constraints.",
        "Care is gated by capacity and access rules (ID, sponsor, payment).",
        "Forensics is procedural: collection → seal → processing → interpretation.",
        "Proof standards differ by audience (court vs public vs institution).",
      ],
      pressureMechanisms: [
        "Bleeding/infection/exposure clocks and treatment windows.",
        "Shortages and queues; bribe points with audit risk.",
        "Counterfeit medicines and poison economies.",
        "Evidence tampering and chain-of-custody disputes.",
      ],
      level1: [
        "Turn one injury into a clock with a failure mode.",
        "Define one treatment gate (triage/ID/payment/sponsor).",
        "Define one workaround (street medic/forged referral) with audit risk.",
        "Define what counts as proof for the authority involved.",
      ],
      level2: [
        "Use capacity: beds, staff, supplies create procedural friction scenes.",
        "Make poison legible: vector + onset + antidote gate + counterfeit risk.",
        "Make chain-of-custody playable: seals, witnesses, transport vulnerabilities.",
        "Force tradeoffs: heal now vs stay hidden vs keep evidence clean.",
      ],
      advanced: [
        "Model institutional incentives: hospitals protect themselves; labs have quotas.",
        "Run a proof war: documents, experts, and audits fight over interpretation.",
        "Let medical debt and stigma reshape access (jobs, permits, sponsors).",
        "Keep long-tail consequences: scars, disability, records, obligations.",
      ],
      antiPatterns: [
        "Injuries that reset instantly with no constraints.",
        "Treatment with no access gates or capacity limits.",
        "Forensics as instant truth with no chain-of-custody.",
        "Poisons as instant kills with no vector/onset/antidote logic.",
      ],
      templates: [
        {
          name: "Injury Clock",
          body: `- Injury:
- Clock type:
- Failure mode:
- Treatment gate:
- Workaround + audit risk:
- Recovery constraint:`,
        },
      ],
      examples: [
        {
          scenario: "Treatment is gated",
          wrong: "You go to the hospital and get fixed.",
          right:
            "The clinic logs your ID and the injury. Treatment is possible, but creates a record that can be subpoenaed. The alternative is a street medic who can help quietly—if you steal antibiotics, which will show up in a warehouse audit.",
        },
      ],
    },
    {
      slug: "element-diplomacy",
      title: "Diplomacy & Treaties (Element)",
      description:
        "Diplomacy as an element is commitments with enforcement: treaties with verification, guarantees, breach definitions, and predictable retaliation ladders. Protocol is an access gate.",
      whenToLoad:
        "When adding negotiation/alliance elements: ceasefires, borders, trade pacts, safe corridors, embassies, hostage guarantees, protocol traps.",
      coreConstraints: [
        "Agreements require verification and enforcement mechanisms.",
        "Guarantees exist (hostages, escrow, guarantors, oaths) with failure modes.",
        "Protocol rules matter (titles, gifts, witnesses) as access control.",
        "Breach thresholds are explicit and trigger ladders on timelines.",
      ],
      pressureMechanisms: [
        "Inspection demands and procedural retaliation (visa denial, freezes).",
        "Spoilers exploiting ambiguity and jurisdiction seams.",
        "Public optics and narrative warfare.",
        "Guarantee obligations due later (wards, escrow, oaths).",
      ],
      level1: [
        "Fill the treaty skeleton: parties, scope, concessions.",
        "Pick one verification method and its capacity limits.",
        "Pick one guarantee/collateral and its failure mode.",
        "Define breach threshold and 24h/7d retaliation ladder.",
      ],
      level2: [
        "Use audience protocol as gameplay (seating, titles, gift debt).",
        "Use jurisdiction boundaries: whose law applies where, and how to exploit it.",
        "Make enforcement procedural: holds, sanctions, inspections before war.",
        "Let excluded actors sabotage and force renegotiation beats.",
      ],
      advanced: [
        "Run multi-faction diplomacy: hawks vs doves within each party.",
        "Keep long-tail obligations: wards, escrow, guarantor debts.",
        "Use trade-offs: truth vs stability; justice vs peace; access vs sovereignty.",
        "Let treaties reshape markets and institutions over seasons.",
      ],
      antiPatterns: [
        "Treaties as speeches with no enforcement or proof.",
        "Protocol as flavor with no consequences.",
        "Instant war with no procedural escalation ladder.",
        "Monolithic parties with no internal incentives.",
      ],
      templates: [
        {
          name: "Treaty Skeleton",
          body: `- Parties + excluded:
- Scope:
- Concessions:
- Verification:
- Enforcement ladder:
- Guarantee/collateral:`,
        },
      ],
      examples: [
        {
          scenario: "Breach ladder",
          wrong: "They break the pact and everyone fights.",
          right:
            "Breach triggers protest note and inspection demand. Refusal triggers visa denial and asset holds (7 days). Only after escalation fails do raids and proxy funding begin. Politics decides timing.",
        },
      ],
    },
    {
      slug: "element-finance",
      title: "Finance & Banking (Element)",
      description:
        "Finance as an element is receipts and freeze power: ledgers, identity proof, audit cadence, debt ladders, and transfers that leave trails. Disputes are procedural.",
      whenToLoad:
        "When adding debt/payment/fraud elements: banks/temples/ledgers, asset freezes, letters of credit, accounting scandals, laundering.",
      coreConstraints: [
        "Value is recorded in ledgers with identity proof (seals/tokens/biometrics/witnesses).",
        "Transfers create receipts that can be audited later.",
        "Debt defaults follow ladders (fees → seizure → warrants).",
        "Freeze power exists and is procedural/capacity-limited (not arbitrary).",
      ],
      pressureMechanisms: [
        "Hold pending review (24h) and reconciliation audits (7 days).",
        "Blacklists/registries that change access.",
        "Fraud investigations and insider corruption gates.",
        "Liquidity shocks (bank run) and forced collateral calls.",
      ],
      level1: [
        "Define ledger authority and identity proof.",
        "Define one debt clock and default ladder.",
        "Define audit cadence and one trigger for review.",
        "Force a choice: speed vs traceability vs legality.",
      ],
      level2: [
        "Use letters of credit and document gates (manifest, seal, witness).",
        "Make freezes progressive: hold → limit → full freeze → warrant.",
        "Make fraud legible: one vector and one verification method.",
        "Let finance intersect law/status: who gets forgiven, who gets crushed.",
      ],
      advanced: [
        "Model trust networks: guarantors, brokers, guilds; scandal breaks networks.",
        "Run long-tail consequences: debt chains and reputational marks persist.",
        "Use asset warfare as politics: freezes and seizures shape factions.",
        "Keep capacity limits: auditors can only chase so many flags.",
      ],
      antiPatterns: [
        "Money as pure flavor (no receipts, no gates).",
        "Instant freezes with no triggers or ladders.",
        "Debt defaults as immediate game over.",
        "Fraud without verification and audits.",
      ],
      templates: [
        {
          name: "Freeze Ladder",
          body: `- Trigger:
- Hold (24h):
- Limit:
- Full freeze:
- Warrant/blacklist:
- Workaround + audit risk:`,
        },
      ],
      examples: [
        {
          scenario: "Audit latency matters",
          wrong: "You pay and it disappears.",
          right:
            "Payment clears today, but weekly reconciliation flags it. A 24h hold starts. You can produce documents, move assets via a broker (new obligations), or accept a freeze and pivot to favors.",
        },
      ],
    },
    {
      slug: "element-maritime",
      title: "Maritime & Ports (Element)",
      description:
        "Maritime as an element is ports-as-gates and season clocks: customs, quarantine, inspection, convoy protection, cargo disputes, and legal piracy.",
      whenToLoad:
        "When adding sea/port elements: smuggling through customs, blockades, piracy/privateering, convoy schedules, storm windows, cargo proofs.",
      coreConstraints: [
        "Ports are procedural gates (customs/quarantine/inspection).",
        "Routes have chokepoints and controllers with fees/bribes.",
        "Seasonality changes feasibility and time (depart window clocks).",
        "Cargo has proof documents and dispute vectors.",
      ],
      pressureMechanisms: [
        "Weather windows and storm seasons.",
        "Clearance delays and audits; insurance claims and fraud checks.",
        "Convoy schedules and escort capacity.",
        "Blockade and contraband definitions that shift politically.",
      ],
      level1: [
        "Define one route + chokepoint + controller.",
        "Define two port gates (customs + quarantine/inspection/berth).",
        "Define one season clock (depart now vs wait weeks).",
        "Add one dispute engine (weight/spoilage/forged seal).",
      ],
      level2: [
        "Make protection systemic: convoy schedules and insurance requirements.",
        "Make paperwork playable: manifests, stamps, weights and audit risks.",
        "Define legal piracy: letters of marque and prize courts.",
        "Use blockade as an economy weapon (shortages drive politics).",
      ],
      advanced: [
        "Model port politics: unions, guilds, navy, smugglers, insurers compete.",
        "Run long-tail consequences: seizure records and blacklists persist.",
        "Let logistics drive war arcs: depots/docks are objectives.",
        "Make disease a voyage clock (quarantine and stigma).",
      ],
      antiPatterns: [
        "Sea travel as fast travel with no gates or delays.",
        "Ports with no customs/quarantine/inspection.",
        "Pirates as random encounters with no economics or law.",
        "Cargo disputes solved by narration with no documents or audits.",
      ],
      templates: [
        {
          name: "Port Gate Card",
          body: `- Gate (customs/quarantine/inspection):
- Process:
- Workaround:
- Audit/verification risk:
- Timeline:
- Counter-move:`,
        },
      ],
      examples: [
        {
          scenario: "Quarantine gate creates choice",
          wrong: "You dock and unload immediately.",
          right:
            "Quarantine delays unloading 3 days unless a sponsor signs liability. Smuggling at night bypasses it but creates a berth record anomaly; customs will audit manifests within a week.",
        },
      ],
    },
    {
      slug: "element-media",
      title: "Media & Propaganda (Element)",
      description:
        "Media as an element is narratives with infrastructure: channels, gatekeepers, censorship, response ladders, proof standards by audience, and reputation marks that change access.",
      whenToLoad:
        "When adding publicity/rumor/censorship elements: press storms, scandal arcs, propaganda campaigns, takedowns, denials, smear and counter-smear.",
      coreConstraints: [
        "Channels exist with gatekeepers (publish/block).",
        "Proof standards differ by audience (public vs authority).",
        "Control creates markets (backchannels and coded speech).",
        "Narratives trigger procedural response ladders on timelines.",
      ],
      pressureMechanisms: [
        "Rumor velocity and story decay.",
        "Takedowns, bans, intimidation, and official statements.",
        "Investigations and crackdowns after attention peaks.",
        "Persistent archives and stigma that alter future access.",
      ],
      level1: [
        "Define 2 channels and their gatekeepers.",
        "Define one censorship rule and one backchannel.",
        "Define proof standard for public and for authority.",
        "Define a response ladder with 24h/7d beats.",
      ],
      level2: [
        "Run narrative warfare: controlled leaks, scapegoats, denials, receipts.",
        "Make reputation change access: sponsors, safehouses, jobs, audiences.",
        "Use false positives: censorship hits innocents; corruption gates appear.",
        "Force choices: publish now vs verify; name source vs protect them.",
      ],
      advanced: [
        "Model institutions: press, police, courts, platforms align and conflict.",
        "Keep long-tail consequences: archives, blacklists, and reputational marks persist.",
        "Use propaganda as logistics: distribution networks, printing, priests, algorithms.",
        "Let the narrative reshape policy and enforcement over seasons.",
      ],
      antiPatterns: [
        "Public opinion as a single meter with no channels or gatekeepers.",
        "Instant universal belief with no proof standards.",
        "Censorship that fully works (no backchannels).",
        "No long-tail effects (scandals vanish overnight).",
      ],
      templates: [
        {
          name: "Response Ladder",
          body: `- Channel + gatekeeper:
- Proof standard (public vs authority):
- 24h response:
- 7d response:
- Reputation mark:
- Backchannel + failure mode:`,
        },
      ],
      examples: [
        {
          scenario: "Proof vs story mismatch",
          wrong: "The public sees the truth and everyone agrees.",
          right:
            "The story spreads, but authorities demand documents and witnesses. Gatekeepers can ban the topic within 24h. You can publish more receipts (risking your source) or pivot to a backchannel while the crackdown clock advances.",
        },
      ],
    },
  ];

  return defs.map((def) => {
    const depth = THEME_DEPTH[def.slug];
    if (!depth) {
      throw new Error(`Missing THEME_DEPTH entry for theme slug: ${def.slug}`);
    }
    return {
      ...def,
      ...depth,
    };
  });
}

function buildThemeSkillSeeds(): GlobalSkillSeed[] {
  return buildResolvedThemeSkillDefs().map((def) => ({
    path: `skills/theme/${def.slug}/SKILL.md`,
    contentType: "text/markdown",
    content: buildThemeSkillMarkdown(def),
  }));
}

const THEME_SKILLS: GlobalSkillSeed[] = buildThemeSkillSeeds();

// ============================================================================
// Build Complete Skills Set
// ============================================================================

const buildThemeCatalogEntries = (): SkillCatalogEntry[] => {
  return buildResolvedThemeSkillDefs()
    .map((def) => ({
      id: `theme-${def.slug}`,
      title: `${def.title} Theme`,
      tags: ["theme", def.slug, ...(def.aliases ?? [])],
      path: `current/skills/theme/${def.slug}/SKILL.md`,
      domain: "theme",
      priority: "medium",
      description: def.description,
      whenToLoad: def.whenToLoad,
      seeAlso: [],
    }))
    .sort((a, b) => a.id.localeCompare(b.id));
};

export function getAllSkillCatalogEntries(): SkillCatalogEntry[] {
  const merged = new Map<string, SkillCatalogEntry>();
  for (const entry of [...getSkillCatalogEntries(), ...buildThemeCatalogEntries()]) {
    merged.set(entry.id, entry);
  }
  return [...merged.values()];
}

export function getAllSkillIndexEntries(): SkillIndexEntry[] {
  return getAllSkillCatalogEntries().map((entry) => ({
    id: entry.id,
    title: entry.title,
    tags: entry.tags,
    path: entry.path,
  }));
}

function buildAllSkillSeeds(): GlobalSkillSeed[] {
  // Generate skills from atoms
  const atomSkills = generateVfsSkillSeeds();

  const allIndexEntries = getAllSkillIndexEntries();

  // Build the complete skills set
  return [
    SKILLS_README_SEED,
    SKILLS_STYLE_SEED,
    SKILLS_TAXONOMY_SEED,
    ...atomSkills,
    ...THEME_SKILLS,
    buildSkillsIndexSeed(allIndexEntries),
  ];
}

// ============================================================================
// Main Export
// ============================================================================

/**
 * Build the complete VFS skills file map
 */
export function buildGlobalVfsSkills(now: number = Date.now()): VfsFileMap {
  const skills = buildAllSkillSeeds();
  const files: VfsFileMap = {};

  for (const seed of skills) {
    const path = normalizeVfsPath(seed.path);
    const content = seed.content;
    const file: VfsFile = {
      path,
      content,
      contentType: seed.contentType,
      hash: hashContent(content),
      size: content.length,
      updatedAt: now,
    };
    files[path] = file;
  }

  return files;
}
