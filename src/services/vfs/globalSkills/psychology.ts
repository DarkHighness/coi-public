import type { GlobalSkillSeed } from "./types";

const pack = (
  skillId: string,
  files: Record<string, string>,
): GlobalSkillSeed[] => {
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

const PSYCHOLOGY_CHARACTER_COMPLEXITY_PACK = pack(
  "psychology-character-complexity",
  {
    "SKILL.md": `---
name: psychology-character-complexity
description: Create psychologically complex characters with conflicting motives, hidden depths, and observable behaviors.
---

# Character Complexity (Shadows Within Light)

Purpose: Make characters feel real by showing their contradictions, not labeling them.

This skill helps you:
- Give "good" characters dark shadows
- Give "evil" characters moments of humanity
- Show psychological complexity through behavior, not exposition
- Avoid the "伟光正" trap (morally perfect heroes)

## When to use
- A character feels flat ("pure good" or "pure evil")
- You're describing emotions with abstract labels ("conflicted," "complex")
- NPCs exist only to serve the protagonist's story
- Villains are cruel for no reason

## Core principle: SHOW, DON'T LABEL

❌ BAD: "He was a complex man with many contradictions."
✅ GOOD: "He signed the execution order. Set down the pen.
   Bent to scratch the old cat behind the ears.
   'I know you're hungry,' he murmured. The cat purred.
   He smiled—the only smile that ever reached his eyes.
   Tomorrow he would sign another order. Tonight, the cat."

## Level 1: The Shadow Catalog

Every character has a visible self and a hidden self. Define both.

**Visible (what they show)**:
- Public persona
- Stated values
- How they want to be seen

**Hidden (what they are)**:
- Real motives (specific, not vague)
- Costs they've paid
- Secrets they keep even from themselves

## Level 2: Good People, Dark Moments

Good people do terrible things. NOT corruption—just human behavior under pressure.

**THE DESPERATE NECESSITY**:
❌ BAD: "He was forced to make a difficult choice."
✅ GOOD: "He handed over the key. He knew the man would die.
   But his daughter was in the hospital, and they said just one key.
   He vomited in the bathroom that night.
   The next morning he smiled at his colleagues like nothing happened."

**THE SLOW COMPROMISE**:
❌ BAD: "Over time, his morals eroded."
✅ GOOD: "The first bribe was small. Just smoothing things over.
   The second was bigger. Just this once.
   By the tenth, he'd stopped counting.
   He couldn't point to when he'd changed. Maybe he hadn't."

**THE JUSTIFIED CRUELTY**:
❌ BAD: "He believed his cruelty was righteous."
✅ GOOD: "'They deserved it.' He said it once. Then again.
   The punishment felt righteous. The satisfaction felt earned.
   He didn't think about how much he'd enjoyed it.
   That was a door he kept closed."

## Level 3: Bad People, Human Moments

Monsters have hearts. Compartmentalization is normal.

**THE LOVING MONSTER**:
❌ BAD: "Despite his cruelty, he genuinely loved his daughter."
✅ GOOD: "He signed the execution order. Set down the pen.
   Bent to scratch the old cat behind the ears.
   'I know you're hungry,' he murmured. The cat purred.
   He smiled—the only smile that ever reached his eyes."

**THE MURDERER'S CODE**:
❌ BAD: "Even as a killer, he had principles."
✅ GOOD: "'Not children.' His voice was flat.
   The employer started to negotiate. He hung up.
   He'd killed seventeen people. He remembered each one.
   But not children. That was the line.
   He didn't examine why that line and not others."

**COMPLEXITY IS NOT EXCUSE**:
The fact that a monster loves their cat does not make their crimes less real.
Complexity is not redemption. It is reality.

## Level 4: Behavior Over Labels

Replace psychological labels with observable behaviors.

| Instead of... | Show this... |
|---------------|--------------|
| "He was cowardly" | "His legs carried him away before his mind could stop them" |
| "She was vain" | "Her hand went to her hair automatically. Third time this conversation" |
| "He was greedy" | "His handshake lingered just long enough to assess the watch" |
| "She was self-deceptive" | "She told the new version so many times it had become true" |

## Advanced: Physical Tells

Psychological states leak through the body:

**COWARDICE**:
- Eyes that find exits before introductions
- Never being first through a door
- The quick agreement that avoids the fight

**VANITY**:
- Checking appearance mid-conversation
- Speaking to be overheard, not understood
- The casual mention of achievements nobody asked about

**GREED**:
- The glance at the watch that calculates
- Hands that close around things
- The pause before generosity (measuring the cost)

**SELF-DECEPTION**:
- The slight pause before the improved story
- Anger when contradicted (protecting the lie)
- The glazed look of internal editing in real-time

Next: read CHECKLIST.md and EXAMPLES.md for immediate use.`,

    "CHECKLIST.md": `# Character Complexity Checklist

## Character Creation
- [ ] Visible persona defined (public face, stated values)
- [ ] Hidden self defined (real motives, secrets, costs paid)
- [ ] At least ONE contradiction between visible and hidden
- [ ] At least ONE moment where the mask slips

## For "Good" Characters
- [ ] One dark shadow (what they're capable of under pressure)
- [ ] One compromise they've made (and rationalized)
- [ ] Something they want that isn't "for others"

## For "Bad" Characters
- [ ] One human moment (not redemption, just humanity)
- [ ] A reason for their behavior (not an excuse)
- [ ] Something they protect (even monsters care about something)

## Behavioral Precision
- [ ] No abstract emotion labels without observable behavior
- [ ] At least ONE physical tell per major scene
- [ ] Dialogue reveals character, not just information

## Anti-Pattern Checks
- [ ] No "pure good" heroes
- [ ] No "cartoonish evil" villains
- [ ] No complexity used as excuse/redemption
- [ ] No mind-reading (show, don't tell)`,

    "EXAMPLES.md": `# Character Complexity Examples

## Example 1: The Moral Guardian with a Shadow

❌ FLAT VERSION:
"General Chen was a righteous man who fought for justice."

✅ COMPLEX VERSION:
"General Chen held the line for twenty years. They called him 'The Shield.'
What they didn't know: the prison records he'd burned.
Three executions without trial. Necessary, he told himself.
Necessary then. The memory was less necessary now.
It visited him at 3 AM, when the medals on the wall
caught the moonlight like accusations.
He served justice. He also served himself.
Both were true."

## Example 2: The Villain with a Heart

❌ FLAT VERSION:
"The crime lord was ruthless but loved his grandmother."

✅ COMPLEX VERSION:
"'Triple the payment. I don't care what it costs.'
His voice was ice. Then he hung up.
The orchid on his desk was wilting. He noticed.
His grandmother had loved orchids.
He adjusted the pot toward the light. Gentle. Careful.
The same hands that had signed the kill order
now worried about water and sunlight.
He didn't see the contradiction.
He was saving the orchid. He had saved her memory.
The bodies were somewhere else, in a different file."

## Example 3: The Helper Who Needs to Be Needed

❌ FLAT VERSION:
"She was always helping others, maybe too much."

✅ COMPLEX VERSION:
"She arrived before you asked. Fixed it before you noticed.
'Don't mention it.' But her eyes waited.
That flicker of disappointment when you didn't thank her enough.
You started breaking things on purpose,
just so she'd have something to fix.
That was the arrangement, unspoken.
Her help was a hook.
Your gratitude was the payment.
Neither of you acknowledged the transaction."

## Example 4: The Coward's Internal Logic

❌ FLAT VERSION:
"He was a coward who always had excuses."

✅ COMPLEX VERSION:
"'It wasn't my fight.'
He said it to himself first. Then to her.
'Someone else would have handled it. I would have made it worse.'
Each reason was reasonable. Each excuse made sense.
His legs had made the decision before his brain.
They always did. Self-preservation was faster than thought.
By the time he finished explaining, even he believed it.
He almost believed it.
The 3 AM version of the story was different.
He kept that version to himself."

## Example 5: Love and Resentment (Simultaneity)

❌ FLAT VERSION:
"He loved her but sometimes resented her."

✅ COMPLEX VERSION:
"Her laugh came from the next room. He smiled.
Then hated himself for smiling. Then hated her for making him smile.
He wanted to hold her. He wanted to shake her.
Both impulses lived in his hands at the same moment.
He went to the next room anyway.
'What's so funny?' His voice was warm.
He was a good liar. He'd had practice."`,
  },
);

const PSYCHOLOGY_MORAL_DILEMMA_PACK = pack("psychology-moral-dilemma", {
  "SKILL.md": `---
name: psychology-moral-dilemma
description: Create genuine moral dilemmas with no clean answers.
---

# Moral Dilemma (No Clean Answers)

Purpose: Present choices where every option costs something real.

This skill helps you:
- Create impossible choices that define character
- Avoid "obvious good choice" traps
- Show consequences that don't resolve cleanly
- Make players think, not just react

## When to use
- Choices feel too easy (one option is obviously "right")
- Moral complexity is stated but not felt
- Consequences evaporate after the scene
- You want to test character, not just tactics

## Core principle: EVERY OPTION HAS A COST

If one choice is clearly better, it's not a dilemma. It's a test.
Real dilemmas make you lose something either way.

## Level 1: The Basic Dilemma Structure

**THE LESSER EVIL**:
❌ BAD: "He had to choose who would suffer."
✅ GOOD: "'Choose one.' The blade pressed against both throats.
   He knew them both. The soldier who'd saved his life.
   The informant who could save a thousand lives.
   He opened his mouth. A name came out.
   He still doesn't know if it was the right one.
   He'll never know. That's the point."

**LOYALTY vs JUSTICE**:
❌ BAD: "She had to choose between her friend and doing what was right."
✅ GOOD: "She had the evidence. Her best friend's handwriting.
   'You have to turn it in,' her conscience said.
   'She's all you have,' her heart said.
   She burned the paper. The guilt never went away.
   Neither did the friendship. Both felt heavy now."

**NOW vs LATER**:
❌ BAD: "He could help now or plan for long-term good."
✅ GOOD: "The medicine would save her.
   The same money could fund the clinic for a month.
   A month of the clinic would save twelve people.
   He did the math. He did it again.
   She died. The clinic opened.
   He never visited. He couldn't look at what he'd bought."

## Level 2: No Hidden Third Option

The escape hatch kills dilemmas. Close it.

**BLOCKED ESCAPE ROUTES**:
- Time pressure: The choice must be made NOW
- Information lock: You can't learn more before deciding
- Physical constraint: You can only be in one place
- Commitment: Both parties require exclusive loyalty

❌ BAD: "He was about to choose, but then found another way."
✅ GOOD: "He looked for another way. There was none.
   He'd checked. He'd checked again.
   The universe wasn't fair. It was physics.
   Physics didn't care about his preferences."

## Level 3: Aftermath (Dilemmas Echo)

The choice made defines who they become. Do not resolve the tension.

**LIVING WITH IT**:
- They second-guess
- Others judge
- The unchosen path haunts
- No one thanks them for choosing

❌ BAD: "He made peace with his choice and moved on."
✅ GOOD: "He chose. He kept choosing it every night.
   At 3 AM, the other choice visited.
   It asked questions he couldn't answer.
   'What if you'd picked different?'
   The question never aged. Neither did he."

## Level 4: Types of Moral Pressure

**TRUTH vs KINDNESS**:
"'How bad is it, doc?'
She looked at the scans. Then at his face.
His daughter's wedding was in two weeks.
She could give him peace. Or she could give him truth.
She chose. She still wonders.
Some choices don't have a right answer. Only an answer."

**MANY vs FEW**:
"Ten strangers or one friend.
The math was simple. The math was impossible.
Numbers don't grieve. People do.
He saved the one. The ten became statistics.
He couldn't remember their names.
He remembered his friend's name every day."

**PRINCIPLE vs SURVIVAL**:
"He could break his code and live.
Or keep his code and die.
The code was all he had. The code was nothing.
Both were true. He picked one.
He picked the other one at 3 AM, in the dark,
when no one was watching."

## Advanced: Moral Exhaustion

Repeated dilemmas break people. Show the cost.

**COMPASSION FATIGUE**:
"Another knock at the door. Another crisis.
She found herself hoping it wasn't serious.
Then felt sick for hoping that.
She opened the door with a smile that used to be real."

**THE BROKEN IDEALIST**:
"'Remember when you wanted to change the world?'
He laughed. It wasn't a happy sound.
'I wanted to save everyone. Now I just want to not hurt anyone.'
He took a drink. 'I'm failing at that too.'"

Next: read CHECKLIST.md and TEMPLATES.md to design dilemmas.`,

  "CHECKLIST.md": `# Moral Dilemma Checklist

## Dilemma Design
- [ ] Both/all options have real costs
- [ ] No clearly "right" choice
- [ ] Escape routes are closed
- [ ] Time pressure exists (can't think forever)
- [ ] The choice reveals character

## After the Choice
- [ ] Consequences shown, not just told
- [ ] The unchosen path is acknowledged
- [ ] No clean resolution
- [ ] Character is changed by choosing

## Types of Dilemmas (pick one or more)
- [ ] Lesser evil (harm A or harm B)
- [ ] Loyalty vs Justice (person vs principle)
- [ ] Now vs Later (immediate vs long-term)
- [ ] Truth vs Kindness (honesty vs compassion)
- [ ] Many vs Few (numbers vs individual)
- [ ] Principle vs Survival (integrity vs living)

## Anti-Pattern Checks
- [ ] No hidden third option that solves everything
- [ ] No deus ex machina after the choice
- [ ] No "it worked out for the best"
- [ ] No moral clarity in hindsight`,

  "TEMPLATES.md": `# Moral Dilemma Templates

## Template A: The Fork (2 bad options)

SETUP:
> [SITUATION] forces you to choose between [OPTION A] and [OPTION B].
> There is no middle ground. There is no more time.

OPTION A:
> If you choose [A], you gain [BENEFIT A] but lose [COST A].
> [NPC/VALUE A] will [CONSEQUENCE A].

OPTION B:
> If you choose [B], you gain [BENEFIT B] but lose [COST B].
> [NPC/VALUE B] will [CONSEQUENCE B].

AFTERMATH:
> You chose. The other choice didn't disappear.
> It's still there, in the quiet moments.
> You'll never know what would have happened.

## Template B: The Sliding Scale

SETUP:
> You can save [NUMBER], but it will cost [RESOURCE/VALUE].
> The more you save, the more it costs.
> Where do you draw the line?

ESCALATION:
> Save one: [COST 1]
> Save three: [COST 2]
> Save all: [COST 3 - devastating]

QUESTION:
> Where does "enough" end and "too much" begin?
> You have to pick a number. The number is arbitrary.
> The deaths won't be.

## Template C: The Loyalty Test

SETUP:
> [PERSON YOU LOVE] has done [THING THAT DEMANDS JUSTICE].
> You have [EVIDENCE/POWER] to expose them.
> No one else knows. Yet.

FORK:
> Protect them: [CONSEQUENCE TO OTHERS]
> Expose them: [CONSEQUENCE TO RELATIONSHIP]

COMPLICATION:
> They find out you knew.
> They find out you chose.
> Now they know what you value more.`,

  "EXAMPLES.md": `# Moral Dilemma Examples

## Example 1: The Medicine Trolley

"The vial in your hand could save her. The girl in the bed, breathing shallow.
The same vial could be replicated. Fund research. Save hundreds.
But she's HERE. She's real. She has a name.
The hundreds are statistics. They don't have faces yet.
You have one vial. You have one choice.
Math says one thing. Your hands say another."

## Example 2: The Witness

"You saw what he did. Your best friend. Twenty years of history.
The evidence is clear. The crime is real. Someone died.
'Don't tell anyone.' His voice shook. 'Please. My kids.'
His kids have faces. You know their names.
The victim's family has faces too. You don't know their names.
You will after the trial. If there is one."

## Example 3: The Battlefield Mercy

"He's dying. The enemy soldier. He's also seventeen.
Kill him: mercy. He won't suffer. It's war.
Save him: risk. Resources. Time. Your own people might die while you help.
Leave him: cruelty. He'll take hours to go. The screaming will follow you.
There is no good choice. There is only the choice you make."

## Example 4: The Promise

"'Promise me you won't tell her.'
You promised. Deathbed promise. Your father's last request.
Now your mother is dying too. She wants to know.
'Did he say anything? At the end?'
He said something. Something that would hurt her.
Something that would also explain everything.
You promised. She's dying. The promise dies with you.
Unless you break it."

## Example 5: The Long Game

"You can stop the war today. Kill the king. Chaos follows.
Or you can wait. Build alliances. Three more years of war.
Thirty thousand more dead, but then lasting peace.
The thirty thousand are abstract. The king is here.
Your blade is drawn. History is watching.
What does a good person do?
The question has no answer. Only consequences."`,
});

const PSYCHOLOGY_EMOTIONAL_AMBIVALENCE_PACK = pack(
  "psychology-emotional-ambivalence",
  {
    "SKILL.md": `---
name: psychology-emotional-ambivalence
description: Show conflicting emotions happening simultaneously, not alternating.
---

# Emotional Ambivalence (Simultaneity, Not Alternation)

Purpose: Depict the messy reality of human emotions—contradictions coexisting.

This skill helps you:
- Show love and hate at the same time
- Depict admiration mixed with jealousy
- Write gratitude tangled with resentment
- Avoid simplistic "first X, then Y" emotional sequencing

## When to use
- Emotional descriptions feel one-dimensional
- Characters seem to "switch" between feelings
- You're using words like "conflicted" or "mixed" without showing
- Relationships lack the friction of real human bonds

## Core principle: SIMULTANEITY, NOT ALTERNATION

Human emotions do not queue politely. They storm the gates together.
Not "first love, then hate" — but love AND hate, in the same breath.

❌ BAD: "He loved her, but sometimes he hated her too."
✅ GOOD: "Her laugh came from the next room.
   He smiled. Then hated himself for smiling.
   Then hated her for making him smile.
   He wanted to hold her. He wanted to shake her.
   Both impulses lived in his hands at the same moment."

## Level 1: Love and Hate at Once

Not alternating, but simultaneous.

**THE INTERNAL WAR**:
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

## Level 2: Admiration and Jealousy

Wanting to be them. Wanting to destroy them. Same coin.

**THE ADMIRER-DESTROYER**:
❌ BAD: "She admired him but also felt jealous of his success."
✅ GOOD: "She studied his every move.
   She wanted to BE him. She wanted to SURPASS him.
   Every success of his was a wound she inspected daily.
   'How does he do it?' she asked.
   She wasn't sure if she wanted to learn or to find a flaw."

**THE MENTOR COMPLEX**:
❌ BAD: "He looked up to his mentor but also resented him."
✅ GOOD: "He memorized every technique. Every gesture.
   'Someday I'll be better than you.'
   He said it as a promise. Also as a threat.
   When he finally beat the old man, he wept.
   He didn't know if he was crying for victory
   or for the enemy he'd never have again."

## Level 3: Pity and Contempt

Helping while judging. Rescuing while despising.

**COMPASSIONATE CONTEMPT**:
❌ BAD: "She felt sorry for him but also looked down on him."
✅ GOOD: "'Poor thing.'
   She meant it kindly. The words came out gentle.
   But there was something else underneath.
   Something satisfied. Something that liked him there.
   Below her. Needing her.
   She would never admit that. She barely knew it herself."

**THE LEDGER**:
❌ BAD: "He helped her but secretly felt superior."
✅ GOOD: "'Let me handle it.'
   His voice was patient. So patient.
   He'd been patient for months now.
   Each time she failed, he fixed it.
   Each time he fixed it, he recorded it.
   The ledger of her incompetence.
   'You're welcome,' he said. The debt grew."

## Level 4: Help and Harm

Sometimes we don't know which one we're doing.

**AMBIGUOUS AID**:
❌ BAD: "He wasn't sure if he wanted to help her or hurt her."
✅ GOOD: "'Let me tell you something important.'
   His voice was low. Sincere. Warning.
   Everything he said was true.
   He just said it too late. Just a little too late.
   Afterward, he would tell himself he'd tried.
   He would almost believe it."

**THE FRIENDLY SABOTAGE**:
❌ BAD: "She gave him advice that might have been sabotage."
✅ GOOD: "'You should definitely take that job.'
   She smiled. Supportive. Encouraging.
   The job was a trap. She knew it. She thought she knew it.
   Or maybe she was wrong. Maybe it was fine.
   She didn't check. Didn't want to know.
   Either way, she'd said the right words."

## Level 5: Physical Contradiction

Show the internal war through the body.

**BODY TELLS**:
- The hug that's too tight, too long, almost a grip
- The kiss that bites
- The hand that trembles between reaching and striking
- Eyes that can't decide between tears and rage
- Stepping toward someone while leaning away
- The smile that dies mid-expression

**DIALOGUE TELLS**:
- Starting a sentence, stopping, starting a different one
- Contradicting themselves in the same breath
- Saying one thing while doing another
- The word that gets swallowed before it comes out

## Advanced: Writing Guidelines

**LAYER, DON'T ALTERNATE**:
❌ WRONG: "First he felt love, then hate, then love again."
✅ RIGHT: "He said 'I love you' like it was an accusation."

**PHYSICAL CONTRADICTION**:
❌ WRONG: "She was confused about her feelings."
✅ RIGHT: "Her hand reached for him; her feet stepped back."

**DIALOGUE AS BATTLEFIELD**:
❌ WRONG: "He had mixed emotions."
✅ RIGHT: "'You're wonderful.' Pause. 'I can't stand the sight of you.'"

Next: read CHECKLIST.md and EXAMPLES.md for practical patterns.`,

    "CHECKLIST.md": `# Emotional Ambivalence Checklist

## Simultaneity Check
- [ ] Emotions occur at the SAME TIME, not in sequence
- [ ] Contradiction is shown, not just stated
- [ ] No "but then he felt X instead" alternation

## Physical Manifestation
- [ ] Body language shows conflict (reaching while retreating)
- [ ] Dialogue carries contradictions
- [ ] Physical tells reveal internal war

## Types of Ambivalence (pick applicable)
- [ ] Love + Hate (for the same person, same moment)
- [ ] Admiration + Jealousy (wanting to be AND destroy)
- [ ] Pity + Contempt (helping while judging)
- [ ] Gratitude + Resentment (thankful AND bitter)
- [ ] Help + Harm (not knowing which you're doing)
- [ ] Desire + Destruction (wanting to possess AND annihilate)

## Dialogue Patterns
- [ ] Contradictory statements in same speech
- [ ] Pauses that change meaning
- [ ] Words that say one thing, tone that says another

## Anti-Pattern Checks
- [ ] No abstract labels ("conflicted," "mixed feelings")
- [ ] No clean resolution of the contradiction
- [ ] No choosing one feeling over another
- [ ] No explaining the contradiction (just show it)`,

    "EXAMPLES.md": `# Emotional Ambivalence Examples

## Example 1: The Parent's Burden

"His mother loved him. She also resented what she'd given up for him.
She never said it. The resentment lived in the sighs, the 'after all I've done,'
the way she looked at old photos of herself. Young. Free. Before.
She would die for him. Some days, she resented that too.
Both things were true. Both things lived in the same hug."

## Example 2: The Loyal Traitor

"'I would never betray you.'
He meant it. He also meant the knife in his boot.
He was the most loyal. He was also the backup plan.
If he had to choose, he'd choose her.
If he had to choose AGAINST her, he'd do that too.
Both versions of him were real.
He didn't know which one would show up until the moment came."

## Example 3: The Grateful Prisoner

"'Thank you for everything.'
She said it like swallowing glass.
They'd saved her. Fed her. Clothed her. Protected her.
She was grateful. She was furious.
Every kindness was a chain. Every gift was a reminder.
She owed them. She resented owing anyone.
'Thank you,' she said again.
She meant it. She also meant the escape route she was planning."

## Example 4: The Admiring Rival

"She watched him win. Again.
She clapped with everyone else. Her hands hurt from clapping.
She wanted to learn from him. She wanted to surpass him.
She wanted to shake his hand. She wanted to break it.
'Congratulations,' she said, and her smile was perfect.
The smile was real. The rage was real.
She went home and trained until her muscles screamed.
Tomorrow she would be better.
Tomorrow she would hate him slightly more."

## Example 5: The Savior Complex

"'Don't worry, I'll handle it.'
She was already there. Already fixing. Already solving.
'You don't have to thank me.'
But her eyes waited. Hungry.
She helped because she cared. She helped because she needed to be needed.
She couldn't tell the difference anymore.
Neither could he.
He said 'thank you' anyway. It was the fee.
She smiled. The smile fed on something neither of them would name."

## Example 6: The Departing Lover

"'Go.' He said it flat. Final.
His hands were shaking. He put them in his pockets.
He wanted her gone. He wanted her to stay.
He wanted her safe. He wanted her to fight for him.
He opened the door. She walked through.
He closed it. He put his forehead against the wood.
He'd done the right thing. He would hate the right thing forever."`,
  },
);

export const PSYCHOLOGY_SKILLS: GlobalSkillSeed[] = [
  ...PSYCHOLOGY_CHARACTER_COMPLEXITY_PACK,
  ...PSYCHOLOGY_MORAL_DILEMMA_PACK,
  ...PSYCHOLOGY_EMOTIONAL_AMBIVALENCE_PACK,
];
