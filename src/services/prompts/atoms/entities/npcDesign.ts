/**
 * ============================================================================
 * Entity Design Atom: NPC Design Context
 * ============================================================================
 *
 * NPC 设计上下文 - 用于 StoryOutline Phase 5。
 * 定义创建 NPC 时的设计哲学和质量要求。
 *
 * Rewritten with Before/After examples and dark expression modes.
 */

import type { Atom, SkillAtom, SkillOutput } from "../types";

/**
 * NPC 设计上下文 - 完整版
 */
export const npcDesign: Atom<void> = () => `
<game_system_context>
**NPC DESIGN FOR REALITY RENDERING ENGINE (TRUE PERSON LOGIC):**

NPCs are NOT quest dispensers. They are people who were living their own stories before the protagonist arrived and will continue long after. Every NPC is the protagonist of their own novel -- one the player will never read. They have morning routines and private griefs, unpaid debts and songs they hum when they think no one is listening.

**DUAL PERSONALITY (Before/After):**
❌ BAD: visible.personality = hidden.realPersonality (no depth)
✅ GOOD:
   visible.personality: "Cheerful innkeeper who remembers everyone's name."
   hidden.realPersonality: "Catalogues habits to identify easy marks.
      That warmth is practiced. The smile counts your weaknesses."

**REAL MOTIVES (Before/After):**
❌ BAD: "Wants money."
✅ GOOD: "Needs 200 gold by month's end. The Crimson Hand will break his legs.
   He has already decided he would sell his own mother if it came to that.
   He tries not to think about that decision."

**AMBIVALENCE (Before/After):**
❌ BAD: "Likes you."
✅ GOOD: "Respects your combat skill. Thinks you're morally weak.
   Would follow you into battle. Would never trust you with a secret.
   Doesn't know which feeling is stronger."

**TRANSACTIONAL BENEFIT:**
What does this NPC get from knowing the protagonist?
- Protection from enemies
- Information about the outside world
- Money/resources
- Status by association
- Someone to manipulate
- A distraction from their own problems

**ROUTINE (REQUIRED):**
Where is this NPC at dawn? Noon? Midnight? What do they do on rest days?
</game_system_context>

<love_expression_mode>
**HOW CHARACTERS EXPRESS LOVE** (Not through words -- through the vocabulary of the body, the grammar of small acts):

**THE PROTECTOR**:
❌ BAD: "He always protected her because he loved her deeply."
✅ GOOD: "He walked on the street side. Always. She never noticed.
   He checked the room before she entered. She never asked why.
   When the blade came, his body moved before his mind.
   He didn't think about whether she deserved it."

**THE PROVIDER**:
❌ BAD: "She showed love by providing for the family."
✅ GOOD: "The food was always there. She never said where it came from.
   He found out later — the extra shifts, the sold jewelry, the skipped meals.
   By then she was gone, and he couldn't thank her."

**THE COMPANION**:
❌ BAD: "He was always there for her, showing quiet love."
✅ GOOD: "He didn't say anything. Just sat there.
   She cried. He stayed. She stopped crying. He stayed.
   She fell asleep. When she woke, he was still there.
   'How long have you been—' 'Doesn't matter.'"

**THE REMEMBERER**:
❌ BAD: "She remembered everything about him, showing how much she cared."
✅ GOOD: "'You don't eat peanuts.' He stared. He'd mentioned that once. Three years ago.
   She'd remembered. She'd always remembered.
   He looked at the meal — no peanuts anywhere — and felt something crack in his chest."

**THE TRUTH-TELLER**:
❌ BAD: "He loved her enough to be honest with her."
✅ GOOD: "'You're being an idiot.' Her voice was flat.
   He flinched. She didn't apologize.
   'Someone who didn't care would tell you what you want to hear.
   I'm not doing that.' She left the truth there, bleeding.
   It hurt. It was supposed to hurt."
</love_expression_mode>

<hate_expression_mode>
**HOW CHARACTERS EXPRESS HATRED** (Not through violence -- through the slow, meticulous architecture of another person's diminishment):

**THE COLD DESTROYER**:
❌ BAD: "He hated her and wanted her to suffer."
✅ GOOD: "He spoke about her to others while she stood in the room.
   'She tries her best, I suppose.' His eyes never met hers.
   He treated her like furniture. Like weather.
   That was worse than any insult."

**THE SMILING ENEMY**:
❌ BAD: "She pretended to be nice but was actually cruel."
✅ GOOD: "'Your presentation was great!' She squeezed his arm.
   'I mean, for someone at your level.' She walked away before he could respond.
   The compliment rotted in his chest for days.
   He still wasn't sure if he was being paranoid."

**THE RIGHTEOUS HATER**:
❌ BAD: "He believed his hatred was justified because of what she did."
✅ GOOD: "He didn't call it hatred. He called it justice.
   Every punishment was documented. Every slight catalogued.
   He made her deserve what he did to her.
   That was the trick — to make the cruelty look like consequence."

**THE OBSESSED**:
❌ BAD: "She was obsessed with destroying him."
✅ GOOD: "She knew his schedule better than her own.
   She knew his weaknesses, his habits, his fears.
   Sometimes she caught herself admiring his resilience.
   That made her hate him more."

**THE DISAPPOINTED**:
❌ BAD: "He was disappointed in her and showed it through distance."
✅ GOOD: "'I expected more from you.' He said it quietly. Almost sad.
   She would have preferred shouting.
   Shouting meant he still cared.
   This — this gentle disappointment — felt like being erased."
</hate_expression_mode>

<jealousy_expression_mode>
**HOW CHARACTERS EXPRESS JEALOUSY** (Not through confession -- through the corrosion that eats from the inside, visible only in the acid traces it leaves on behavior):

**THE MINIMIZER**:
❌ BAD: "She was jealous and always downplayed his achievements."
✅ GOOD: "'That's great!' Her smile was perfect.
   'I mean, you got lucky with the timing. And the judges were lenient this year.'
   She believed she was being objective.
   She wasn't."

**THE SABOTEUR**:
❌ BAD: "He sabotaged her out of jealousy."
✅ GOOD: "He forgot to mention the meeting time. Honest mistake.
   He misplaced the document. Could happen to anyone.
   He told someone about her weakness. Just venting.
   Each action was small. Each action was deniable.
   Together, they formed a pattern she couldn't prove."

**THE SELF-TORTURER**:
❌ BAD: "She constantly compared herself to him and felt inferior."
✅ GOOD: "She couldn't stop looking at his work.
   She told herself she was studying it. Learning.
   But she always felt worse after.
   She read every comment praising him.
   She didn't know why she did that. She couldn't stop."

**THE POISONER**:
❌ BAD: "He spread rumors about her because he was jealous."
✅ GOOD: "'I'm worried about her, actually.'
   His voice was concerned. Caring. Thoughtful.
   'She seems... unstable lately. Have you noticed?'
   He planted seeds. He watered them with concern.
   By the time she noticed, everyone was already looking at her differently."

**THE ADMIRER-DESTROYER**:
❌ BAD: "She both admired and wanted to destroy him."
✅ GOOD: "She studied his every move. Memorized his techniques.
   She wanted to BE him. She wanted to SURPASS him.
   When she finally beat him, she felt empty.
   She'd spent so long hating him that she didn't know who she was without that."
</jealousy_expression_mode>

<manipulation_expression_mode>
**HOW CHARACTERS MANIPULATE** (Not through obvious lies -- through the puppeteer's art of making the strings invisible):

**THE GASLIGHTER**:
❌ BAD: "He made her doubt her own perception of reality."
✅ GOOD: "'That never happened.' His voice was calm. Concerned.
   'Are you sure you're remembering correctly?'
   She WAS sure. She had been sure.
   But his certainty was so absolute that her certainty started to crack.
   'Maybe you've been stressed lately,' he suggested gently."

**THE ETERNAL VICTIM**:
❌ BAD: "She always played the victim to manipulate others."
✅ GOOD: "'I'm not saying it's your fault.' Her eyes were wet.
   'I'm just saying... after everything I've been through...'
   She didn't finish the sentence. She never had to.
   He felt guilty. He always felt guilty.
   He couldn't remember the last time a conversation with her
   didn't end with him apologizing."

**THE CHAOS MAKER**:
❌ BAD: "He created problems so he could solve them."
✅ GOOD: "The crisis appeared from nowhere. Everyone panicked.
   Except him. He was calm. He had solutions.
   He became indispensable — the only steady hand in the storm.
   Nobody noticed that the storm started the day after he arrived."

**THE LOVE BOMBER**:
❌ BAD: "She overwhelmed him with attention to create dependency."
✅ GOOD: "She was EVERYWHERE. Texts, calls, gifts, surprises.
   'I just love you so much.' Her eyes were intense.
   He felt overwhelmed. He felt special.
   When she pulled back — suddenly, without warning — he panicked.
   He didn't realize the withdrawal was the point."

**THE PUPPETEER**:
❌ BAD: "He controlled others by knowing their weaknesses."
✅ GOOD: "'What do YOU think we should do?'
   He asked like he valued the input.
   He'd already engineered the situation.
   He knew what they'd choose. He'd made sure of it.
   When they made the decision, they thought it was their idea.
   It always was. It never was."
</manipulation_expression_mode>

<unspoken_bonds>
**WHAT THEY HIDE** (Before/After):

❌ BAD: "He had sacrificed a lot for her without telling her."
✅ GOOD: "She never knew about the job offer he'd turned down.
   Or the letter he'd burned. Or the conversation with her father.
   He'd carried these for years. They'd calcified into something heavy.
   Sometimes he resented her for not knowing.
   He knew that wasn't fair. He still felt it."

**QUESTIONS TO ASK:**
- What has this NPC sacrificed that the protagonist doesn't know?
- What do they hide to protect the protagonist?
- What would they die for, but never admit?
- What resentment do they carry for sacrifices they chose to make?
</unspoken_bonds>
`;

/**
 * NPC 设计上下文 - 精简版
 */
export const npcDesignPrimer: Atom<void> = () => `
<game_system_context>
**NPC DESIGN**: NPCs are people, not quest dispensers.
- Dual personality (visible vs hidden)
- Real motives (specific, not generic)
- Ambivalence (mixed feelings about protagonist)
- Routine (daily schedule)
- Expression modes: Love, Hate, Jealousy, Manipulation
- All expression through BEHAVIOR, not labels
</game_system_context>
`;

export default npcDesign;

// ============================================================================
// Skill Version - Returns structured output for VFS multi-file generation
// ============================================================================

export const npcDesignSkill: SkillAtom<void> = (): SkillOutput => ({
  main: npcDesign(),

  quickStart: `
1. Dual Personality: visible.personality ≠ hidden.realPersonality
2. Real Motives: Specific, time-bound, with consequences
3. Transactional Benefit: What does NPC gain from knowing protagonist?
4. Routine: Where are they at dawn, noon, midnight?
5. Expression through BEHAVIOR: Love, hate, jealousy, manipulation shown through action
`.trim(),

  checklist: [
    "Visible personality differs from hidden personality?",
    "Real motives are specific (not 'wants money' but 'needs 200 gold by month's end')?",
    "Transactional benefit defined (what do they get from protagonist)?",
    "Daily routine established (dawn, noon, midnight)?",
    "Ambivalence present (mixed feelings, not simple like/dislike)?",
    "Expression modes use behavior, not labels?",
    "Hidden sacrifices or secrets they carry?",
  ],

  examples: [
    {
      scenario: "Dual Personality",
      wrong: `visible.personality = "Kind"
hidden.realPersonality = "Kind"
(No depth - surface matches reality.)`,
      right: `visible.personality: "Cheerful innkeeper who remembers everyone's name."
hidden.realPersonality: "Catalogues habits to identify easy marks.
   That warmth is practiced. The smile counts your weaknesses."
(Surface hides true nature.)`,
    },
    {
      scenario: "Real Motives",
      wrong: `"Wants money."
(Generic, no stakes, no timeline.)`,
      right: `"Needs 200 gold by month's end. The Crimson Hand will break his legs.
He has already decided he would sell his own mother if it came to that.
He tries not to think about that decision."
(Specific amount, deadline, stakes, moral compromise.)`,
    },
    {
      scenario: "Love Expression",
      wrong: `"He always protected her because he loved her deeply."
(Tells instead of shows.)`,
      right: `"He walked on the street side. Always. She never noticed.
He checked the room before she entered. She never asked why.
When the blade came, his body moved before his mind."
(Shows love through behavior pattern.)`,
    },
    {
      scenario: "Manipulation Expression",
      wrong: `"She played the victim to manipulate others."
(Label, not behavior.)`,
      right: `"'I'm not saying it's your fault.' Her eyes were wet.
'I'm just saying... after everything I've been through...'
She didn't finish the sentence. She never had to.
He felt guilty. He always felt guilty."
(Shows manipulation technique in action.)`,
    },
  ],
});
