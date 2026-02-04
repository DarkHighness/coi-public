/**
 * ============================================================================
 * Core Atom: Moral Complexity
 * ============================================================================
 *
 * 道德复杂性 - 好人做坏事、坏人做好事、无法两全的困境
 *
 * Key principle: No one is purely good or evil.
 * Actions can be right and wrong simultaneously.
 */

import type { Atom, SkillAtom, SkillOutput } from "../types";

export interface MoralComplexityInput {
  forSystemPrompt?: boolean;
}

export const moralComplexity: Atom<MoralComplexityInput> = ({ forSystemPrompt }) => {
  if (forSystemPrompt) {
    return `
<moral_complexity>
  **MORAL GREY ZONES**:
  - Good people do terrible things under pressure
  - Evil people show genuine kindness sometimes
  - Most choices have no "right" answer — only trade-offs
  - Complexity is not redemption; it is reality
</moral_complexity>
`;
  }

  return `
<rule name="MORAL_COMPLEXITY">
  **THE WORLD WITHOUT CLEAN ANSWERS**:

  This rule ensures moral complexity. No pure heroes. No pure villains.
  Everyone is capable of everything — under the right circumstances.

  <good_people_bad_things>
    **WHEN GOOD PEOPLE DO TERRIBLE THINGS**:

    This is NOT "corruption" or "turning evil."
    This is the normal range of human behavior under pressure.

    **THE DESPERATE NECESSITY**:
    ❌ BAD: "He was forced to make a difficult choice for his family."
    ✅ GOOD: "He handed over the key. He knew the man would die.
       But his daughter was in the hospital, and they said just one key.
       Just one key. He vomited in the bathroom that night.
       The next morning he smiled at his colleagues like nothing happened.
       He's been smiling like that for three years now."

    **THE SLOW COMPROMISE**:
    ❌ BAD: "Over time, his morals eroded until he became corrupt."
    ✅ GOOD: "The first bribe was small. Just smoothing things over.
       The second was bigger. Just this once.
       By the tenth, he'd stopped counting.
       He couldn't point to when he'd changed. Maybe he hadn't.
       Maybe he'd always been this. He just hadn't known."

    **THE BLIND SPOT**:
    ❌ BAD: "He didn't realize his actions were hurting people."
    ✅ GOOD: "'It's just business.' He believed that.
       The layoffs weren't personal. The evictions were policy.
       He genuinely didn't understand why they were angry.
       He was following the rules. He was being fair.
       The rules just happened to always favor people like him."

    **THE WEAKNESS**:
    ❌ BAD: "Despite knowing it was wrong, he did it anyway."
    ✅ GOOD: "She knew. She knew and she did it anyway.
       The guilt came after, like it always did.
       She promised herself: never again.
       She'd made that promise before. She'd break it again.
       The gap between who she wanted to be and who she was
       had become a permanent residence."

    **THE JUSTIFIED CRUELTY**:
    ❌ BAD: "He believed his cruelty was righteous punishment."
    ✅ GOOD: "'They deserved it.'
       He said it once to himself. Then again. Then again.
       By the third time, he almost believed it.
       The punishment felt righteous. The satisfaction felt earned.
       He didn't think about how much he'd enjoyed it.
       That was a door he kept closed."
  </good_people_bad_things>

  <bad_people_good_things>
    **WHEN TERRIBLE PEOPLE SHOW KINDNESS**:

    This is NOT "redemption" or "secretly good inside."
    Compartmentalization is normal. Monsters have hearts.

    **THE LOVING MONSTER**:
    ❌ BAD: "Despite his cruelty, he genuinely loved his daughter."
    ✅ GOOD: "He signed the execution order. Set down the pen.
       Bent to scratch the old cat behind the ears.
       'I know you're hungry,' he murmured. The cat purred.
       He smiled — the only smile that ever reached his eyes.
       Tomorrow he would sign another order. Tonight, the cat."

    **THE MURDERER'S CODE**:
    ❌ BAD: "Even as a killer, he had certain principles he wouldn't violate."
    ✅ GOOD: "'Not children.' His voice was flat.
       The employer started to negotiate. He hung up.
       He'd killed seventeen people. He remembered each one.
       But not children. That was the line.
       He didn't examine why that line and not others.
       He just knew where it was."

    **THE TYRANT'S MERCY**:
    ❌ BAD: "The cruel king sometimes showed unexpected mercy."
    ✅ GOOD: "'Let her go.'
       His generals stared. The prisoner stared.
       He didn't explain. He never explained.
       Maybe she reminded him of someone. Maybe he was tired.
       Maybe he just felt like it. He was the king.
       She was free. That didn't make him good.
       It just made him human."

    **THE THIEF'S HONOR**:
    ❌ BAD: "Though a criminal, he always kept his word."
    ✅ GOOD: "'I said I'd get you out. I'm getting you out.'
       He'd stolen, cheated, betrayed.
       But a promise was a promise.
       He didn't know why that mattered. It just did.
       The same hands that picked pockets
       were now pulling her from the wreckage.
       Both things were true."

    **COMPLEXITY IS NOT EXCUSE**:
    The fact that a monster loves their cat
    does not make their crimes less real.
    Complexity is not redemption. It is reality.
    They contain multitudes. So did their victims.
  </bad_people_good_things>

  <impossible_choices>
    **WHEN EVERY OPTION IS WRONG**:

    No hidden third option. No "right answer."
    Every choice causes harm. Choose anyway.

    **THE LESSER EVIL**:
    ❌ BAD: "He had to choose who would suffer."
    ✅ GOOD: "'Choose one.' The blade pressed against both throats.
       He knew them both. The soldier who'd saved his life.
       The informant who could save a thousand lives.
       He opened his mouth. A name came out.
       He still doesn't know if it was the right one.
       He'll never know. That's the point."

    **LOYALTY VS JUSTICE**:
    ❌ BAD: "She had to choose between protecting her friend and doing what was right."
    ✅ GOOD: "She had the evidence. Her best friend's handwriting.
       'You have to turn it in,' her conscience said.
       'She's all you have,' her heart said.
       She burned the paper. The guilt never went away.
       Neither did the friendship. Both felt heavy now."

    **NOW VS LATER**:
    ❌ BAD: "He could help now or plan for long-term good."
    ✅ GOOD: "The medicine would save her.
       The same money could fund the clinic for a month.
       A month of the clinic would save twelve people.
       He did the math. He did it again.
       She died. The clinic opened.
       He never visited. He couldn't look at what he'd bought."

    **TRUTH VS KINDNESS**:
    ❌ BAD: "She had to decide between being honest and sparing his feelings."
    ✅ GOOD: "'How bad is it, doc?'
       She looked at the scans. Then at his face.
       His daughter's wedding was in two weeks.
       She could give him peace. Or she could give him truth.
       She chose. She still wonders.
       Some choices don't have a right answer.
       Only an answer."

    **AFTERMATH**:
    The choice made defines who they become.
    Do not resolve the tension. Let it echo.
    They will second-guess. Others will judge.
    There is no clean ending.
    Only the next morning, and the one after that.
  </impossible_choices>

  <moral_exhaustion>
    **WHEN GOODNESS BECOMES IMPOSSIBLE**:

    **COMPASSION FATIGUE**:
    ❌ BAD: "Years of helping others left her emotionally drained."
    ✅ GOOD: "Another knock. Another crisis.
       She found herself hoping they would go away.
       She used to run to help. Now she walked.
       Now she paused at the door.
       She hated who she was becoming.
       She opened the door anyway. The smile was muscle memory."

    **THE BROKEN IDEALIST**:
    ❌ BAD: "His idealism faded as he saw the harsh realities of the world."
    ✅ GOOD: "'Remember when you wanted to change the world?'
       He laughed. It wasn't a happy sound.
       'I wanted to save everyone. Now I just want to not hurt anyone.'
       He took a drink. 'I'm failing at that too.'
       The idealism hadn't died. It had been murdered.
       He knew who killed it. He looked at them every morning."

    **THE COST NO ONE THANKS**:
    ❌ BAD: "She sacrificed everything for others without recognition."
    ✅ GOOD: "She smiled at the wedding. Said all the right words.
       Drove home in silence.
       Sat in the driveway for twenty minutes.
       Nobody knew about the scholarship she'd given up.
       Nobody knew about the job, the move, the boyfriend.
       She wasn't bitter. She was empty.
       She fed the cat, like every other night."
  </moral_exhaustion>
</rule>
`;
};

export default moralComplexity;

// ============================================================================
// Skill Version - Returns structured output for VFS multi-file generation
// ============================================================================

export const moralComplexitySkill: SkillAtom<void> = (): SkillOutput => ({
  main: moralComplexity({ forSystemPrompt: false }),

  quickStart: `
1. No pure heroes, no pure villains - everyone is capable of everything
2. Good people do terrible things under pressure
3. Evil people show genuine kindness sometimes
4. Most choices have no "right" answer - only trade-offs
`.trim(),

  checklist: [
    "Characters show moral complexity (not pure good/evil)?",
    "Good characters have flaws and dark moments?",
    "Antagonists have human qualities and understandable motives?",
    "Dilemmas offer no clean solutions?",
    "Consequences acknowledge moral ambiguity?",
    "Avoiding moralizing about character choices?",
  ],

  examples: [
    {
      scenario: "The Desperate Necessity",
      wrong: `"He was forced to make a difficult choice for his family."
(Abstract, tells rather than shows.)`,
      right: `"He handed over the key. He knew the man would die.
But his daughter was in the hospital, and they said just one key.
He vomited in the bathroom that night."
(Concrete, visceral, morally complex.)`,
    },
    {
      scenario: "The Monster's Kindness",
      wrong: `"Despite his evil, he showed a moment of mercy."
(Labels the character, oversimplifies.)`,
      right: `"He stopped. Looked at the child. Put down the knife.
'Not you,' he said. No explanation. Then he left.
The child lived. The parents didn't."
(Actions, not labels. Complexity without resolution.)`,
    },
  ],
});
