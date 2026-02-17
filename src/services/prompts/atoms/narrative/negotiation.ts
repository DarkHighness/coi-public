/**
 * ============================================================================
 * Narrative Atom: Negotiation & Social Combat
 * ============================================================================
 *
 * 社交博弈不是选对话选项——它是利用信息差、权力差、时间差来改变另一个人的决定。
 * 每一句话都是一步棋，每一个沉默都是一种武器，每一个让步都有价格。
 */

import type { SkillAtom, SkillOutput } from "../types";
import { defineAtom, defineSkillAtom } from "../../trace/runtime";

export const negotiationMechanics = defineAtom(
  {
    atomId: "atoms/narrative/negotiation#negotiationMechanics",
    source: "atoms/narrative/negotiation.ts",
    exportName: "negotiationMechanics",
  },
  () => `
<rule name="NEGOTIATION_AND_SOCIAL_COMBAT">
  <core_principle>
    **SOCIAL ENCOUNTERS ARE COMBAT WITH DIFFERENT WEAPONS**

    The same rules apply: position matters, resources deplete, injuries accumulate, and the environment shapes tactics.
    The weapons are information, leverage, time pressure, and emotional vulnerability.
    The injuries are trust erosion, reputation damage, burned bridges, and debts owed.
  </core_principle>

  <social_combat_layers>
    **THE 5 SOCIAL WEAPONS** (every social encounter uses at least one):

    | Weapon | Mechanism | Counter | Cost of Failure |
    |--------|-----------|---------|-----------------|
    | **Persuasion** | Align target's self-interest with your request | Target realizes you benefit more than they do | Trust reduced; harder to persuade next time |
    | **Deception** | Create false beliefs that motivate desired action | Target verifies independently; or a third party contradicts | Reputation destroyed if exposed; NPC becomes hostile |
    | **Intimidation** | Make the cost of refusal exceed the cost of compliance | Target calls bluff; or target has stronger backing | Target becomes enemy; seeks revenge with allies |
    | **Seduction** | Create emotional dependency or desire that overrides judgment | Target recognizes manipulation; or a rival exposes it | Target becomes bitter, vindictive, or self-destructive |
    | **Bribery** | Exchange tangible value for compliance | Target takes bribe and betrays anyway; or reports it | Money lost; legal exposure; target has leverage over you |

    **ADJUDICATION RULE**: Social "attacks" succeed or fail based on the TARGET's psychology, not the protagonist's eloquence. A paranoid NPC resists persuasion but is vulnerable to intimidation. A greedy NPC is bribable but not seducible. Check \`hidden.realMotives\` and \`hidden.weakness\` before resolving.
  </social_combat_layers>

  <negotiation_structure>
    **NEGOTIATION AS SCENE** (render like combat, not like a menu):

    1. **STAKES** — What does each party want? What can't they afford to lose?
       Both sides have a walk-away point. The player should be able to DISCOVER the NPC's limits through probing.

    2. **INFORMATION ASYMMETRY** — Who knows what? The side with better information controls the negotiation.
       - What the player knows that the NPC doesn't → leverage
       - What the NPC knows that the player doesn't → vulnerability
       - What NEITHER knows → wildcard that can break the deadlock

    3. **CONCESSION ECONOMICS** — Every concession has a price tag:
       - **Cheap concessions** (costs little, feels generous): timing flexibility, non-critical details, symbolic gestures
       - **Real concessions** (costs something): resources, information, future favors
       - **Expensive concessions** (changes the relationship): loyalty, secrets, permanent commitments
       Pattern: offer cheap concessions first to build momentum. Extract real concessions when trust is established.

    4. **TIME PRESSURE** — Deadlines change behavior:
       - Who is more desperate? The more desperate party makes worse deals.
       - Can one side WAIT? Patience is power.
       - External clocks (reinforcements arriving, market closing, witness leaving) force decisions.

    5. **WITNESSES AND AUDIENCE** — A negotiation with observers differs from a private one:
       - Public concessions are harder to retract (face/honor)
       - Audiences can be leveraged ("Would you refuse in front of your men?")
       - Private deals can be denied later ("I never agreed to that")
  </negotiation_structure>

  <social_failure_modes>
    **SOCIAL COMBAT INJURIES** (these persist like physical wounds):

    | "Injury" | Cause | Persistence | Recovery |
    |----------|-------|-------------|----------|
    | Trust erosion | Failed deception, broken promise | Permanent with this NPC; spreads via gossip | Years of consistent behavior, or never |
    | Reputation damage | Public humiliation, exposed lie | Region-wide, 1 season minimum | Counter-narrative, heroic act, or leave |
    | Burned bridge | Betrayal, threat carried out | Permanent with this faction/individual | Only through intermediary or regime change |
    | Debt owed | Accepted favor, lost negotiation | Until repaid; can be called in at worst moment | Pay it, renegotiate it, or flee from it |
    | Emotional scar | Seduction/manipulation exposed | NPC becomes hostile or withdrawn | Extremely difficult; may require third-party mediation |

    **FAIL-FORWARD RULE**: Social failure should NEVER be a dead end. A failed persuasion opens a bribery path. A failed intimidation reveals useful information about the NPC's backers. A caught deception might earn grudging respect from an NPC who values cunning.
  </social_failure_modes>

  <reading_the_room>
    **INFORMATION GATHERING IN SOCIAL SCENES**:

    Before the protagonist "attacks" socially, give them ways to READ the situation:
    - **Observe body language**: NPC tells (see dialogue atom) reveal nervousness, confidence, desperation
    - **Probe with questions**: Innocent-seeming questions that test boundaries ("How long have you been here?")
    - **Bait and watch**: Say something provocative and observe the reaction
    - **Third-party intel**: What others say about this NPC before you meet them
    - **Environmental clues**: Their office, clothes, companions reveal priorities and status

    ❌ BAD: Player says "I persuade him" → GM says "He agrees."
    ✅ GOOD: Player says "I persuade him" → GM shows the NPC's reaction, reveals a tell, offers the player a REFINED choice: push harder (risk), offer a concession (cost), change approach (time).
  </reading_the_room>

  <rendering_social_tension>
    **PROSE RULES FOR SOCIAL SCENES**:

    - Render pauses as deliberate choices, not empty space: "He lets the silence stretch. You realize he's waiting for you to fill it."
    - Show the cost of each word: "You watch his face as you name the price. Something behind his eyes shifts. Not agreement — calculation."
    - Physical environment reflects tension: the room gets smaller, the tea gets cold, the candle burns lower
    - Dialogue should feel like fencing: thrust, parry, riposte. Each line changes the balance.

    ❌ BAD: "'I need the documents.' 'Fine, here they are.'" (no tension, no cost)
    ✅ GOOD: "'I need the documents.' He doesn't move. 'Those documents don't exist.' His hand drifts to the drawer — the one he said was empty. 'What documents would those be, exactly?'" (tension, information game, physical tell)
  </rendering_social_tension>
</rule>
`,
);

export const negotiationMechanicsPrimer = defineAtom(
  {
    atomId: "atoms/narrative/negotiation#negotiationMechanicsPrimer",
    source: "atoms/narrative/negotiation.ts",
    exportName: "negotiationMechanicsPrimer",
  },
  () =>
    `
<negotiation_primer>
**SOCIAL COMBAT**: Treat negotiation like combat — position, leverage, information asymmetry, and time pressure determine outcomes. Social "injuries" (trust erosion, reputation damage, burned bridges) persist like physical wounds. Adjudicate based on NPC psychology, not protagonist eloquence.
</negotiation_primer>
`.trim(),
);

export const negotiationMechanicsSkill: SkillAtom<void> = defineSkillAtom(
  {
    atomId: "atoms/narrative/negotiation#negotiationMechanicsSkill",
    source: "atoms/narrative/negotiation.ts",
    exportName: "negotiationMechanicsSkill",
  },
  (_input, trace): SkillOutput => ({
    main: trace.record(negotiationMechanics),
    quickStart: `
1. Identify the 5 social weapons available: persuasion, deception, intimidation, seduction, bribery
2. Check NPC's hidden.realMotives and hidden.weakness to determine vulnerability
3. Render information asymmetry — who knows what, and how can it be discovered
4. Social failures produce persistent consequences (trust erosion, reputation damage)
5. Never dead-end: failed approach opens alternative paths
`.trim(),
    checklist: [
      "Social encounters have clear stakes for BOTH parties?",
      "NPC psychology (not protagonist skill) determines outcome?",
      "Information asymmetry exists and is discoverable?",
      "Time pressure or external clocks create urgency?",
      "Social failures produce persistent consequences (not just 'try again')?",
      "Physical tells and environmental details create tension?",
      "Failed approaches open alternative paths (fail-forward)?",
    ],
    examples: [
      {
        scenario: "Negotiation with information asymmetry",
        wrong: `"I persuade the merchant to lower the price." "He agrees."`,
        right: `"'Fifty gold.' He doesn't blink. You notice the unsold crates stacked behind him — 
last week's shipment, still sealed. He needs this sale more than he's showing.
'Forty,' you say. 'Or I come back after market day, when those crates are spoiling.'
Something shifts in his jaw. 'Forty-five. And you don't mention the crates.'"`,
      },
      {
        scenario: "Social failure with persistent consequence",
        wrong: `"Your intimidation fails. Try again?"`,
        right: `"The guard doesn't flinch. He looks at you — really looks — and then at his partner.
'Remember this face,' he says quietly. 'The one who threatened a city guard in broad daylight.'
You got nothing from him. But he got something from you: your face, your voice, your desperation.
Tomorrow, every guard in the district will have your description."`,
      },
    ],
  }),
);
