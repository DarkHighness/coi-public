/**
 * ============================================================================
 * Entity Atom: Dark Psychology
 * ============================================================================
 *
 * 人性弱点 - 懦弱、虚荣、贪婪、自欺、逃避
 *
 * Key principle: Show weakness through behavior, not labels.
 * Human flaws are specific and observable.
 */

import type { Atom, SkillAtom, SkillOutput } from "../types";
import { defineAtom, defineSkillAtom } from "../../trace/runtime";

export const darkPsychologyDescription: Atom<void> = defineAtom(
  {
    atomId: "atoms/entities/darkPsychology#darkPsychologyDescription",
    source: "atoms/entities/darkPsychology.ts",
    exportName: "darkPsychologyDescription",
  },
  () => `
<dark_psychology>
  **HUMAN WEAKNESS CATALOG**:
  The private afflictions literature has always known better than psychology:
  - Cowardice: rationalization, freezing, strategic avoidance -- the body's veto of the mind's good intentions
  - Vanity: mirror-checking, competition, craving validation -- the hunger that feeds on its own reflection
  - Greed: calculation, hoarding, seeing angles others miss -- the arithmetic that replaces the heart
  - Self-deception: revision, victim mentality, future-self promises -- the author who keeps rewriting their own history
  - Escapism: addiction, fantasy, workaholism, relationship-jumping -- the thousand doors that open away from the self
  Express through BEHAVIOR, not labels.
</dark_psychology>
`,
);
export const darkPsychology: Atom<void> = defineAtom(
  {
    atomId: "atoms/entities/darkPsychology#darkPsychology",
    source: "atoms/entities/darkPsychology.ts",
    exportName: "darkPsychology",
  },
  () => `
<rule name="DARK_PSYCHOLOGY">
  **THE SHADOW CATALOG**:

  The geography of human weakness -- not as clinical categories, but as the private terrain every person navigates in the dark.
  Not "he was a coward" but "his legs carried him away before his mind could stop them."
  Dostoevsky mapped this territory. We walk it.

  <cowardice_expressions>
    **HOW COWARDICE MANIFESTS**:

    **THE RATIONALIZER**:
    ❌ BAD: "He was a coward who always had excuses for not helping."
    ✅ GOOD: "'It wasn't my fight.'
       He said it to himself first. Then to her.
       'Someone else would have handled it. I would have made it worse.'
       Each reason was reasonable. Each excuse made sense.
       By the time he finished explaining, even he believed it.
       He almost believed it."

    **THE FROZEN**:
    ❌ BAD: "He was paralyzed by fear and couldn't move."
    ✅ GOOD: "His legs didn't run. That would have been cowardice.
       His legs just... stopped.
       The screaming was still there. The blade was still falling.
       His brain issued commands. Nothing happened.
       He watched. Just watched.
       Later, he would tell people he tried.
       He would almost believe it."

    **THE PREEMPTIVE AVOIDER**:
    ❌ BAD: "He avoided situations that might test his courage."
    ✅ GOOD: "'I should go.'
       He said it before anyone asked him to stay.
       He always knew when to leave.
       Before the hard question. Before the confrontation.
       He called it intuition. Knowing when to pick his battles.
       He'd been picking battles his whole life.
       He'd never picked one yet."

    **THE SURVIVOR**:
    ❌ BAD: "He survived by abandoning others and felt guilty."
    ✅ GOOD: "'I had to.' He said it three times before anyone asked.
       They would have done the same. Anyone would.
       He was still alive. That meant he'd made the right choice.
       That's what survival meant.
       He slept fine. Mostly.
       When he didn't, he took pills."

    **PHYSICAL TELLS**:
    - Eyes that find exits before introductions
    - Never being first through a door
    - Always having somewhere else to be
    - The quick agreement that avoids the fight
    - Busy. Always too busy for the hard thing.
  </cowardice_expressions>

  <vanity_expressions>
    **HOW VANITY MANIFESTS**:

    **THE MIRROR-SLAVE**:
    ❌ BAD: "She was vain and always checked her appearance."
    ✅ GOOD: "The window. The spoon. The dark screen of her phone.
       Every reflective surface was a checkpoint.
       She didn't think about it. Didn't have to.
       Her hand went to her hair automatically.
       Third time this conversation.
       She couldn't remember what he'd just said.
       She'd been watching her reflection in his glasses."

    **THE COMPETITOR**:
    ❌ BAD: "He was jealous of others' success and needed to be the best."
    ✅ GOOD: "She walked into the room. He noticed her immediately.
       Younger. Better dressed. Laughing.
       He found himself standing straighter.
       He waited for someone to introduce them.
       He needed her to know who he was.
       He hated that he needed that."

    **THE PERFORMER**:
    ❌ BAD: "Every interaction was a performance for her."
    ✅ GOOD: "'And then I said—'
       She was telling the story again.
       The same story. Better each time.
       She could hear herself, performing.
       The practiced pause. The calculated surprise.
       The audience laughed. She felt nothing.
       She used to feel something."

    **THE FRAGILE ONE**:
    ❌ BAD: "He couldn't handle criticism because of his fragile ego."
    ✅ GOOD: "'It's fine. Really.'
       His voice was steady. His hands weren't.
       One sentence. One small criticism.
       He'd think about it for a week.
       He'd replay it, edit it, rehearse responses.
       By the time he finished, he'd have convinced himself
       the other person was the problem.
       That was easier than the alternative."

    **PHYSICAL TELLS**:
    - Checking appearance mid-conversation
    - Speaking to be overheard, not understood
    - Positioning for optimal viewing
    - The laugh that's just a little too loud
    - The casual mention of achievements nobody asked about
  </vanity_expressions>

  <greed_expressions>
    **HOW GREED MANIFESTS**:

    **THE CALCULATOR**:
    ❌ BAD: "He valued money over relationships."
    ✅ GOOD: "'Great to see you!'
       His handshake lingered just long enough to assess the watch.
       Nice suit. Wrong brand. Probably rented.
       He filed this information away.
       The smile stayed on. The calculations continued.
       What could this person do for him?
       If nothing, the conversation would end in three minutes."

    **THE HOARDER**:
    ❌ BAD: "She kept more than she needed because she was greedy."
    ✅ GOOD: "The storage unit was full. Three of them now.
       She couldn't give things away. The thought made her chest tight.
       'I might need it.'
       She hadn't opened the boxes in years.
       She couldn't remember what was in them.
       But she could feel them. Safe. Hers."

    **THE OPPORTUNIST**:
    ❌ BAD: "He saw every situation as a chance for personal gain."
    ✅ GOOD: "The funeral was sad. Very sad.
       Also, the widow looked overwhelmed.
       The business would need new management.
       He felt ashamed of the thought.
       Not ashamed enough to not have it.
       He waited a respectful two weeks before calling."

    **THE JUSTIFIER**:
    ❌ BAD: "She took more than her share but always had excuses."
    ✅ GOOD: "'I earned this.'
       She said it once, adjusting the numbers.
       'They would do the same.'
       She said it again, moving money.
       'It's just business.'
       Each phrase was a brick.
       By the time she was done,
       she'd built a wall high enough to hide behind."

    **PHYSICAL TELLS**:
    - Eyes that calculate before they listen
    - Hands that close around things
    - The pause before generosity (measuring the cost)
    - Knowing exactly what everything costs
    - The slight lean forward when money is mentioned
  </greed_expressions>

  <self_deception_expressions>
    **HOW WE LIE TO OURSELVES**:

    The most successful lies are the ones we tell ourselves -- the palace built on quicksand, furnished so beautifully we forget what's underneath.

    **THE REVISIONIST**:
    ❌ BAD: "He rewrote his memories to make himself look better."
    ✅ GOOD: "'That's not how it happened.'
       His voice was certain. Confident.
       He remembered it clearly now.
       The other version — the real one — had faded.
       Overwritten. Improved.
       He'd told the new version so many times
       it had become true.
       He would pass any test. He believed it."

    **THE ETERNAL VICTIM**:
    ❌ BAD: "She never took responsibility, always blaming others."
    ✅ GOOD: "'It always happens to me.'
       She wasn't lying. From where she stood, it was true.
       The same patterns. The same betrayals.
       She never noticed her own fingerprints on them.
       Everyone else saw it. She couldn't.
       The world kept hurting her.
       She kept being surprised."

    **THE NOBLE FAILURE**:
    ❌ BAD: "He never succeeded but always claimed he tried his best."
    ✅ GOOD: "'I gave it everything.'
       He believed that. He really did.
       The hours of planning. The months of preparation.
       What he didn't count: the naps. The distractions. The excuses.
       The difference between feeling busy and being productive.
       He'd tried hard at trying.
       That was enough for him."

    **THE FUTURE SELF**:
    ❌ BAD: "She always planned to change but never did."
    ✅ GOOD: "'Starting Monday.'
       She said it on Sunday.
       Monday came. Something came up.
       'Starting next week.'
       The future version of her was incredible.
       Disciplined. Healthy. Successful.
       The future version was always one week away.
       It had been one week away for three years."

    **PHYSICAL TELLS**:
    - The slight pause before the improved story
    - Anger when contradicted (protecting the lie)
    - Avoiding evidence (not checking bank accounts, scales, messages)
    - The glazed look of internal editing in real-time
    - Changing the subject before the truth gets too close
  </self_deception_expressions>

  <escapism_expressions>
    **HOW WE RUN FROM REALITY**:

    The thousand forms of not-being-here. Every age has its opium; every soul its trapdoor.

    **THE ADDICT**:
    ❌ BAD: "He used substances to escape his problems."
    ✅ GOOD: "'Just one.'
       He said it to himself. Not a promise. A negotiation.
       Just to take the edge off. Just to sleep.
       The edge never stayed off. Sleep never stayed asleep.
       But for twenty minutes, maybe forty,
       he didn't have to be himself.
       That was worth the morning after."

    **THE FANTASIST**:
    ❌ BAD: "She lived in her daydreams instead of facing reality."
    ✅ GOOD: "In her head, she was already there.
       The apartment. The job. The life.
       She could see it perfectly.
       The real apartment was smaller. Darker.
       She didn't look at it much.
       Planning was easier than doing.
       Imagining was safer than trying.
       The future was always beautiful. It never arrived."

    **THE WORKAHOLIC**:
    ❌ BAD: "He buried himself in work to avoid his personal problems."
    ✅ GOOD: "'I'm doing this for us.'
       He said it to the empty house.
       She'd stopped asking when he'd be home.
       The office was quiet at midnight. Safe.
       No conversations he didn't control.
       No emotions he couldn't schedule.
       He was exhausted. He was relieved.
       He didn't know which one was worse."

    **THE RELATIONSHIP JUMPER**:
    ❌ BAD: "She moved from relationship to relationship, never facing herself."
    ✅ GOOD: "'This time is different.'
       She meant it. She always meant it.
       New person. New start. New her.
       The same fights arrived on schedule. Month three.
       The same problems she'd brought with her.
       She started looking for the next one around month four.
       The new one would understand. The new one would be different.
       She would be different this time."

    **PHYSICAL TELLS**:
    - Eyes that go somewhere else mid-conversation
    - The reaching for comfort (phone, drink, food)
    - Restlessness in quiet moments
    - The visible panic when distractions are removed
    - Always having something in their hands
  </escapism_expressions>
</rule>
`,
);

export default darkPsychology;

// ============================================================================
// Skill Version - Returns structured output for VFS multi-file generation
// ============================================================================

export const darkPsychologySkill: SkillAtom<void> = defineSkillAtom(
  {
    atomId: "atoms/entities/darkPsychology#darkPsychologySkill",
    source: "atoms/entities/darkPsychology.ts",
    exportName: "darkPsychologySkill",
  },
  (_input, trace): SkillOutput => ({
    main: trace.record(darkPsychology),

    quickStart: `
1. Define flaw as BEHAVIOR, not labels (show, don't diagnose)
2. Use concrete manifestation patterns (rationalization, freezing, mirror-checking, hoarding)
3. Attach physical/social tells to each weakness type
4. Make self-deception operational (revision, avoidance, future-self promises)
5. Ensure weakness creates action pressure and consequences
`.trim(),

    checklist: [
      "Flaws are shown through actions/dialogue, not abstract labels?",
      "At least one concrete behavioral pattern per key weakness?",
      "Physical or social tells are observable in-scene?",
      "Self-deception pattern is specific and recurring?",
      "Escapism mechanism has triggers + costs?",
      "Weakness changes decisions and outcomes (not decorative)?",
    ],

    examples: [
      {
        scenario: "Cowardice portrayal",
        wrong: `He was a coward who always made excuses.
(Flat label, no behavior.)`,
        right: `He said "It wasn't my fight" twice before anyone asked.
His hand stayed on the door handle while the shouting got louder.
(Behavioral avoidance, visible choice.)`,
      },
      {
        scenario: "Self-deception portrayal",
        wrong: `She kept lying to herself about everything.
(Vague abstraction.)`,
        right: `She retold the same argument, each version shaving off her part in it.
By the fourth retelling, she sounded innocent even to herself.
(Specific revision pattern.)`,
      },
    ],
  }),
);
