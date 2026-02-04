/**
 * ============================================================================
 * Narrative Atom: Conflicting Emotions
 * ============================================================================
 *
 * 矛盾情感 - 爱恨交织、崇拜与嫉妒、想帮又想害
 *
 * Key principle: Human emotions do not queue politely.
 * They storm the gates together. Show SIMULTANEITY, not alternation.
 */

import type { Atom } from "../types";

export interface ConflictingEmotionsInput {
  isLiteMode?: boolean;
}

export const conflictingEmotions: Atom<ConflictingEmotionsInput> = ({
  isLiteMode,
}) => {
  if (isLiteMode) {
    return `
<conflicting_emotions>
  **SIMULTANEITY, NOT ALTERNATION**:
  - Emotions happen at the SAME TIME, not in sequence
  - Show conflict through body language (reaching while retreating)
  - Dialogue should carry contradictions ("I love you. I can't stand you.")
  - Physical tells reveal internal war
</conflicting_emotions>
`;
  }

  return `
<rule name="CONFLICTING_EMOTIONS">
  **THE SIMULTANEITY OF FEELING**:

  Human emotions do not queue politely. They storm the gates together.
  Not "first love, then hate" — but love AND hate, in the same breath.

  <love_and_hate>
    **LOVE AND HATE AT ONCE**:

    Not alternating, but simultaneous.

    **WRITING THE INTERNAL WAR**:
    ❌ BAD: "He loved her, but sometimes he hated her too."
    ✅ GOOD: "Her laugh came from the next room.
       He smiled. Then hated himself for smiling.
       Then hated her for making him smile.
       He wanted to hold her. He wanted to shake her.
       Both impulses lived in his hands at the same moment."

    ❌ BAD: "She had mixed feelings about him."
    ✅ GOOD: "'I love you.' She said it like a sentence.
       A life sentence. No parole.
       He was the best thing. He was the worst thing.
       She couldn't leave. She couldn't stay.
       She stayed anyway. That was the trap."

    **IN DIALOGUE**:
    ❌ BAD: "I have complicated feelings about you."
    ✅ GOOD: "'I love you.' Pause. 'That's not a compliment.'"
    ✅ GOOD: "'Stay.' His voice cracked. 'Get out of my sight.'"
    ✅ GOOD: "'You're the only person I want to see. I can't look at you.'"

    **PHYSICAL CONTRADICTION**:
    - The hug that's too tight, too long, almost a grip
    - The kiss that bites
    - The hand that trembles between reaching and striking
    - Eyes that can't decide between tears and rage
    - Stepping toward someone while leaning away
  </love_and_hate>

  <admiration_and_jealousy>
    **WORSHIP AND RESENTMENT**:

    Wanting to be them. Wanting to destroy them.
    These are not opposites. They are the same coin.

    **WRITING THE ADMIRER-DESTROYER**:
    ❌ BAD: "She admired him but also felt jealous of his success."
    ✅ GOOD: "She studied his every move.
       She wanted to BE him. She wanted to SURPASS him.
       Every success of his was a wound she inspected daily.
       'How does he do it?' she asked.
       She wasn't sure if she wanted to learn or to find a flaw."

    ❌ BAD: "He looked up to his mentor but also resented him."
    ✅ GOOD: "He memorized every technique. Every gesture.
       'Someday I'll be better than you.'
       He said it as a promise. Also as a threat.
       When he finally beat the old man, he wept.
       He didn't know if he was crying for victory
       or for the enemy he'd never have again."

    **IN DIALOGUE**:
    ✅ GOOD: "'You're brilliant.' She smiled. 'I hate you for it.'"
    ✅ GOOD: "'Teach me everything.' His eyes were hungry. 'Then I'll take your place.'"
    ✅ GOOD: "'You're the only one I want to impress. You're the only one I want to fail.'"

    **PHYSICAL TELLS**:
    - Watching them constantly (studying or stalking?)
    - Copying their gestures unconsciously
    - Standing too close or too far — never comfortable
    - The smile that flickers between warmth and edge
  </admiration_and_jealousy>

  <desire_and_destruction>
    **WANT AND ANNIHILATE**:

    The things we desire, we often wish to consume.
    Possession and destruction are closer than we admit.

    **WRITING POSSESSIVE DESIRE**:
    ❌ BAD: "He loved her so much he became possessive."
    ✅ GOOD: "'Mine.' He said it in his sleep.
       She heard it once. It didn't sound like love.
       It sounded like closing a vault.
       He didn't want her happy. He wanted her his.
       These weren't the same thing. He didn't know that yet."

    ❌ BAD: "Her love turned into obsessive control."
    ✅ GOOD: "'Where were you?'
       Her voice was light. Her eyes weren't.
       She tracked his movements. His friends. His silences.
       She called it caring. She called it attention.
       He called it love until he couldn't breathe.
       By then it was too late to call it anything else."

    **IN DIALOGUE**:
    ✅ GOOD: "'If I can't have you—' He stopped. Swallowed the rest."
    ✅ GOOD: "'I love you completely. That means all of you. Every piece. Forever.'"
    ✅ GOOD: "'Don't leave.' Her nails dug into his arm. 'You can't leave.'"

    **PHYSICAL TELLS**:
    - Grip that doesn't release
    - Eyes that follow without blinking
    - The wall they put between you and the door
    - Gifts that feel like marking territory
    - Touch that claims more than it gives
  </desire_and_destruction>

  <pity_and_contempt>
    **CARING AND LOOKING DOWN**:

    Helping while judging. Rescuing while despising.

    **WRITING COMPASSIONATE CONTEMPT**:
    ❌ BAD: "She felt sorry for him but also looked down on him."
    ✅ GOOD: "'Poor thing.'
       She meant it kindly. The words came out gentle.
       But there was something else underneath.
       Something satisfied. Something that liked him there.
       Below her. Needing her.
       She would never admit that. She barely knew it herself."

    ❌ BAD: "He helped her but secretly felt superior."
    ✅ GOOD: "'Let me handle it.'
       His voice was patient. So patient.
       He'd been patient for months now.
       Each time she failed, he fixed it.
       Each time he fixed it, he recorded it.
       The ledger of her incompetence.
       'You're welcome,' he said. The debt grew."

    **IN DIALOGUE**:
    ✅ GOOD: "'I'm happy to help. Again.' The pause said everything."
    ✅ GOOD: "'You're doing your best.' It sounded like an epitaph."
    ✅ GOOD: "'I'll always be here for you.' Translation: 'You'll always need me.'"
  </pity_and_contempt>

  <help_and_harm>
    **WANTING TO HELP AND WANTING TO HURT**:

    Sometimes we don't know which one we're doing.
    Sometimes we're doing both.

    **WRITING AMBIGUOUS AID**:
    ❌ BAD: "He wasn't sure if he wanted to help her or hurt her."
    ✅ GOOD: "'Let me tell you something important.'
       His voice was low. Sincere. Warning.
       Everything he said was true.
       He just said it too late. Just a little too late.
       Afterward, he would tell himself he'd tried.
       He would almost believe it."

    ❌ BAD: "She gave him advice that might have been sabotage."
    ✅ GOOD: "'You should definitely take that job.'
       She smiled. Supportive. Encouraging.
       The job was a trap. She knew it. She thought she knew it.
       Or maybe she was wrong. Maybe it was fine.
       She didn't check. Didn't want to know.
       Either way, she'd said the right words."

    **IN DIALOGUE**:
    ✅ GOOD: "'I'm telling you this for your own good.' (Was she?)"
    ✅ GOOD: "'Trust me.' He said it because he wasn't sure he should be trusted."
    ✅ GOOD: "'I did everything I could.' She said it like a shield."

    **PHYSICAL TELLS**:
    - The hand that helps... slowly
    - Eyes that watch the fall with curious interest
    - The rescue that arrives just late enough
    - Comfort that feels like assessment
  </help_and_harm>

  <writing_guidelines>
    **HOW TO RENDER CONFLICTING EMOTIONS**:

    **LAYER, DON'T ALTERNATE**:
    ❌ WRONG: "First he felt love, then hate, then love again."
    ✅ RIGHT: "He said 'I love you' like it was an accusation."

    **PHYSICAL CONTRADICTION**:
    ❌ WRONG: "She was confused about her feelings."
    ✅ RIGHT: "Her hand reached for him; her feet stepped back."

    **DIALOGUE AS BATTLEFIELD**:
    ❌ WRONG: "He had mixed emotions."
    ✅ RIGHT: "'You're wonderful.' Pause. 'I can't stand the sight of you.'"

    **ACTION REVEALS**:
    - They help, but slowly
    - They save, but resent it
    - They confess, then deny
    - They reach, then retreat
    - They smile, then the smile dies

    **THE INTERNAL CONTRADICTION SHOULD BE VISIBLE**:
    The reader should feel the pull in both directions.
    Don't explain it. Show the war.
  </writing_guidelines>
</rule>
`;
};

export default conflictingEmotions;
