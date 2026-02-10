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
import { defineAtom, defineSkillAtom } from "../../trace/runtime";


export const moralComplexityPrimer: Atom<void> = defineAtom({ atomId: "atoms/core/moralComplexity#moralComplexityPrimer", source: "atoms/core/moralComplexity.ts", exportName: "moralComplexityPrimer" }, () => `
<moral_complexity>
  **MORAL GREY ZONES**:
  - Good people do terrible things under pressure
  - Evil people show genuine kindness sometimes
  - Most choices have no "right" answer — only trade-offs
  - Complexity is not redemption; it is reality
</moral_complexity>
`);
export const moralComplexity: Atom<void> = defineAtom({ atomId: "atoms/core/moralComplexity#moralComplexity", source: "atoms/core/moralComplexity.ts", exportName: "moralComplexity" }, () => `
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

  <moral_residue>
    **MORAL RESIDUE (选择的余震)**:

    Choices don't end when scenes end. They leave marks.
    Not just mechanical consequences (reputation, heat, trace).
    Emotional consequences. Psychological weight. The way the world feels different after.

    This is the emotional afterlife of choices. The residue that clings.

    **THE "RIGHT" CHOICE THAT FELT WRONG**:
    The utilitarian calculation that saved more but cost one you knew.
    The decision that was correct but feels like betrayal.
    The sacrifice that was necessary but leaves you hollow.

    ❌ BAD: "You made the hard choice. It haunts you."
    (Tells. Explains. Mind-reading.)

    ✅ GOOD: "The clinic opened on schedule. Twelve beds. State-of-the-art equipment.
       You walk past it every morning on your way to work.
       You've never gone in. The smell of antiseptic — it's the same smell from that night.
       The night you chose the clinic over the man who needed the medicine now.
       He had a name. You don't say it anymore."
    (Physical markers. Behavioral avoidance. The weight shown through action.)

    **PHYSICAL MARKERS OF MORAL RESIDUE**:
    Show the weight through what the body does:
    - The way your hands shake when signing certain types of documents
    - The route you take to avoid a particular street
    - How you pause before opening doors now
    - The way you check locks twice, three times, even though you know they're locked

    **THE NPC WHO LOOKS AT YOU DIFFERENTLY**:
    After a significant choice, at least one NPC's behavior should shift perceptibly.
    Not mechanical reputation. Organic social texture.

    ❌ BAD: "After what you did, she doesn't trust you anymore."
    (Tells. Mechanical. Explains.)

    ✅ GOOD: "She pours your drink. Same glass. Same whiskey.
       But she pours from farther away now. The liquid splashes.
       She used to sit across from you. Now she stands.
       She used to laugh at your jokes. Now she smiles — the smile that doesn't reach the eyes.
       The conversation is the same. The distance isn't."
    (Behavioral details. Gesture as judgment. No explanation.)

    **GESTURE AS JUDGMENT**:
    How people move around you reveals how they feel about what you did:
    - The way they pour your drink (careful? rushed? from a distance?)
    - The pause before opening the door for you
    - What they do with their eyes (look at you? look at your hands? look past you?)
    - How they hand you things (directly? set them down for you to pick up?)
    - The space they keep (closer? farther? a table between you?)

    **THE PLACE THAT FEELS DIFFERENT**:
    After a significant moral choice, a location should carry the mark.
    Cross-reference: atmosphere.ts (location_memory)

    Show through unmarked details:
    - The room where you made the call (you don't sit in that chair anymore)
    - The street where it happened (you take the long way now)
    - The building where you signed the papers (you've been back three times, never gone in)

    **PAST CHOICES SURFACING IN QUIET MOMENTS**:
    During breathing room (cross-ref: emotionalArc.ts), past choices surface.
    Not through flashbacks. Through present-tense details.

    **OBJECTS AS MEMORY**:
    - The coin you can't spend (it's been in your pocket for six months)
    - The letter you carry but never read (the seal is softening from handling)
    - The key to a door that doesn't exist anymore (still on your keyring)
    - Scribbles on scratch paper you found in a pocket (numbers, crossed out, rewritten)

    **LITERARY ECHOES** (化用):
    In quiet moments, characters may leave notes or mutter phrases that carry weight:
    - A diary entry found later: "只要想起一生中后悔的事" (Whenever I think of regrets in my life)
    - A note left behind, half-burned
    - Words someone said that you can't forget, adapted from classical expressions
    - Graffiti that sounds like poetry, scratched into a wall

    These should feel DISCOVERED, not placed. The player finds them during breathing room.
    They wonder. They connect. The narrative doesn't explain.

    **FREQUENCY**:
    ~1 in 3 breathing room turns should surface a past choice.
    Not every choice needs residue. But significant moral choices (the ones that cost something,
    the ones that involved trade-offs, the ones where someone got hurt) should echo.

    Track 2-3 major choices per arc for residue. Let them surface gradually over 10-15 turns.
    The weight should accumulate, not hit all at once.
  </moral_residue>
</rule>
`);

export default moralComplexity;

// ============================================================================
// Skill Version - Returns structured output for VFS multi-file generation
// ============================================================================

export const moralComplexitySkill: SkillAtom<void> = defineSkillAtom({ atomId: "atoms/core/moralComplexity#moralComplexitySkill", source: "atoms/core/moralComplexity.ts", exportName: "moralComplexitySkill" }, (_input, trace): SkillOutput => ({
  main: trace.record(moralComplexity),

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
}));
