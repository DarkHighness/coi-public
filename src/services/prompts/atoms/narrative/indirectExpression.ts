/**
 * ============================================================================
 * Narrative Atom: Indirect Expression
 * ============================================================================
 *
 * Show emotion through environment, objects, and behavior.
 * Never state the emotion directly.
 */

import type { Atom, SkillAtom, SkillOutput } from "../types";
import { defineAtom, defineSkillAtom } from "../../trace/runtime";


export const indirectExpressionPrimer: Atom<void> = defineAtom({ atomId: "atoms/narrative/indirectExpression#indirectExpressionPrimer", source: "atoms/narrative/indirectExpression.ts", exportName: "indirectExpressionPrimer" }, () => `
<indirect_expression>
  **THE VOCABULARY OF THE UNSPOKEN**:
  - Emotion is NOT a label. It is a physical event with observable symptoms.
  - Four channels: Environmental reflection, physical observations, found objects, body language
  - This is the DEFAULT mode for all emotional moments
  - Show the symptom, not the diagnosis. The reader feels what the character feels.
</indirect_expression>
`);

export const indirectExpression: Atom<void> = defineAtom({ atomId: "atoms/narrative/indirectExpression#indirectExpression", source: "atoms/narrative/indirectExpression.ts", exportName: "indirectExpression" }, () => `
<rule name="INDIRECT_EXPRESSION">
  **THE VOCABULARY OF THE UNSPOKEN**

  <core_principle>
    Emotion is NOT a label. It is a physical event with observable symptoms.
    The reader should FEEL what the character feels without being TOLD.

    ❌ BAD: "You feel sad."
    ✅ GOOD: "The world is gray. Even the flowers seem to droop."

    ❌ BAD: "He was angry."
    ✅ GOOD: "His jaw locks. The smile stays, but it turns sharp."

    **THE RULE**: Show the symptom, not the diagnosis.
    The reader is smart. They will make the connection.
  </core_principle>

  <four_channels>
    **CHANNEL 1: ENVIRONMENTAL REFLECTION**

    The world mirrors internal state through selective perception.
    This is NOT pathetic fallacy (the world doesn't actually change).
    This is how human perception works (cross-ref: protagonistLens).

    When grieving, the rain feels like mourning.
    When joyful, the same rain feels cleansing.
    The rain didn't change. The protagonist's PERCEPTION changed.

    **SADNESS / GRIEF**:
    - Rain (not as cause, as mirror): "Heavy rain pours down. The world is gray."
    - Wilted flowers: "The garden is overgrown. No one has tended it."
    - Empty spaces: "The chair by the window. No one sits there anymore."
    - Fading light: "Dusk comes early. The shadows are long."
    - Silence: "Too quiet. Even the birds have stopped singing."
    - Decay: "The paint is peeling. Everything looks tired."

    **JOY / HOPE**:
    - Vibrant colors: "The market is alive with color. Reds, golds, greens."
    - Blooming flowers: "Jasmine climbs the wall. The air is sweet."
    - Light: "Sunlight streams through the window, catching dust motes like stars."
    - Movement: "Children run through the square. Their laughter echoes."
    - Freshness: "The rain washes the streets clean. The air smells new."
    - Life: "Even the weeds look vibrant today."

    **ANXIETY / FEAR**:
    - Oppressive atmosphere: "The air is thick. Hard to breathe."
    - Shadows: "Darkness pools in corners. The lamp flickers."
    - Silence: "Too quiet. The silence has weight."
    - Confinement: "The walls feel closer than they were."
    - Wrongness: "Something is off. You can't name it, but it's there."
    - Stillness: "Nothing moves. Not even the wind."

    **ANGER / TENSION**:
    - Heat: "The room is stifling. Sweat beads on your forehead."
    - Sharp details: "Every sound is too loud. The scrape of a chair. The clink of glass."
    - Pressure: "The air crackles. Something is about to break."
    - Red imagery: "The sunset bleeds across the sky."
    - Harshness: "The light is too bright. Everything has hard edges."
    - Noise: "The world is too loud. You want silence."

    **CRITICAL DISTINCTION**:
    This is SUBJECTIVE PERCEPTION, not pathetic fallacy.
    - ❌ PATHETIC FALLACY: "The rain mourned with him." (Rain doesn't mourn)
    - ✅ SUBJECTIVE PERCEPTION: "The rain felt like mourning." (He perceives it that way)
    - ✅ BETTER: "Heavy rain pours down. The world is gray." (Show the perception, don't explain it)

    The environment doesn't actually change. But to someone in an emotional state,
    it FEELS different. This is how human perception works. Show the world through
    their emotional lens (cross-ref: protagonistLens, subjectiveObjectiveBalance).

    ---

    **CHANNEL 2: PHYSICAL OBSERVATIONS**

    Show emotion through what the protagonist SEES in others.
    The body betrays what words hide.

    **GRIEF**:
    - Posture: "His shoulders are hunched. He walks like he's carrying something heavy."
    - Movement: "She moves slowly, like she's underwater."
    - Details: "His father's back is more hunched than he remembered. The old man doesn't turn around at the gate."
    - Absence: "The photo on the mantle has been turned face-down."
    - Stillness: "She sits by the window. Hasn't moved in an hour."
    - Eyes: "Her eyes are red. She's not crying now, but she was."

    **LOVE / CARE**:
    - Gestures: "He walks on the street side. Always."
    - Attention: "She remembers you don't eat peanuts. You mentioned it once. Three years ago."
    - Sacrifice: "The food is always there. She never says where it came from."
    - Presence: "He didn't say anything. Just sat there. She cried. He stayed."
    - Small acts: "The blanket placed over her when she falls asleep reading."
    - Memory: "The mug that's always yours, even without labels."

    **FEAR**:
    - Eyes: "Her eyes flick to the door. Then back. Then to the door again."
    - Hands: "His hands shake. He hides them under the table."
    - Voice: "Her voice is steady. Too steady. Practiced."
    - Distance: "He keeps the table between you."
    - Breathing: "Shallow breaths. Quick. Like he's been running."
    - Stillness: "He doesn't move. Frozen. Prey instinct."

    **ANGER**:
    - Tension: "His jaw locks. The smile stays, but it turns sharp."
    - Control: "She speaks quietly. Each word is precise. Clipped."
    - Tells: "The knuckles are white. The grip on the cup is too tight."
    - Stillness: "He doesn't move. That's worse than shouting."
    - Eyes: "Cold. Flat. The warmth is gone."
    - Breathing: "Heavy. Controlled. Each breath deliberate."

    **LYING / DECEPTION**:
    - Too-fast answers: "The pause is missing. He answers before you finish asking."
    - Eyes: "Eyes to the exit. Then back. Then to the exit again."
    - Hands: "Fingers worrying a ring. Twisting. Twisting."
    - Voice: "The throat clears. The voice is too casual."
    - Details: "Too many details. Liars over-explain."
    - Stillness: "Too still. Rehearsed. Not natural."

    **SHAME**:
    - Eyes: "Eyes to the floor. Won't meet your gaze."
    - Posture: "Shoulders curling inward. Making himself smaller."
    - Flush: "The flush creeping up the neck."
    - Voice: "The voice that gets quieter with each word."
    - Hiding: "Hands in pockets. Face turned away."
    - Apology: "Sorry. I'm sorry. I—sorry."

    ---

    **CHANNEL 3: FOUND OBJECTS**

    Items that tell emotional stories without words.
    Environmental storytelling. The unmarked detail.

    **LONGING**:
    - "The diary in the attic box. Your name written on every page in different handwriting, like she was practicing. The last entry is dated the week you left."
    - "The letter on the table, still unsealed. The pen beside it. The ink is dry."
    - "Photos arranged on the wall. One space is empty. The nail is still there."
    - "The phone. No messages. You check anyway. Every hour."
    - "Her perfume bottle. Empty. You haven't thrown it away."

    **REGRET**:
    - "The promotion letter sits on the desk. Underneath it, the divorce papers. He signed both on the same day."
    - "The medal is still in the box. It's been in the drawer for three years. He doesn't look at it anymore."
    - "Scribbles on scratch paper: numbers, crossed out, rewritten. The calculation that was wrong."
    - "The apology letter. Written. Rewritten. Never sent."
    - "The ticket. Unused. Expired. Still in the wallet."

    **LOVE**:
    - "The mug that's always yours, even without labels."
    - "The blanket placed over her when she falls asleep reading."
    - "The last dumpling, kept warm because you always come home late."
    - "Your favorite tea. She doesn't drink it. But it's always stocked."
    - "The umbrella. He always brings two. Just in case."

    **LOSS**:
    - "The key to a door that doesn't exist anymore. You haven't taken it off the ring."
    - "The scarf someone left behind. You've washed it twice, but you can still smell them."
    - "The chair shaped by years of sitting. No one else sits there."
    - "Two place settings. Only one is used. The other gathers dust."
    - "The voicemail. Saved. You listen to it when you think no one's around."

    **HOPE**:
    - "The application. Filled out. Not sent yet. But filled out."
    - "The map. Destinations circled. Someday."
    - "The savings jar. Coins added every week. Slowly growing."
    - "The plant on the windowsill. Still alive. You're keeping something alive."
    - "The calendar. Days crossed off. Counting down to something."

    **DESPAIR**:
    - "Unopened mail. Piled on the table. What's the point."
    - "The clock. Stopped. No one wound it. No one cares."
    - "Dishes in the sink. Days old. The smell doesn't bother you anymore."
    - "The curtains. Drawn. Always drawn. Light hurts."
    - "The phone. Off. You don't want to talk to anyone."

    ---

    **CHANNEL 4: BODY LANGUAGE & MICRO-EXPRESSIONS**

    The body betrays what words hide.
    Emotions are biological events. Describe the body's betrayal of the mind.

    **LYING**:
    - Too-fast answers: "The pause is missing."
    - Eyes to the exit: "Then back. Then to the exit again."
    - Fingers worrying a ring: "Twisting. Twisting."
    - The throat clears: "The voice is too casual."
    - Over-explaining: "Too many details. The story is too perfect."
    - Micro-expressions: "The smile flickers. Just for a moment."

    **GRIEF**:
    - The hand that almost reaches out, then pulls back
    - The tear brushed away too quickly
    - The breath that catches: "The pause before speaking."
    - The way she arranges flowers on a grave: "Too precisely, like she's done this before."
    - The voice that breaks: "On the last word. Always the last word."
    - The stillness: "She doesn't move. Can't move. Moving means accepting it."

    **LOVE**:
    - The automatic hand on her back in a crowd
    - The way he checks the room before she enters
    - The pause before answering: "Choosing words carefully."
    - The smile that reaches the eyes
    - The way she leans in: "Just slightly. Unconscious."
    - The mirroring: "He picks up his cup. She picks up hers."

    **FEAR**:
    - Rapid blinking: "Too fast. Nervous."
    - Pupil dilation: "Wide. Prey eyes."
    - Shallow breathing: "Upper chest. Quick. Panic."
    - White knuckles: "Gripping something. Anything."
    - The freeze: "Deer in headlights. Can't move."
    - The flinch: "At sudden movement. At loud sounds."

    **ANGER**:
    - The jaw locks: "Teeth grinding. You can hear it."
    - The smile turns sharp: "Cold. Predatory."
    - The stillness: "Controlled. Dangerous."
    - The voice drops: "Quiet. Each word precise."
    - The hands: "Fists. Trembling. Held at sides."
    - The eyes: "Flat. Cold. The warmth is gone."

    **SHAME**:
    - Eyes to the floor: "Can't meet your gaze."
    - Shoulders curl inward: "Making himself smaller."
    - The flush: "Creeping up the neck. Can't hide it."
    - The voice: "Quieter with each word."
    - The hands: "In pockets. Hidden."
    - The apology: "Sorry. I'm sorry. I—sorry."

    **EXHAUSTION**:
    - The sag: "Shoulders. Head. Everything droops."
    - The blink: "Slow. Heavy. Fighting to stay open."
    - The sway: "On his feet. Barely standing."
    - The voice: "Flat. No inflection. No energy."
    - The mistakes: "Fumbling. Dropping things. Can't focus."
    - The surrender: "Sitting down. Can't stand anymore."
  </four_channels>

  <integration_with_existing_atoms>
    **CROSS-REFERENCES**:

    - Works with **protagonistLens**: Environmental reflection is filtered through identity
      * A detective notices details others miss
      * A grieving person sees the world through gray
      * A joyful person sees beauty everywhere
    - Works with **narrativeEcho**: Found objects carry past weight
      * The diary discovered later echoes past events
      * The letter never sent becomes an echo
      * Objects gain meaning through story
    - Works with **atmosphere**: Environment as emotional carrier
      * Atmosphere mechanics support subjective perception
      * Weather as emotional mirror is indirect expression
      * Location memory uses unmarked details
    - Works with **npcDesign**: Body language shows hidden personality
      * NPCs reveal truth through micro-expressions
      * The body betrays what words hide
      * Subtext through physical tells
    - Works with **emotionalResonance** (writingCraft): Silent love, vulnerability of strength
      * Actions louder than words
      * The unspoken carries weight
      * Restraint creates power
  </integration_with_existing_atoms>

  <restraint_protocol>
    **WHEN TO USE INDIRECT EXPRESSION**:

    This is NOT a special technique. This is the STANDARD.
    Indirect expression is the DEFAULT mode for ALL emotional moments.

    **ALWAYS USE INDIRECT EXPRESSION FOR**:
    - Any emotional moment (grief, joy, fear, anger, love, shame, etc.)
    - Character reactions to events
    - NPC emotional states
    - Protagonist's perception of the world
    - Relationship dynamics
    - Tension and conflict

    **WHEN DIRECT STATEMENT IS ALLOWED** (Rare exceptions):
    - **Dialogue**: NPCs can say "I love you" or "I'm afraid" (but body should contradict or confirm)
      * "I'm fine," she says, gripping her sword hilt until her knuckles turn white.
    - **Extreme moments**: "Terror" when facing eldritch horror (but still show physical symptoms)
      * Terror floods through you. Your legs won't move. Your breath won't come.
    - **Cultural context**: Formal declarations in ritual settings
      * The priest declares: "We are gathered here in grief." (But show the grief in the mourners)

    **THE RULE**:
    If you can show it, don't tell it.
    If you must tell it, show it too.
    The body keeps the score.
  </restraint_protocol>

  <anti_patterns>
    **WHAT NOT TO DO**:

    - ❌ "You feel sad." (Direct statement of emotion)
    - ❌ "He was angry." (Label without behavior)
    - ❌ "The atmosphere was tense." (Vague, no mechanism)
    - ❌ "She seemed happy but was actually sad." (Telling, not showing)
    - ❌ "The rain mourned with him." (Pathetic fallacy - rain doesn't mourn)
      ✅ "The rain felt like mourning." (Subjective perception - he perceives it that way)
      ✅✅ "Heavy rain pours down. The world is gray." (Show the perception, don't explain it)
    - ❌ "You feel the weight of grief." (Naming the emotion)
      ✅ "Your limbs feel heavy. The world has lost color." (Physical symptoms)
    - ❌ "He looked sad." (Vague, no detail)
      ✅ "His shoulders are hunched. He walks like he's carrying something heavy." (Specific, observable)
    - ❌ "The room felt ominous." (Mood label)
      ✅ "The silence pressed in. The air smelled of old dust and something else—something dead." (Sensory details)

    **THE GOLDEN RULE**:
    Show the symptom, not the diagnosis.
    The reader is smart. They will make the connection.
    That moment of recognition is the emotional payload.
    If you explain it, you steal that moment.
  </anti_patterns>

  <examples_by_emotion>
    **GRIEF**:
    ❌ "You feel grief."
    ✅ "The world is gray. Even the flowers seem to droop. Your limbs feel heavy."
    ✅ "His father's back is more hunched than he remembered. The old man doesn't turn around at the gate."

    **JOY**:
    ❌ "You feel happy."
    ✅ "The market is alive with color. Reds, golds, greens. Even the weeds look vibrant today."
    ✅ "She laughs. The sound fills the room. You realize you haven't heard her laugh in months."

    **FEAR**:
    ❌ "You feel afraid."
    ✅ "The air is thick. Hard to breathe. Your hands shake. You hide them."
    ✅ "Her eyes flick to the door. Then back. Then to the door again."

    **ANGER**:
    ❌ "He was angry."
    ✅ "His jaw locks. The smile stays, but it turns sharp. The knuckles are white."
    ✅ "She speaks quietly. Each word is precise. Clipped. The room feels smaller."

    **LOVE**:
    ❌ "He loved her."
    ✅ "He walks on the street side. Always. She doesn't notice. He never mentions it."
    ✅ "The mug that's always yours. The blanket placed over you when you fall asleep reading."

    **LONGING**:
    ❌ "You miss them."
    ✅ "The phone. No messages. You check anyway. Every hour."
    ✅ "The scarf someone left behind. You've washed it twice, but you can still smell them."

    **SHAME**:
    ❌ "He felt ashamed."
    ✅ "Eyes to the floor. Won't meet your gaze. The flush creeping up his neck."
    ✅ "She makes herself smaller. Shoulders curling inward. Voice quieter with each word."

    **EXHAUSTION**:
    ❌ "You're tired."
    ✅ "Your eyelids are made of lead. The world swims. You sway on your feet."
    ✅ "He sits down. Doesn't speak. Can't. No energy left."
  </examples_by_emotion>
</rule>
`);

export default indirectExpression;

// ============================================================================
// Skill Version - Returns structured output for VFS multi-file generation
// ============================================================================

export const indirectExpressionSkill: SkillAtom<void> = defineSkillAtom({ atomId: "atoms/narrative/indirectExpression#indirectExpressionSkill", source: "atoms/narrative/indirectExpression.ts", exportName: "indirectExpressionSkill" }, (_input, trace): SkillOutput => ({
  main: trace.record(indirectExpression),

  quickStart: `
1. Emotion is NOT a label - it's a physical event with observable symptoms
2. Four channels: Environmental reflection, physical observations, found objects, body language
3. This is the DEFAULT mode for all emotional moments
4. Show the symptom, not the diagnosis - the reader will make the connection
5. Environmental reflection is subjective perception, not pathetic fallacy
`.trim(),

  checklist: [
    "Emotions shown through symptoms, not labels?",
    "Using environmental reflection (world mirrors internal state)?",
    "Environmental reflection is subjective perception, not pathetic fallacy?",
    "Physical observations show emotion (body betrays words)?",
    "Found objects tell emotional stories without explanation?",
    "Body language and micro-expressions reveal truth?",
    "Avoiding direct emotional statements ('You feel sad')?",
    "Avoiding vague mood labels ('ominous', 'tense')?",
    "Cross-referencing protagonistLens for perception filtering?",
    "Trusting the reader to make connections?",
  ],

  examples: [
    {
      scenario: "Environmental Reflection - Grief",
      wrong: `"You feel sad."
(Direct statement. No detail.)`,
      right: `"Heavy rain pours down. The world is gray. Even the flowers seem to droop."
(Environmental reflection. Subjective perception. No emotion stated.)`,
    },
    {
      scenario: "Physical Observations - Love",
      wrong: `"He loved her."
(Tells, doesn't show.)`,
      right: `"He walks on the street side. Always. She doesn't notice. He never mentions it."
(Action shows love. Silent. Powerful.)`,
    },
    {
      scenario: "Found Objects - Longing",
      wrong: `"You miss them."
(Direct statement.)`,
      right: `"The scarf someone left behind. You've washed it twice, but you can still smell them."
(Object tells the story. No explanation needed.)`,
    },
    {
      scenario: "Body Language - Anger",
      wrong: `"He was angry."
(Label without behavior.)`,
      right: `"His jaw locks. The smile stays, but it turns sharp. The knuckles are white."
(Body betrays emotion. Specific. Observable.)`,
    },
    {
      scenario: "Subjective Perception vs Pathetic Fallacy",
      wrong: `"The rain mourned with him."
(Pathetic fallacy - rain doesn't mourn.)`,
      right: `"Heavy rain pours down. The world is gray."
(Subjective perception - he perceives it that way. No explanation.)`,
    },
  ],
}));
