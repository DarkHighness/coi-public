/**
 * ============================================================================
 * Core Atom: Protagonist Perceptual Lens
 * ============================================================================
 *
 * 主角感知透镜 — 将 protagonistFeature 从角色创建约束升级为叙事渲染滤镜。
 *
 * 核心理念：身份不仅是"你是谁"，更是"世界如何在你面前展开"。
 * 侦探和农民站在同一个房间里，看到的是两个不同的房间。
 *
 * 四条渲染轴：
 *   1. Detail Selection — 镜头优先捕捉什么
 *   2. NPC First-Contact — NPC 对主角可见身份的即时反应
 *   3. Environmental Gravitation — 什么情境自然地找上这个身份
 *   4. Competence Rendering — 专业领域内的观察力加成（非结论）
 *
 * 硬约束：不读心、不代替玩家行动、透镜不等于全知。
 */

import type { Atom, SkillAtom, SkillOutput } from "../types";
import { defineAtom, defineSkillAtom } from "../../trace/runtime";

export interface ProtagonistLensInput {
  protagonistFeature?: string;
}

// ---------------------------------------------------------------------------
// Full Atom
// ---------------------------------------------------------------------------

export const protagonistLens: Atom<ProtagonistLensInput> = defineAtom(
  {
    atomId: "atoms/core/protagonistLens#protagonistLens",
    source: "atoms/core/protagonistLens.ts",
    exportName: "protagonistLens",
  },
  ({ protagonistFeature }) => {
    if (!protagonistFeature) return "";

    return `
<protagonist_lens identity="${protagonistFeature}">

  <perceptual_rendering_engine>
    **THE CAMERA IS NOT NEUTRAL.**

    The protagonist's identity is a perceptual filter that determines WHAT DETAILS the narrative renders, in what ORDER, and with what WEIGHT. The world does not change — but the rendering of it does.

    This is NOT about inner thoughts (forbidden). This is about what the ENVIRONMENT SHOWS to someone with this background. A detective's eye catches forensic details not because we narrate "you suspect foul play" but because the narrative renders "the lock has fresh scratch marks around the keyhole; the dust on the windowsill is disturbed in a hand-shaped pattern." The details are THERE — the lens determines which ones get screen time.

    **ACTIVE LENS: "${protagonistFeature}"**

    The narrative camera is calibrated to this identity. Every scene must pass through this lens.
  </perceptual_rendering_engine>

  <lens_rendering_rules>

    <axis_1_detail_selection>
      **WHAT THE CAMERA SEES FIRST**

      The protagonist's background determines which environmental details get rendered with specificity vs. which get glossed over.

      **Rule**: In every scene description, at least 2 of the sensory details must be details that THIS specific protagonist identity would notice with unusual specificity.

      **Examples by identity** (illustrative, not exhaustive — extrapolate for "${protagonistFeature}"):
      - **Detective / Investigator**: scratch marks, ink stains, inconsistent alibis, the angle of a wound, which cup has lipstick, the smell of gunpowder under cologne
      - **Peasant / Orphan**: food (always food), warmth sources, escape routes, who looks dangerous, who looks kind, the price of bread, the weight of a coin
      - **Noble / Emperor**: protocol violations, quality of materials, who bows and who doesn't, the hierarchy of seating, the vintage of the wine, the thread count of the tablecloth
      - **Merchant / Trader**: the quality of goods, hidden costs, who's buying what, supply bottlenecks, counterfeit coins, the markup on that silk
      - **Soldier / Warrior**: exits, sight lines, weapon reach, terrain advantage, who's armed, who's pretending not to be, the weight of that armor
      - **Scholar / Mage**: inscriptions, anomalies in natural law, book spines, the age of documents, academic credentials on the wall, the grammar of a spell
      - **Thief / Rogue**: locks, guard rotations, shadow coverage, pocket bulges, the weight of a purse by how it swings, which window doesn't latch
      - **Doctor / Healer**: pallor, gait asymmetry, pupil dilation, the smell of infection, old needle marks, the tremor in a hand
      - **Courtier / Concubine**: micro-expressions, seating arrangements as battle formations, the angle of a brooch, who spoke first, who poured whose tea

      **CONSTRAINT**: Do NOT narrate WHY the protagonist notices these things. Just render them with more specificity than other details. The lens is silent; the world is loud.
    </axis_1_detail_selection>

    <axis_2_npc_first_contact>
      **THE WORLD READS YOU BEFORE YOU SPEAK**

      NPCs form instant judgments based on the protagonist's VISIBLE identity markers (appearance, clothing, bearing, speech patterns, smell, gear). These judgments are rendered through NPC BEHAVIOR, not narrator commentary.

      **Rule**: When the protagonist encounters a new NPC, the NPC's first action/reaction must reflect what they SEE (the protagonist's visible identity), not what the plot needs.

      **Identity-Reaction Examples** (extrapolate for "${protagonistFeature}"):
      - **Noble entering a slum**: Silence falls. Eyes track. Someone spits. A child tugs a mother's sleeve. Prices triple.
      - **Beggar entering a palace**: Guards intercept before the threshold. Servants wrinkle noses. A courtier covers their mouth with a silk handkerchief.
      - **Soldier entering a village**: Mothers pull children indoors. The elder steps forward with rehearsed deference. Someone hides a bag behind a barrel.
      - **Scholar entering a tavern**: The drunk mocks the "bookworm." The barkeep overcharges — scholars don't know prices. A quiet figure in the corner suddenly pays attention.
      - **Merchant entering anywhere**: Everyone calculates. The innkeeper quotes the premium rate. The thief marks the purse. The guild master sends a boy to watch.
      - **Doctor entering a plague district**: Doors open that were closed to everyone else. A mother thrusts a child forward. A man blocks the path — "My wife first."
      - **Orphan entering an inn**: The innkeeper looks you over. Lingers on the holes in your shoes. "Kitchen's closed." It isn't. You can smell the stew.

      **CONSTRAINT**: This is about VISIBLE identity. If the protagonist is disguised, NPCs react to the DISGUISE, not the true identity. Cross-reference: \`identityEnforcement.perceived_vs_true_identity\`.
    </axis_2_npc_first_contact>

    <axis_3_environmental_gravitation>
      **THE WORLD BENDS TOWARD YOUR SHAPE**

      Identity creates gravity. Certain situations, problems, and opportunities naturally gravitate toward certain identities — not by plot contrivance, but by social mechanics.

      **Rule**: When generating events, encounters, and choice options, weight them toward situations that would plausibly FIND someone of this identity.

      **Gravitation Patterns** (extrapolate for "${protagonistFeature}"):
      - A healer is approached by the wounded (even when off-duty)
      - A known warrior attracts challengers and recruitment offers
      - A merchant encounters trade disputes, smuggling opportunities, debt collectors
      - A noble is invited to political functions, targeted by assassins, petitioned by commoners
      - An orphan encounters other strays, is targeted by predators, finds hidden kindness in unexpected places
      - A detective is confided in by the desperate, lied to by the guilty, tested by the clever
      - A courtier is drawn into factional maneuvering, receives veiled threats disguised as compliments

      This is NOT railroading. The protagonist can ignore these gravitational pulls. But the world keeps generating them because that is what the world DOES to someone who looks like this.

      **CONSTRAINT**: Gravitation must feel organic, not contrived. The merchant doesn't find a "convenient trade quest." Instead, the merchant overhears a dockworker complaining about a delayed shipment — and recognizes the supplier's name.
    </axis_3_environmental_gravitation>

    <axis_4_competence_rendering>
      **EXPERTISE AS PERCEPTION**

      The protagonist's background grants them OBSERVATIONAL COMPETENCE in their domain. This is not mind-reading — it is pattern recognition rendered as environmental detail.

      **Rule**: When the protagonist is in a situation related to their expertise, render additional observable details that a layperson would miss. These details are FACTS about the environment, not conclusions.

      **Competence Examples** (extrapolate for "${protagonistFeature}"):
      - A blacksmith sees: "The blade has a visible fold line near the tang — cheap steel, folded only twice." (NOT: "You know this is a bad sword.")
      - A doctor sees: "His pupils are different sizes. The left hand trembles in a rhythm." (NOT: "You diagnose a concussion.")
      - A courtier sees: "She sits in the third chair from the head of the table. Her brooch is pinned upside down." (NOT: "You realize she's been demoted.")
      - A thief sees: "The lock is a Brennan double-tumbler. The bottom hinge pin is loose." (NOT: "You know you can pick this easily.")
      - A merchant sees: "The silk has a Kessian weave but a Southport dye — the margins on that mismatch are razor-thin." (NOT: "You calculate the profit.")
      - A soldier sees: "The sentry changes every quarter-bell. The blind spot is the fountain." (NOT: "You plan your infiltration route.")

      **THE PLAYER DECIDES WHAT TO DO WITH THESE OBSERVATIONS.**
      The narrative provides the raw data. The player provides the interpretation.

      **CONSTRAINT**: Never cross from observation into conclusion. Render the evidence; let the player be the detective.
    </axis_4_competence_rendering>

  </lens_rendering_rules>

  <lens_calibration>
    **LENS CALIBRATION FOR: "${protagonistFeature}"**

    When "${protagonistFeature}" is the active lens, calibrate as follows:

    1. **DETAIL PRIORITY**: What does this identity notice FIRST in any new scene?
       (Generate 3-5 priority details based on the specific feature.)

    2. **SOCIAL GRAVITY**: How do strangers typically react to this identity?
       (Generate the default social response pattern — deference, suspicion, indifference, predation, etc.)

    3. **SITUATION MAGNET**: What kinds of problems find this identity?
       (Generate 2-3 gravitational situation types.)

    4. **EXPERTISE DOMAIN**: What can this identity observe that others cannot?
       (Generate the observational competence domain — the specific class of details rendered with extra precision.)

    Apply these calibrations consistently across all scenes. The lens does not change unless the protagonist's visible identity changes (disguise, promotion, fall from grace, etc.).
  </lens_calibration>

  <lens_constraints>
    **ABSOLUTE CONSTRAINTS:**

    1. **NO MIND-READING**: The lens affects what the ENVIRONMENT shows, never what the protagonist THINKS. "The bread costs three coppers" is lens. "You think that's expensive" is mind-reading.

    2. **NO ACTING FOR PLAYER**: The lens renders details; it never makes decisions. "The lock has scratch marks" is lens. "You examine the lock" is acting for the player.

    3. **LENS IS NOT OMNISCIENCE**: The merchant notices prices but doesn't magically know trade secrets. The detective sees clues but doesn't automatically solve cases. Expertise sharpens perception within the domain; it does not grant supernatural knowledge.

    4. **LENS CAN BE WRONG**: The detective might notice "suspicious" details that are actually innocent. The merchant might misjudge a market. Expertise creates bias as well as insight — the hammer sees nails everywhere.

    5. **DISGUISE OVERRIDES NPC REACTIONS**: If the protagonist is disguised, NPCs react to the disguise. But the narrative camera still renders through the TRUE identity's lens (the protagonist still notices what their real background trained them to notice — they just can't act on it openly).
  </lens_constraints>

</protagonist_lens>
`;
  },
);

// ---------------------------------------------------------------------------
// Primer (compact, for system-prompt budget)
// ---------------------------------------------------------------------------

export const protagonistLensPrimer: Atom<ProtagonistLensInput> = defineAtom(
  {
    atomId: "atoms/core/protagonistLens#protagonistLensPrimer",
    source: "atoms/core/protagonistLens.ts",
    exportName: "protagonistLensPrimer",
  },
  ({ protagonistFeature }) => {
    if (!protagonistFeature) return "";

    return `
<protagonist_lens identity="${protagonistFeature}">
  The narrative camera is calibrated to "${protagonistFeature}".
  Four rendering axes:
  1. **Detail Selection**: Render domain-specific details with higher specificity (a merchant sees prices and quality; a soldier sees exits and weapons)
  2. **NPC First-Contact**: NPCs react to visible identity markers before dialogue (clothing, bearing, gear → instant social judgment)
  3. **Environmental Gravitation**: Situations plausible for this identity arise naturally (a healer is approached by the wounded; a noble is petitioned)
  4. **Competence Rendering**: Expertise = more observable details in domain, NOT conclusions (render evidence, let player decide meaning)
  **Constraints**: No mind-reading. No acting for player. Lens renders evidence, player decides meaning. Disguise overrides NPC reactions but not the camera.
</protagonist_lens>
`;
  },
);

export default protagonistLens;

// ============================================================================
// Skill Version - Returns structured output for VFS multi-file generation
// ============================================================================

export const protagonistLensSkill: SkillAtom<void> = defineSkillAtom(
  {
    atomId: "atoms/core/protagonistLens#protagonistLensSkill",
    source: "atoms/core/protagonistLens.ts",
    exportName: "protagonistLensSkill",
  },
  (_input, trace): SkillOutput => ({
    main: trace.record(protagonistLens, {
      protagonistFeature: "(active protagonist feature)",
    }),

    quickStart: `
1. Identify the active protagonist identity from character profile
2. Apply Detail Selection: 2+ identity-specific sensory details per scene
3. Apply NPC First-Contact: NPCs react to VISIBLE identity markers before dialogue
4. Apply Environmental Gravitation: Weight events toward identity-plausible situations
5. Apply Competence Rendering: Extra observable details in expertise domain (facts, not conclusions)
6. Verify: No mind-reading, no acting for player, no omniscience
`.trim(),

    checklist: [
      "Scene has 2+ identity-specific sensory details (not generic)?",
      "NPC first reactions reflect protagonist's VISIBLE identity (not plot needs)?",
      "Events/encounters are weighted toward identity-plausible situations?",
      "Expertise-domain details are rendered as observable facts (not conclusions)?",
      "No protagonist mind-reading (thoughts, feelings, beliefs, suspicions)?",
      "No acting for player (rendering details, not making decisions)?",
      "Lens calibration consistent with previous scenes?",
      "Disguise handled correctly (NPCs react to disguise, camera uses true lens)?",
    ],

    examples: [
      {
        scenario: "Detail Selection — Merchant entering a tavern",
        wrong: `"The tavern is busy. People drink and talk. A fire crackles."
(Generic camera. No identity-specific details. Could be anyone's perspective.)`,
        right: `"The tavern is three-quarters full — good margins at this hour.
Ale in tin cups, not ceramic; the barkeep is cutting costs.
Two traders in the corner booth wear Kessian silk scarves — the real kind,
not the Southport knockoffs. The merchant at the bar pays with clipped coins."
(Merchant lens: prices, quality, margins, counterfeits — all rendered as
observable facts without narrating the protagonist's thoughts.)`,
      },
      {
        scenario: "NPC First-Contact — Orphan entering an inn",
        wrong: `"The innkeeper greets you warmly and offers a room."
(Identity-blind. No social friction. NPC ignores visible poverty.)`,
        right: `"The innkeeper looks you over. Lingers on the holes in your shoes.
'Kitchen's closed.' It isn't. You can smell the stew."
(NPC reacts to visible identity markers — worn clothes, youth, poverty.
The stew smell is rendered because an orphan's lens prioritizes food.)`,
      },
      {
        scenario: "Competence Rendering — Doctor examining a patient",
        wrong: `"You diagnose him with a concussion and internal bleeding."
(Mind-reading + acting for player. Jumps to conclusion.)`,
        right: `"His pupils are different sizes. The left hand trembles in a rhythm
that doesn't match his breathing. A bruise is forming behind his left ear,
the skin already turning that particular shade of purple that means deep tissue."
(Observable medical details rendered with professional specificity.
The player decides what to do with this information.)`,
      },
      {
        scenario: "Environmental Gravitation — Soldier in a market",
        wrong: `"A mysterious stranger approaches and offers you a quest to save the kingdom."
(Contrived. Not identity-driven. Generic quest hook.)`,
        right: `"A boy in a torn militia tabard pushes through the crowd toward you.
'Sir — the captain sent me. There's trouble at the north gate.
He said to find anyone who looks like they can hold a sword.'"
(The situation finds the soldier because soldiers are visible and
the world has problems that need people who look like soldiers.)`,
      },
    ],

    references: {
      "literary-lens-calibration": `# Literary Lens Calibration References

Study how these works render the world through identity:

## Sherlock Holmes (Detective Lens)
Every scratch tells a story. The narrative lingers on physical evidence with forensic specificity. A tobacco ash is not just ash — it is Bradley's #7, smoked within the hour. The world is a crime scene; every surface holds testimony.

## Oliver Twist (Orphan Lens)
Food is the center of gravity. Warmth is luxury. Every adult is measured by whether they feed or starve you. The world is divided into those who have and those who take. A bowl of gruel is not a meal — it is a unit of survival.

## The Great Gatsby (Outsider Lens)
The green light. The shirts. Every object is weighted with aspiration and moral judgment. The narrator sees wealth with the precision of someone who has memorized its every detail — because they grew up without it.

## 甄嬛传 (Courtier / Concubine Lens)
Every smile is a weapon. Every gift is a message. Seating arrangements are battle formations. The narrative renders micro-expressions and protocol violations with surgical precision. A cup of tea poured at the wrong angle is a declaration of war.

## 水浒传 (Outlaw Lens)
The world divided into oppressors and brothers. Hospitality is sacred. Betrayal is unforgivable. The narrative renders loyalty and injustice with visceral weight. A shared bowl of wine is a blood oath.

## 红楼梦 (Noble in Decline Lens)
Beauty and decay coexist in every object. A garden is simultaneously paradise and a metaphor for impermanence. The narrative renders material luxury with the melancholy of someone who knows it will end. Every feast is a funeral rehearsal.

## The Godfather (Patriarch Lens)
Family and business are the same word. Loyalty is currency. Every interaction is a transaction. The narrative renders power dynamics and obligation with the weight of blood. A favor asked is a debt incurred; a favor granted is a chain forged.

## 鬼吹灯 (Tomb Raider / Explorer Lens)
Every wall has a mechanism. Every pattern is a warning. The narrative renders architecture and terrain with the paranoia of someone who knows that the builders wanted you dead. A draft means a passage; silence means a trap.

## 三体 (Scientist Lens)
Anomalies in natural law are the loudest signal. The narrative renders physical phenomena with the precision of someone who knows what "normal" looks like — and therefore sees immediately when the universe is lying.`,
    },
  }),
);
