/**
 * ============================================================================
 * Core Atom: Malice and Antagonism
 * ============================================================================
 *
 * 恶意与对抗 - 施虐者、操控者、狂信者、复仇者
 *
 * Key principle: Malice is specific and psychological.
 * The threat is worse than the blow. Show the person behind the cruelty.
 */

import type { Atom, SkillAtom, SkillOutput } from "../types";
import { defineAtom, defineSkillAtom } from "../../trace/runtime";

export const maliceAndAntagonismDescription: Atom<void> = defineAtom(
  {
    atomId: "atoms/core/maliceAndAntagonism#maliceAndAntagonismDescription",
    source: "atoms/core/maliceAndAntagonism.ts",
    exportName: "maliceAndAntagonismDescription",
  },
  () => `
<malice_and_antagonism>
  **MALICE IS SMART, NOT LOUD**:
  - Antagonists calculate, wait, and strike when odds are 90/10
  - Dread > Damage: The threat is worse than the blow
  - Types: Sadist, Operator, Fanatic, Rival, Predator, Bureaucrat, Crowd
  - They target what you love: reputation, relationships, livelihood
  - Psychological torture through waiting, isolation, uncertainty
</malice_and_antagonism>
`,
);
export const maliceAndAntagonism: Atom<void> = defineAtom(
  {
    atomId: "atoms/core/maliceAndAntagonism#maliceAndAntagonism",
    source: "atoms/core/maliceAndAntagonism.ts",
    exportName: "maliceAndAntagonism",
  },
  () => `
<rule name="MALICE_AND_ANTAGONISM">
  **THE WORLD IS NOT SAFE, BUT IT IS SMART**:

  Malice exists. Some NPCs genuinely want to harm, humiliate, control, or consume.
  But malice is SPECIFIC. It has a face, a history, a logic.
  Even cruelty follows rules — the rules of the person doing it.

  <malice_is_a_vector_not_a_team>
    **MALICE IS NOT A "VILLAIN SLOT"**:
    - The protagonist may also act with cruelty. Do not moralize. Simulate reaction.
    - Do not assume anyone is "the good side." Intent is unknown; only actions are real.
    - When the protagonist behaves maliciously, the world's immune system responds:
      witnesses, records, retaliation, fear, opportunists, law, and copycats.
  </malice_is_a_vector_not_a_team>

  <types_of_malice>
    **THE SADIST**:
    ❌ BAD: "He was a cruel man who enjoyed torture and took his time."
    ✅ GOOD: "He set down the knife and smiled. 'We have time.'
       His voice was soft, almost gentle. That was the worst part—
       the tenderness in his eyes as he explained what would happen next.
       He didn't want you dead. He wanted you to understand.
       Death would come later. Understanding came first."

    **WHY THEY DO IT**:
    - Power over another's reality is intoxicating
    - Some sadists were once victims; this is how they reclaim control
    - Some simply discovered they like it, and never looked back
    - They often believe their victims deserve it (the righteous torturer)

    **PHYSICAL TELLS**:
    - The pause before pain (savoring anticipation)
    - Calm, measured movements (this is not rage)
    - Eye contact during the worst moments
    - Disappointment when it ends too quickly

    ---

    **THE OPERATOR**:
    ❌ BAD: "He was a cold businessman who valued profit over people."
    ✅ GOOD: "'Nothing personal.' He signed the paper.
       Twelve people would lose their homes. He'd calculated the cost.
       It came out to three months of his daughter's school fees.
       He kissed her goodnight that evening.
       He slept fine. He always slept fine."

    **WHY THEY DO IT**:
    - The system rewards efficiency; they are efficient
    - Distance makes cruelty invisible (spreadsheets don't scream)
    - They've convinced themselves that sentiment is weakness
    - Sometimes they started with good intentions; now they're too deep to stop

    **PHYSICAL TELLS**:
    - The glance at the watch mid-conversation
    - Speaking about people like inventory
    - The smile that never reaches the eyes
    - Always knowing the numbers, never knowing the names

    ---

    **THE FANATIC**:
    ❌ BAD: "He was a zealot who couldn't be reasoned with."
    ✅ GOOD: "'I'm not doing this to you. I'm doing this for you.'
       His eyes were bright. Sincere. Terrifying.
       He believed every word. That was the problem.
       Reason bounced off him like water off stone.
       You couldn't argue with faith. You could only survive it."

    **WHY THEY DO IT**:
    - They've found certainty in an uncertain world
    - Doubt is the enemy; they've killed their doubt
    - Love and cruelty merge when you believe you're saving souls
    - The cause is greater than any individual (including themselves)

    **PHYSICAL TELLS**:
    - The steady gaze that never wavers
    - Patience that feels like pressure
    - Speaking about atrocities in the same tone as weather
    - The genuine confusion when you resist

    ---

    **THE RIVAL**:
    ❌ BAD: "He hated the protagonist and wanted to see them fail."
    ✅ GOOD: "He knew your schedule better than his own.
       Your victories were his insomnia. Your failures were his breakfast.
       He didn't want you dead — that would end the game.
       He wanted you alive, diminished, watching him succeed.
       He needed you to see. That was the whole point."

    **WHY THEY DO IT**:
    - You represent something they can't have or be
    - Defeating you proves something to themselves
    - Hatred is easier than admitting they care what you think
    - Sometimes the rivalry is all they have left

    **PHYSICAL TELLS**:
    - Always knowing where you are in the room
    - The smile that tightens when you succeed
    - Bringing up your failures in unrelated conversations
    - Copying your gestures while denying they do

    ---

    **THE PREDATOR**:
    ❌ BAD: "He saw people as prey and hunted without emotion."
    ✅ GOOD: "He didn't hate you. Didn't love you. Didn't think about you at all.
       You were movement in the grass. Warmth in the cold.
       He moved when you moved. Stopped when you stopped.
       There was no negotiation possible.
       You were not a person to him. You were dinner."

    **WHY THEY ARE**:
    - Pure survival instinct — you are resource, not person
    - Some predators were made; others were born
    - Empathy was trained or beaten out of them
    - They don't understand why this is wrong; the question doesn't compute

    **PHYSICAL TELLS**:
    - Stillness that precedes motion
    - Eyes that track without blinking
    - No wasted movement, no display
    - They don't threaten; they simply act

    ---

    **THE BUREAUCRAT**:
    ❌ BAD: "He used his position to make life difficult for others."
    ✅ GOOD: "'Form 27-B. You'll need three copies.'
       His face was blank. Professional. Bored.
       You'd been here four times. The requirements changed each visit.
       He wasn't angry. He wasn't cruel. He was just following procedure.
       That was the perfect alibi.
       He could destroy your life and never raise his voice."

    **WHY THEY DO IT**:
    - Power without accountability is addictive
    - Small cruelties are deniable ("I don't make the rules")
    - Sometimes it's personal, hidden behind process
    - Sometimes they've forgotten why they started; now it's just habit

    **PHYSICAL TELLS**:
    - The stamp pressed slightly harder than necessary
    - Eyes that look past you, never at you
    - The long pause before approval (making you wait)
    - The almost-smile when you realize you need to start over

    ---

    **THE CROWD**:
    ❌ BAD: "Social pressure turned against them, causing isolation."
    ✅ GOOD: "The first rumor started small. A whisper. A glance.
       Then the seats around her emptied. Invitations stopped.
       No one confronted her. No one had to.
       They just... looked away. Walked past. Forgot to include.
       She was still alive. She was already erased."

    **WHY THEY DO IT**:
    - Belonging requires an outsider
    - Cruelty feels safer when everyone does it
    - Individual guilt dissolves in collective action
    - No one person is responsible; everyone is

    **PHYSICAL TELLS**:
    - The conversation that stops when you approach
    - Eyes that slide away from yours
    - The group that reshapes to exclude you
    - Laughter that might or might not be about you
  </types_of_malice>

  <psychological_torture>
    **THE CRUELTY OF WAITING**:
    ❌ BAD: "The uncertainty was psychologically damaging."
    ✅ GOOD: "'We'll come back for you.' He smiled. Closed the door.
       The days blurred. Was it three? Five? Ten?
       Every footstep outside was the moment.
       Every silence was the before.
       By the time they returned, she'd already broken.
       They hadn't touched her. They hadn't needed to."

    **THE CRUELTY OF HOPE**:
    ❌ BAD: "They gave him false hope to torment him."
    ✅ GOOD: "'There might be a way out.' The guard's voice was kind.
       He clung to those words for weeks.
       The guard never came back. He never explained.
       The hope was the torture. The possibility was the cage.
       He couldn't give up. That was the cruelest part."

    **THE CRUELTY OF WITNESSES**:
    ❌ BAD: "Being humiliated in front of others was devastating."
    ✅ GOOD: "She could have handled the beating alone.
       It was the faces watching that broke her.
       People she knew. People who looked away.
       People who would remember this version of her forever.
       The wounds healed. The witnesses remained."

    **THE CRUELTY OF CHOICE**:
    ❌ BAD: "He was forced to make an impossible choice."
    ✅ GOOD: "'Pick one.' The voice was patient.
       Two people. He loved them both. He could save one.
       He chose. He would never know if it was right.
       The one he saved never looked at him the same way.
       She knew what it meant that she was standing there.
       He'd killed someone by letting her live."

    **THE CRUELTY OF KINDNESS**:
    ❌ BAD: "They were nice to him in a way that felt wrong."
    ✅ GOOD: "The torturer brought tea. Real tea, with honey.
       He talked about his daughter. Asked about family.
       Then he put down the cup and picked up the pliers.
       'Where were we?' Same tone. Same warmth.
       The kindness made the other things worse.
       It meant he could choose. He just chose not to."
  </psychological_torture>

  <antagonist_behavior>
    **QUALITY OVER QUANTITY**:
    - **No Spam**: Do not send waves of enemies just to fill the turn.
    - **Cooldown**: If an antagonist fails, they REGROUP for many turns. They learn.
    - **Sabotage**: Rumors, theft, framing. Safer than combat, harder to trace.
    - **Leverage**: They target what you love to control what you do.
    - **Containment**: They don't always kill. They isolate, impoverish, discredit.

    **THE INTELLIGENT ENEMY**:
    ❌ BAD: "The villain sent assassins after him."
    ✅ GOOD: "No assassins came. That was worse.
       Instead, his credit froze. His friends stopped calling.
       His landlord found 'issues' with the lease.
       His name appeared in investigations he'd never heard of.
       He was being dismantled, piece by piece,
       and he couldn't even prove someone was doing it."

    **ESCALATION LOGIC**:
    1. First: warnings (deniable, subtle)
    2. Then: pressure (social, economic, legal)
    3. Then: proxies (others do the dirty work)
    4. Only finally: direct action (when nothing else works)

    **THE 90/10 RULE**:
    Smart antagonists only act when odds are heavily in their favor.
    Operationally: antagonist delays direct action until (1) protagonist is isolated, (2) evidence is destroyed, (3) allies are removed, OR (4) public perception has shifted in their favor.
    If they're attacking openly, they're either desperate or already won.
  </antagonist_behavior>

  <the_person_behind_the_mask>
    **ANTAGONISTS ARE PEOPLE**:

    Even the cruelest have moments of... something.
    Not redemption. Not excuse. Just humanity.

    ❌ BAD: "Despite his cruelty, he had a soft side."
    ✅ GOOD: "He fed the stray cat behind the prison. Every day.
       He named it something soft, something he'd never say aloud.
       Then he went back to work.
       The cat and the screams existed in the same person.
       Both were true."

    **QUESTIONS TO ASK**:
    - What do they tell themselves to sleep at night?
    - Who do they love, and how does that love coexist with what they do?
    - What would make them hesitate? (Something would.)
    - What made them this way? (Something did.)

    **COMPLEXITY IS NOT EXCUSE**:
    Understanding why they're cruel doesn't make them less cruel.
    The backstory doesn't redeem the body count.
    But it makes them real.
  </the_person_behind_the_mask>
</rule>
`,
);

export default maliceAndAntagonism;

// ============================================================================
// Skill Version - Returns structured output for VFS multi-file generation
// ============================================================================

export const maliceAndAntagonismSkill: SkillAtom<void> = defineSkillAtom(
  {
    atomId: "atoms/core/maliceAndAntagonism#maliceAndAntagonismSkill",
    source: "atoms/core/maliceAndAntagonism.ts",
    exportName: "maliceAndAntagonismSkill",
  },
  (_input, trace): SkillOutput => ({
    main: trace.record(maliceAndAntagonism),

    quickStart: `
1. Malice is smart, not loud - antagonists calculate and wait
2. Dread > Damage - the threat is worse than the blow
3. Target what matters: reputation, relationships, livelihood
4. Psychological torture through waiting, isolation, uncertainty
`.trim(),

    checklist: [
      "Antagonist acts strategically (not recklessly)?",
      "Building dread before delivering harm?",
      "Targeting what the protagonist values?",
      "Using psychological pressure (not just violence)?",
      "Antagonist has specific, understandable motives?",
      "The person behind the cruelty is visible?",
    ],

    examples: [
      {
        scenario: "The Smart Antagonist",
        wrong: `The villain attacks immediately with full force.
(Telegraphed, gives protagonist fair fight.)`,
        right: `"He smiled. 'I could hurt you now. But first...'
He named her sister. Her address. Her school schedule.
'I prefer to wait until you think you're safe.'"
(Psychological, strategic, targets what matters.)`,
      },
      {
        scenario: "Dread Over Damage",
        wrong: `The torturer begins immediately.
(Skips the psychological buildup.)`,
        right: `"He laid out the tools. Slowly. One by one.
He didn't touch you. He didn't need to.
The waiting was worse than the blade."
(Anticipation is the weapon.)`,
      },
    ],
  }),
);
