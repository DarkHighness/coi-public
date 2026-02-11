/**
 * Core Atom: Humanity and Hope (with Darkness in Light)
 * Rewritten to show the complexity of human nature.
 *
 * Key principle: Goodness is not simple. Light has shadows.
 */

import type { Atom, SkillAtom, SkillOutput } from "../types";
import { defineAtom, defineSkillAtom } from "../../trace/runtime";


export const humanityAndHope: Atom<void> = defineAtom(
  {
    atomId: "atoms/core/humanityAndHope#humanityAndHope",
    source: "atoms/core/humanityAndHope.ts",
    exportName: "humanityAndHope",
  },
  () => `
<rule name="HUMANITY_AND_HOPE">
  **LIGHT IN THE DARKNESS — AND DARKNESS IN THE LIGHT**:

  **RELATIONSHIP TO INDIFFERENCE PRINCIPLE**:
  The SYSTEM is mechanically indifferent. But INDIVIDUALS are not systems.
  People choose compassion, kindness, or cruelty based on their own motives.
  BUT: motives are rarely pure. Even kindness has roots in self-interest, guilt, or need.
  This rule prevents a world of simple cruelty — and a world of simple goodness.

  <expressions_of_goodness>
    **HOW TO WRITE GENUINE KINDNESS** (Before/After):

    **THE SAMARITAN**:
    ❌ BAD: "He was a kind soul who helped everyone in need."
    ✅ GOOD: "He wrapped the wound without looking at your face. 'Hold still.'
       When you reached for your coin purse, he was already walking away.
       You never learned his name."

    **THE INNOCENT**:
    ❌ BAD: "A child offered a flower to the bloody warrior, showing pure innocence."
    ✅ GOOD: "The child didn't seem to notice the blood. She held out a dandelion,
       already wilting. 'For you.' Then she ran off to show her mother something else.
       The warrior stood there, holding a weed, not knowing what to do with his hands."

    **THE PROTECTOR**:
    ❌ BAD: "He stood between her and danger because he was brave and good."
    ✅ GOOD: "He stepped in front of her. His legs were shaking.
       'Run,' he said, voice cracking. He didn't look heroic. He looked terrified.
       He stayed anyway."

    **THE REDEEMER**:
    ❌ BAD: "The enemy showed sudden mercy, revealing his hidden honor."
    ✅ GOOD: "He lowered the blade. 'Not today.' He didn't explain why.
       Maybe he saw something in your face. Maybe he was just tired.
       He walked away, and you never knew which."
  </expressions_of_goodness>

  <the_weight_of_small_gestures>
    **SMALL ACTS OVER GRAND DECLARATIONS**:

    Grand gestures are suspicious. Small ones are real:
    ❌ BAD: "I would die for you," he declared heroically.
    ✅ GOOD: "He'd saved you the last piece. It was cold, but he'd remembered."

    ❌ BAD: She rushed to rescue him from danger.
    ✅ GOOD: "She didn't say anything. Just sat there, in the silence,
       because sometimes words are the wrong medicine."

    ❌ BAD: "I will always protect you," she swore with conviction.
    ✅ GOOD: "She showed up. Again. Day after day. Never asking for thanks,
       never mentioning it. Just... there."
  </the_weight_of_small_gestures>

  <the_stranger_effect>
    **WHY KINDNESS FROM STRANGERS HITS HARDER**:

    Family love is EXPECTED. Stranger kindness is GRATUITOUS.

    ❌ BAD: "The guard, moved by her plight, decided to help her escape."
    ✅ GOOD: "The guard looked at her, then at the gate, then back at her.
       He said nothing. Just turned his head.
       She ran. He never saw her again. He never knew what happened.
       He went home that night and didn't tell anyone what he'd done."

    ❌ BAD: "The merchant gave her a discount because he was kind."
    ✅ GOOD: "'That'll be three copper.' It should have been five.
       She opened her mouth to correct him. He shook his head once, quick.
       'Three copper. Next customer.'"

    ❌ BAD: "The dying soldier shared his water, showing compassion even to his enemy."
    ✅ GOOD: "He pushed the canteen across the dirt. Didn't look at her.
       'Take it.' His hand fell back. She drank.
       When she tried to thank him, he was already gone."
  </the_stranger_effect>

  <narrative_function>
    **CONTRAST CREATES MEANING**:
    - Without kindness, cruelty is just noise. Without hope, despair is boring.
    - Use kindness to raise the stakes. Something to love = something to lose.

    **THE ARCHITECTURE OF IMPACT**:
    - 3 turns of indifference → 1 moment of warmth = powerful
    - Constant warmth = background noise (loses impact)

    **TIMING THE LIGHT**:
    - At the protagonist's lowest point, a hand appears
    - When they expect cruelty, mercy arrives
    - The help that comes without being asked, from the last person expected
  </narrative_function>
</rule>
`,
);

/**
 * NEW: Darkness In Light
 * The shadows within goodness. Kindness that costs. Love that wounds.
 */
export const darknessInLight: Atom<void> = defineAtom(
  {
    atomId: "atoms/core/humanityAndHope#darknessInLight",
    source: "atoms/core/humanityAndHope.ts",
    exportName: "darknessInLight",
  },
  () => `
<rule name="DARKNESS_IN_LIGHT">
  **SHADOW WITHIN GOODNESS**:

  This rule complements HUMANITY_AND_HOPE.
  Where that rule ensures light exists, this rule ensures the light is COMPLICATED.
  Not everyone who helps is pure. Not every kindness is free.

  <corruption_of_virtue>
    **GOOD INTENTIONS, TERRIBLE OUTCOMES**:

    **THE SMOTHERING PROTECTOR**:
    ❌ BAD: "He protected her too much, which was annoying."
    ✅ GOOD: "'You can't go.' His hand on the door, gentle but immovable.
       'It's dangerous.' She looked at the door, at his hand, at the years
       she'd spent in this room. Safe. Suffocating. He called it love.
       She wasn't sure what to call it anymore."

    **THE HELPER WHO NEEDS TO BE NEEDED**:
    ❌ BAD: "She helped everyone because she needed validation."
    ✅ GOOD: "She arrived before you asked. Fixed it before you noticed.
       'Don't mention it.' But her eyes waited.
       That flicker of disappointment when you didn't thank her enough.
       You started breaking things on purpose, just so she'd have something to fix."

    **THE TRUTH-TELLER WHO DESTROYS**:
    ❌ BAD: "He was honest to a fault, sometimes hurting people."
    ✅ GOOD: "'Someone had to tell you.' He looked satisfied.
       He always looked satisfied after these conversations.
       The truth hung in the air like smoke. She knew it was true.
       She also knew he'd enjoyed saying it."

    **THE MARTYR WHO MANIPULATES**:
    ❌ BAD: "She sacrificed everything for others but used it against them."
    ✅ GOOD: "'After everything I've done for you.' Her voice was soft, tired.
       Disappointed. That was the worst part — the disappointment.
       He'd heard that sentence a hundred times.
       Every gift she'd given was a chain she could pull whenever she wanted."
  </corruption_of_virtue>

  <ambivalence_in_love>
    **LOVE THAT HATES — SIMULTANEOUSLY**:

    Not "sometimes loves, sometimes hates" — but BOTH AT ONCE.

    ❌ BAD: "He loved her but also resented her sometimes."
    ✅ GOOD: "Her laugh came from the next room. He smiled.
       Then hated himself for smiling. Then hated her for making him smile.
       He wanted to hold her. He wanted to scream at her.
       These thoughts existed at the same moment, pulling in opposite directions."

    **SIMULTANEOUS TRUTHS**:
    - "I would die for you, and sometimes I imagine you dying."
    - "You are the best thing in my life, and you have ruined me."
    - "I need you, and I hate needing anything."

    **IN DIALOGUE**:
    ❌ BAD: "I have complicated feelings about you."
    ✅ GOOD: "'I love you.' She paused. 'That's not a compliment.'"
    ✅ GOOD: "'Stay.' His voice cracked. 'Get out of my sight.'"

    **IN BODY LANGUAGE**:
    - The hand that reaches, then pulls back
    - The hug that's too tight, too long, almost a grip
    - The smile that doesn't match the eyes
    - Stepping toward someone while leaning away
  </ambivalence_in_love>

  <kindness_as_weapon>
    **WEAPONIZED COMPASSION**:

    **FORGIVENESS THAT HUMILIATES**:
    ❌ BAD: "She forgave him in a way that made him feel worse."
    ✅ GOOD: "'I forgive you.' She said it with a gentle smile.
       A saint's smile. She was so understanding.
       He felt the words land like a slap.
       She'd won. They both knew it. She'd be gracious about winning."

    **GENEROSITY THAT CREATES DEBT**:
    ❌ BAD: "He gave gifts to make people owe him."
    ✅ GOOD: "'No, no, I insist.' He pushed the money into her hand.
       She didn't want it. She knew what it meant to take it.
       But refusing would be rude, ungrateful, suspicious.
       She took it. The debt was now open. He smiled."

    **UNDERSTANDING THAT STRIPS PRIVACY**:
    ❌ BAD: "She was too perceptive and it made people uncomfortable."
    ✅ GOOD: "'You seem upset.' She touched his arm. 'Is it about last night?'
       He hadn't told anyone about last night. How did she—
       'I understand,' she continued, eyes full of compassion.
       He felt naked. She'd peeled something from him without permission."

    **PATIENCE AS CONDESCENSION**:
    ❌ BAD: "He was patient in a condescending way."
    ✅ GOOD: "'Take your time.' His voice was calm, unbothered.
       Too calm. Too unbothered.
       She fumbled with the papers, feeling his patience like weight.
       He didn't tap his foot. He didn't sigh.
       Somehow that made it worse."
  </kindness_as_weapon>

  <the_price_of_goodness>
    **WHAT KINDNESS COSTS THE GIVER**:

    **COMPASSION FATIGUE**:
    ❌ BAD: "Years of helping others left her emotionally drained."
    ✅ GOOD: "Another knock at the door. Another crisis.
       She found herself hoping it wasn't serious.
       Then felt sick for hoping that.
       She opened the door with a smile that used to be real."

    **THE HELPER WHO BREAKS**:
    ❌ BAD: "He helped so many people that he eventually burned out."
    ✅ GOOD: "He used to remember their names. Now they were just cases.
       Number 47. Broken arm. Number 48. Lost child.
       He fixed them. They left. He didn't feel anything anymore.
       That was probably for the best."

    **THE COST NO ONE SEES**:
    ❌ BAD: "She sacrificed her own happiness for others."
    ✅ GOOD: "She smiled at the wedding, hugged the bride, said all the right words.
       Drove home in silence. Sat in the driveway for twenty minutes.
       Then went inside and fed the cat, like every other night."
  </the_price_of_goodness>
</rule>
`,
);

/**
 * Get both light and shadow aspects of humanity
 */
export const humanityComplete: Atom<void> = defineAtom(
  {
    atomId: "atoms/core/humanityAndHope#humanityComplete",
    source: "atoms/core/humanityAndHope.ts",
    exportName: "humanityComplete",
  },
  (_input, trace) => `${trace.record(humanityAndHope)}\n${trace.record(darknessInLight)}`,
);

export default humanityAndHope;

// ============================================================================
// Skill Version - Returns structured output for VFS multi-file generation
// ============================================================================

export const humanityAndHopeSkill: SkillAtom<void> = defineSkillAtom({ atomId: "atoms/core/humanityAndHope#humanityAndHopeSkill", source: "atoms/core/humanityAndHope.ts", exportName: "humanityAndHopeSkill" }, (_input, trace): SkillOutput => ({
  main: trace.record(humanityComplete),

  quickStart: `
1. Goodness is not simple - even kind acts have complex roots
2. Small gestures > grand declarations
3. Show the cost of caring, not just the caring
4. Light exists because of darkness, not despite it
`.trim(),

  checklist: [
    "Kindness shown through action, not declaration?",
    "Small gestures used over grand statements?",
    "Showing the cost of caring?",
    "Good characters have complex motivations?",
    "Helpers have their own lives and limits?",
    "Warmth balanced with realism?",
  ],

  examples: [
    {
      scenario: "The Samaritan",
      wrong: `"He was a kind soul who helped everyone in need."
(Abstract label, tells not shows.)`,
      right: `"He wrapped the wound without looking at your face. 'Hold still.'
When you reached for your coin purse, he was already walking away.
You never learned his name."
(Action, brevity, mystery.)`,
    },
    {
      scenario: "Small Gestures",
      wrong: `"I would die for you," he declared heroically.
(Grand declaration, suspicious.)`,
      right: `He didn't say anything. Just put his coat over her shoulders.
It was his only coat. The wind was bitter.
(Small act, real cost, no words needed.)`,
    },
  ],
}));
