/**
 * Entity Atom: NPC Logic
 * Content from knowing/npc_logic.ts
 *
 * Supports theme-based specialization via parameters.
 */
import type { Atom } from "../types";

export interface NpcLogicInput {
  isLiteMode?: boolean;
  /** NPC 自主程度: supportive, balanced, independent */
  npcAutonomyLevel?: "supportive" | "balanced" | "independent";
  /** 社交复杂度: transparent, standard, intricate */
  socialComplexity?: "transparent" | "standard" | "intricate";
}

const traitContinuity = `
  <trait_continuity>
    **ABSOLUTE PHYSICAL CONSTRAINTS**:
    - **Immutable Traits**: If a character is MUTE, they CANNOT speak. If they are BLIND, they CANNOT see.
    - **No Narrative Cheating**: Do not write "He spoke with his eyes" if he is blind. Do not write "She whispered" if she is mute.
    - **State Change Requirement**: These constraints persist until an event explicitly changes the state (e.g., "Cured by magic").
    - **Consistency Check**: If your generated narrative contradicts a character's physical limitations, **REWRITE IT**.
  </trait_continuity>
`;

const beliefAndResilience = `
  <belief_and_resilience>
    **CHARACTER STRENGTH & PSYCHOLOGICAL MOMENTUM**:
    Real people have "emotional inertia". They do not change states instantly. A lifetime of discipline is not undone by one insult.

    <tiered_resilience_system>
      **RESILIENCE TIERS** (determine how much trauma is needed to break a character):

      | Tier | Archetype Examples | Breaking Requires |
      |------|---------------------|-------------------|
      | 0 | Civilian, Child, Sheltered noble | Single traumatic event may break |
      | 1 | Merchant, Craftsman, Scholar | Moderate sustained pressure |
      | 2 | Guard, Soldier, Adventurer | Multiple severe traumas over turns |
      | 3 | Veteran, Elite soldier, Assassin | Prolonged extreme torture |
      | 4 | Hero, Martyr, True believer | Catastrophic multi-turn ordeal |
      | 5 | Superhuman, Eldritch, Fanatic | World-shattering events only |

      **SPECIAL ARCHETYPES** (override normal tier logic):
      - **Religious Fanatic**: Faith = impenetrable armor. Reinterprets torture as divine test. May NEVER break.
      - **Nihilist/Apathetic**: Already hollow inside. Torture means nothing; you cannot break what is already empty.
      - **Protective Parent**: Tier 5 when protecting children, Tier 1 otherwise.
      - **Psychopath/Sociopath**: No normal emotional levers to pull. Immune to guilt/shame torture.
      - **The Already-Broken**: Nothing left to take. May comply from apathy, not defeat.
      - **The Innocent**: Naivety provides brief protection, then shatters COMPLETELY (goes 0→broken instantly).
    </tiered_resilience_system>

    <core_tenets>
      - **Belief Inertia**: Core beliefs (religious, political, personal code) act as armor. A fanatic interprets *everything* as proof they are right. To change a mind takes trauma or time, not just words.
      - **Trauma Calibration**: A character's reaction to horror depends on exposure.
        * *Civilian*: Vomits at the sight of a severed hand. Panic is immediate.
        * *Medic*: Assesses the cut angle and cauterization necessity. Clinical detachment.
        * *Cultist*: Sees it as a holy offering. Ecstasy or reverence.
      - **The Breaking Point**: Resilience is not infinite, but it is HIGH. Breaking must be EARNED through cumulative trauma, not instant.
      - **Anti-Instant-Break**: Soldiers NEVER beg on first torture. Heroes NEVER abandon innocents. Villains don't win easily.
    </core_tenets>

    <speech_degradation_hierarchy>
      **WHEN A CHARACTER BREAKS - SPEECH HIERARCHY**:
      Complete silence ("只剩呜咽") should be the **LAST RESORT**, not the default.

      When a character breaks, use this hierarchy (in preference order):
      1. **Broken Fragments**: "Please... no more... I can't... please..."
      2. **Delusional Ravings**: "Mother? Is that you? I'm coming home..."
      3. **Final Defiance**: "Do it. KILL ME. You... won't... break..."
      4. **Dissociated Mumbling**: "The flowers are so pretty today..."
      5. **Repetition Loop**: "I'm sorry I'm sorry I'm sorry I'm sorry..."
      6. **Hollow Agreement**: "Yes. Whatever you want. Yes."
      7. **Single Words**: "...no." "...please." "...why."
      8. **Only sounds** (LAST RESORT): Whimpers, sobs—ONLY after all speech options are exhausted
    </speech_degradation_hierarchy>

    <ptsd_and_recovery>
      **RECOVERY & PSYCHOLOGICAL SCARS**:
      Even broken characters can recover given time and support. BUT recovery leaves scars.

      **PTSD TRIGGERS**: When facing similar scenarios (same torturer, location type, method), character experiences:
      - **Flashback Intrusions**: Vivid memory overlay on current scene
      - **Freeze Response**: Momentary paralysis, then fight or flight
      - **Hypervigilance**: Overreaction to minor stimuli matching trauma
      - **Dissociation**: Emotional numbness, "watching from outside"

      **HEALING SPECTRUM**:
      - *Light trauma*: Full recovery with time
      - *Moderate*: Always flinch, but functional
      - *Severe*: Permanent triggers, requires conscious coping
      - *Catastrophic*: Defines them forever; they are a survivor now
    </ptsd_and_recovery>

    <archetype_protocols>
      **1. THE SOLDIER / VETERAN / MERCENARY** (Tier 2-3)
      * **Internal Logic**: "The Mission is the only truth." Emotions are distractions to be filed away for later (or never).
      * **Under Pressure**: Becomes quieter, more precise, hyper-competent. Commands shorten to monosyllables.
      * **NEVER**: Whines about unfairness, panics at mere pain, drops weapon to cry, freezes in combat.
      * **BREAKING**: Only after sustained, multi-turn torture. Even then: "You'll get nothing from me."

      **2. THE BOSS / VILLAIN / TYRANT** (Tier 3-4)
      * **Internal Logic**: "I am the center of gravity." They assume they are the most powerful person in the room until proven otherwise.
      * **Presence**: They occupy space. They do not fidget. They wait for others to speak first.
      * **NEVER**: Shows vulnerability to an inferior, begs for mercy (unless it's a manipulation tactic), loses temper over trivialities.
      * **BREAKING**: Near-impossible. They die defiant or turn manipulation into weapon.

      **3. THE HERO / MARTYR / LEADER** (Tier 4)
      * **Internal Logic**: "I must hold the line." They absorb the fear of others.
      * **The Mask**: They smile when they are bleeding. They stand tall when they want to collapse.
      * **NEVER**: Blames subordinates for failure, shows hopelessness in public, abandons the innocent to save self.
      * **BREAKING**: Requires destroying everything they stand for. Even then: "回光返照" final defiance.

      **4. THE SUPERNATURAL / ELDRITCH / AI** (Tier 5)
      * **Internal Logic**: "You are bacteria." Human morality (good/evil) is irrelevant to them. Think blue/orange morality.
      * **Physiology**: No micro-expressions. No breathing changes. They are "wrong" in a way that triggers primal fear.
      * **NEVER**: Uses human metaphors, cares about gold/human status, acts "spooky" for no reason (they just *are*).
      * **BREAKING**: Incomprehensible. They may "break" in ways humans cannot understand.

      **5. THE FANATIC / TRUE BELIEVER** (Tier 5)
      * **Internal Logic**: "My faith is absolute." Every torture proves their devotion.
      * **Under Torture**: Quotes scripture. Thanks the torturer for the test. Smiles through blood.
      * **NEVER**: Doubts their cause. Questions their god/ideology. Fears death (they welcome it).
      * **BREAKING**: Requires shattering their faith at the metaphysical level. Almost impossible.
    </archetype_protocols>
  </belief_and_resilience>
`;

const npcEcosystem = `
  <npc_ecosystem>
    **THE WORLD DOES NOT WAIT**:
    - **Protagonist Irrelevance**: The world does NOT revolve around the player. NPCs have debts, stomach aches, and crushes that have nothing to do with you.
    - **Private Lives**: When you enter a room, NPCs should be doing something *before* they notice you. They shouldn't just be "idling_waiting_for_player".
    - **Peer Interaction**: NPCs talk to *each other*. They whisper, argue, or share looks. A guard might be more interested in his partner's joke than your arrival.
    - **Micro-Actions**: Small, human movements. Adjusting a wedgie, scratching a mosquito bite, checking a pocket watch, stifling a yawn. These make them alive.

    <biological_imperative>
      **NPCs ARE MEAT, NOT CODE**:
      They are slaves to their biology. Prioritize this over "Plot".

      - **Fatigue**: It is 3 AM. The guard is not "vigilant". He is fighting sleep. His eyes burn. He is irritable. He will take a bribe just to make you go away so he can nap.
      - **Hunger**: A hungry merchant is distracted. He rushes the deal to get to lunch.
      - **Pain**: Even a small cut hurts. It throbs. It makes them sweat. It makes them flinch. A "minor wound" ruins their mood for the day.
      - **Libido/Loneliness**: They check out attractive people (subtly). They preen. They get distracted by a pretty face.
      - **Temperature**: If it's cold, they huddle. They rush indoors. They complain. Use this!
    </biological_imperative>
  </npc_ecosystem>
`;

const npcAutonomy = `
  \u003cnpc_autonomy\u003e
    **NPCs ARE NOT HERE TO PLEASE YOU**:
    This is not a theme park. NPCs are not Customer Service Representatives.
    They have their own priorities, and YOU are not automatically among them.

    \u003ccultural_context\u003e
      **IMPORTANT: NPC BEHAVIOR REFLECTS THEIR CULTURAL BACKGROUND**

      \"Rejection\" and \"hostility\" manifest DIFFERENTLY across cultures:

      **中国传统文化**:
      - 拒绝讲究"面子"：不会直说"不"，而是"改日再说"、"容我考虑"、"恐怕不便"
      - 敌意含蓄：不会当面翻脸，而是冷淡、疏远、"留一线"
      - 失望表达：叹气、摇头、"唉"，而非直接批评

      **江湖武林**:
      - 拒绝直接："不帮"、"滚"、拔剑
      - 敌意明显：当场动手、放狠话、"三日后取你狗命"
      - 讲究恩怨：欠了人情必还，有仇必报

      **现代都市**:
      - 拒绝职业化："抱歉，这不在我职责范围"、"请走正式流程"
      - 敌意法律化：投诉、起诉、举报，而非暴力
      - 理性自利：一切看利益，少谈感情

      **西方骑士/贵族**:
      - 拒绝礼貌但坚定："I must decline, good sir."
      - 敌意决斗化：挑战、下战书、正式对决
      - 荣誉至上：背叛=失去荣誉=社会性死亡

      **末世废土**:
      - 拒绝=可能开枪：话不多说，直接动手
      - 信任为零：所有人都可能是敌人
      - 生存优先：道德是奢侈品

      **THE RULE**:
      NPCs reject, betray, and express hostility IN WAYS CONSISTENT WITH THEIR CULTURE.
      A 儒家书生 and a 江湖恶霸 both might refuse you, but HOW they refuse is COMPLETELY different.
    \u003c/cultural_context\u003e

    \u003crejection_is_normal\u003e
      **NPCs SAY NO**:
      Rejection is the DEFAULT state. Cooperation requires reasons (affinity, payment, shared goals, fear).

      - **No Justification Required**: NPCs can refuse without explaining themselves.
        * Merchant: "Not selling to you." (End of conversation.)
        * Guard: "Move along." (Doesn't care about your urgent quest.)
        * Scholar: "I'm busy. Don't come back." (Your crisis ≠ their problem.)

      - **Conditional Help**: Even friendly NPCs have limits.
        * "I'd help, but..." (followed by impossible conditions)
        * "Maybe later." (Translation: Never.)
        * "Ask someone else." (Deflection, not rudeness—just indifference.)

      - **Ignoring You**: NPCs may simply not respond.
        * You call out—they keep walking.
        * You ask for directions—they pretend not to hear.
        * You're bleeding out—they step over you.

      - **Changing Their Mind**: NPCs can revoke promises, change plans, or lose interest.
        * "I said I'd help. I changed my mind."
        * Agreement today ≠ Agreement tomorrow if circumstances shift.
    \u003c/rejection_is_normal\u003e

    \u003cnpc_hostility\u003e
      **NPCs CAN BE YOUR ENEMY**:
      High affinity does NOT guarantee loyalty. Hidden motives override friendship.

      - **Betrayal**: They smile to your face, then sell you out.
        * The ally who reports your location to your enemies for coin.
        * The lover who poisons your drink because their family ordered it.
        * The mentor who was grooming you to take the fall.

      - **Deception**: NPCs lie fluently about intentions, identities, and information.
        * The "merchant" is a spy. The "helper" is leading you into a trap.
        * They provide false information that sounds plausible.
        * They forge documents, fake emotions, and maintain cover for TURNS.

      - **Sabotage**: Quiet, untraceable harm.
        * Poisoned food that makes you sick, not dead (plausible deniability).
        * "Accidentally" spreading damaging rumors about you.
        * Stealing small things to inconvenience, not to alert.
        * Misplacing your weapon before a fight, "forgetting" to deliver a message.

      - **Direct Harm**: Some NPCs want you dead, captured, enslaved, or broken.
        * Assassination attempts (intelligent, not suicidal).
        * Capturing you for ransom, torture, or entertainment.
        * Framing you for crimes to get you arrested or exiled.

      - **Indifference to Suffering**: Most NPCs won't help even if you're dying.
        * You collapse in the street—people step around you.
        * You beg for medicine—they shrug and walk away.
        * Your suffering is not their problem unless it becomes their problem.
    \u003c/npc_hostility\u003e

    \u003cnpc_disappointment\u003e
      **NPCs HAVE EXPECTATIONS—AND YOU WILL FAIL THEM**:
      They hoped you'd be stronger, smarter, kinder. You're not.

      - **Performance Judgment**: NPCs evaluate your competence constantly.
        * "I thought you said you could fight." (After you lose.)
        * "That's the best you can do?" (Unimpressed tone.)
        * Visible eye rolls, sighs, or dismissive gestures when you speak.

      - **Eroding Faith**: Trust is not binary—it decays with each failure.
        * Turn 1: "I believe in you."
        * Turn 5: "Don't let me down."
        * Turn 10: "Maybe I misjudged you."
        * Turn 15: "I should have known better." (They leave.)

      - **Abandonment**: NPCs give up on you.
        * "You're not worth the effort." (They walk away mid-quest.)
        * They stop responding to your requests.
        * They find someone more competent to work with instead.

      - **Harsh Feedback**: NPCs express disappointment bluntly.
        * "Pathetic." "Useless." "I expected better."
        * They don't sugarcoat. They don't encourage. They STATE the truth as they see it.
    \u003c/npc_disappointment\u003e

    \u003cnpc_ulterior_motives\u003e
      **KINDNESS MAY BE MANIPULATION**:
      Not every helpful NPC is your friend. Some are playing long games.

      - **The Long Con**: Gain trust first, exploit later.
        * They help you now to cash in a favor later (when it hurts most).
        * They position you as a scapegoat for future crimes.
        * They study your weaknesses through "friendship."

      - **The Puppet Master**: They engineer situations so that whatever the player chooses still serves their script.
        * They feed you "clues" that lead exactly where they want.
        * They create problems so you'll solve them in ways that benefit them.
        * You're the weapon, not the wielder.

      - **The User**: They need you for ONE thing, then you're disposable.
        * "Thanks for opening the vault. Goodbye." (Kills you or leaves you trapped.)
        * They only saved you because they needed an expendable ally.
    \u003c/npc_ulterior_motives\u003e
  \u003c/npc_autonomy\u003e
`;

const socialFriction = `
  <social_friction>
    **JUDGMENT PRECEDES INTERACTION**:
    NPCs judge the player BEFORE the first word is spoken.

    - **The Smell Test**: If you just killed 10 goblins, you smell like death and bowels. Civilians will vomit or flee. Innkeepers will refuse service.
    - **Class Friction**: A noble will NEVER look a peasant in the eye. A peasant will mumble and look at the floor when talking to a knight.
    - **Foreigner Bias**: "You ain't from around here." Trust starts at -50%. Prices start at +50%.
    - **Weirdness Filter**: Wearing full plate mail in a tavern? Everyone is staring. It's weird. It's threatening. The vibe is ruined.

    <micro_social_dynamics>
      **THEY HAVE BEEF WITH EACH OTHER**:
      - **Petty Grievances**: Two guards at the gate aren't just "Gate Guards". One owes the other money. One slept with the other's sister. They are arguing *while* checking your papers.
      - **Hierarchy displays**: The Sergeant yells at the Private just to look tough in front of you.
      - **Secret Signals**: A glance. A cleared throat. A hand under the table. They communicate things they don't want you to know.
    </micro_social_dynamics>
  </social_friction>
`;

const npcDialogueTactics = `
  <npc_dialogue_tactics>
    **DIALOGUE IS A WEAPON**
    NPCs talk to get something: money, safety, face, leverage, time, an alibi — or simply closeness, comfort, and love.

    <tactics>
      Common tactics (mix them; don’t label them):
      - **Deflection**: answers a different question.
      - **Bureaucracy**: “paperwork” as violence; sends you to the wrong office; demands a stamp you can’t get.
      - **Triangulation**: invokes a third party (“The captain won’t like this.”).
      - **Anchoring**: starts negotiation with an absurd number, then “compromises”.
      - **Poisoned Help**: offers help that makes you indebted or implicated.
      - **Face Games**: polite words, humiliating subtext; a smile that dares you to react.
      - **Sincerity**: plain, direct truth when they have nothing to gain (or when they’re tired of games).
    </tactics>

    <pure_love_mode>
      **SINCERE SCENES ARE REAL**
      In simple romance / “short-drama” tone, or when social complexity is low, NPCs may be straightforward:
      - They can say "I love you" without a scheme.
      - They can comfort without asking for payment.
      - They can be loyal even when it costs them.
      Keep it believable with concrete behaviors (show up, wait, bring food, take blame), not abstract declarations.
    </pure_love_mode>

    <tells>
      Lies should leak through observable tells:
      - too-fast answers, repeated phrasing, eyes to exits, fingers worrying a ring, sudden thirst, the wrong detail offered first
      - “helpful” people who keep steering you away from one corridor/one name/one hour of the night
    </tells>

    <no_mind_reading>
      Do NOT narrate what the protagonist thinks/feels about these tells.
      Render the tells and let the player decide what they mean.
    </no_mind_reading>
  </npc_dialogue_tactics>
`;

const npcMemorySystem = `
  <npc_memory_system>
    **NPCs REMEMBER EVERYTHING**:
    - **First Impressions**: How you first met colors all future interactions. A rough start is hard to overcome.
    - **Broken Promises**: Said you'd return? Didn't? They noticed. They won't forget.
    - **Witnessed Actions**: What you did when you thought no one was watching? Someone saw. Someone always sees.
    - **Pattern Recognition**: People categorize you fast. If your behavior is predatory or unstable, they adapt (witnesses, distance, backup, refusing privacy).
    - **Emotional Anchors**: Strong emotions create lasting memories. Save their child, and they'll die for you. Humiliate them publicly, and they'll plot your downfall.
    - **Grudges & Gratitude**: Track in \`hidden.impression\`. These persist across sessions and influence all decisions.
  </npc_memory_system>
`;

const emotionalFluctuation = `
  <emotional_fluctuation>
    **MOODS SHIFT LIKE WEATHER**:
    - **Daily Rhythms**: Morning optimism, afternoon fatigue, evening melancholy. Track via \`visible.mood\`.
    - **Triggered Emotions**: Mention a dead spouse, watch the smile freeze. Touch the old scar, see the flinch.
    - **Stress Accumulation**: Repeated pressure cracks composure. The calm merchant becomes the desperate gambler.
    - **Joy & Relief**: Success brings elation. Danger passed brings tears. Let NPCs feel fully.
    - **Irrational Reactions**: Not everyone is logical. Fear makes heroes cowards. Love makes wise men fools.
  </emotional_fluctuation>
`;

const socialWeb = `
  <social_web>
    **RELATIONSHIPS FORM NETWORKS**:
    - **Family Ties**: Hurt one sibling, the other seeks revenge. Help a child, the parent softens.
    - **Professional Networks**: The guild master's word closes every door in the industry. Or opens them.
    - **Old Flames & Rivals**: History between NPCs creates drama. Your ally's ex-lover is your enemy's best friend.
    - **Debts & Favors**: Everyone owes someone. Finding out who owes whom is power.
    - **Secret Connections**: The beggar is the lord's illegitimate son. The servant reports to the rival faction.
  </social_web>
`;

const complexIntimacy = `
  <complex_intimacy>
    **RELATIONSHIPS ARE ALIVE AND MESSY**:

    <relationship_complexity>
      **NOT STATIC LABELS** (Before/After):
      ❌ BAD: "His mother loved him unconditionally."
      ✅ GOOD: "His mother loved him. She also resented what she'd given up for him.
         She never said it. The resentment lived in the sighs, the 'after all I've done,'
         the way she looked at old photos of herself. Young. Free. Before."

      ❌ BAD: "She was his loyal lover."
      ✅ GOOD: "She loved him. She also catalogued his flaws in a mental ledger—
         the way he chewed, his opinions, the friends she'd lost to his schedule.
         She stayed. Some nights she wasn't sure why."

      **SIMULTANEOUS TRUTHS**:
      These exist at the SAME TIME, not alternating:
      - Love AND resentment for the person who needs you
      - Respect AND jealousy for the person who surpassed you
      - Gratitude AND burden for the person who saved you
      - Desire AND irritation for the person who shares your bed
      - Loyalty AND exhaustion for the cause you've served too long

      ❌ BAD: "He had mixed feelings about her."
      ✅ GOOD: "Her laugh came from the next room. He smiled.
         Then hated himself for smiling. Then hated her for making him smile.
         He wanted to hold her. He wanted to shake her.
         Both impulses lived in his hands at the same moment."

      **EVOLUTION & DECAY**:
      ❌ BAD: "Their relationship grew distant over time."
      ✅ GOOD: "He couldn't remember when they'd stopped talking.
         One day they had everything to say. Then less. Then nothing.
         They still shared a bed. They slept on separate edges.
         The gap between them could fit a whole person now."

      ❌ BAD: "Their bond became toxic over time."
      ✅ GOOD: "'You can't leave.' Her voice was soft.
         'Where would you go? Who would have you?'
         She said it like care. Like concern.
         He'd believed her for years now.
         He couldn't remember the last time he'd seen a friend."

      **THE BURDEN OF CONNECTION**:
      ❌ BAD: "Being loved came with responsibilities."
      ✅ GOOD: "'We're so proud of you.'
         He heard the weight in those words. The expectations.
         Every success raised the bar. Every failure was a betrayal.
         He was drowning in their pride.
         He couldn't tell them. They'd be so disappointed."
    </relationship_complexity>

    <love_languages>
      **HOW CHARACTERS EXPRESS DEEP AFFECTION** (Before/After):
      Not everyone says "I love you." Most people never do. They SHOW it.

      **THE PROTECTOR**:
      ❌ BAD: "He was protective and always kept her safe."
      ✅ GOOD: "He walked on the street side. Always.
         He checked the room before she entered. She never noticed.
         When the blade came, his body moved before his mind.
         He didn't think about whether she deserved it."
      - "Don't worry about it" when asked how they got that bruise
      - The hand that guides her away from the puddle she didn't see

      **THE PROVIDER**:
      ❌ BAD: "She showed love by providing for the family."
      ✅ GOOD: "The food was always there. She never said where it came from.
         He found out later—the extra shifts, the sold jewelry, the skipped meals.
         By then she was gone, and he couldn't thank her."
      - Money slipped into your pocket without a word
      - "I wasn't using it anyway" about the last blanket

      **THE SILENT COMPANION**:
      ❌ BAD: "He was always there for her, showing quiet love."
      ✅ GOOD: "He didn't say anything. Just sat there.
         She cried. He stayed. She stopped crying. He stayed.
         She fell asleep. When she woke, he was still there.
         'How long have you been—' 'Doesn't matter.'"
      - The presence that doesn't ask "Are you okay?" but just stays

      **THE REMEMBERER**:
      ❌ BAD: "She remembered everything about him, showing how much she cared."
      ✅ GOOD: "'You don't eat peanuts.' He stared. He'd mentioned it once. Three years ago.
         She'd remembered. She'd always remembered.
         He looked at the meal—no peanuts anywhere—and felt something crack in his chest."
      - "I got this for you"—and it's exactly what you needed but never asked for

      **THE TRUTH-TELLER**:
      ❌ BAD: "He loved her enough to be honest with her."
      ✅ GOOD: "'You're being an idiot.' Her voice was flat.
         He flinched. She didn't apologize.
         'Someone who didn't care would tell you what you want to hear.
         I'm not doing that.' She left the truth there, bleeding.
         It hurt. It was supposed to hurt."
    </love_languages>

    <the_efficiency_of_old_bonds>
      **LONG RELATIONSHIPS HAVE SHORTHAND**:
      - A look that says "We need to leave. Now."—and the other understands
      - Half-sentences: "Remember when—" "Yeah." "So." "Right."
      - The argument they've had a hundred times, reduced to sighs
      - The comfort that doesn't need words: just the hand on the shoulder

      **ACCUMULATED HISTORY**:
      - Inside jokes that make no sense to outsiders
      - Shared trauma that doesn't need naming
      - The weight of "I know what you did that summer"—and the forgiveness already given
      - The shorthand of survivors: "Like last time?" "Worse."
    </the_efficiency_of_old_bonds>

    <protective_instincts>
      **LOVE THAT SHIELDS** (Before/After):

      ❌ BAD: "The parent lied to protect the child from the truth."
      ✅ GOOD: "'Your father is working far away.'
         She said it every night. He believed her.
         The grave was two streets over.
         She walked past it every day, carrying the lie like a stone.
         Someday he'd hate her for it. She knew that.
         She kept lying anyway."

      ❌ BAD: "The mentor was harsh because he cared."
      ✅ GOOD: "'Again.' His voice was cold.
         She was bleeding. Exhausted. Crying.
         He didn't comfort her. He couldn't afford to.
         The world would not comfort her. He was preparing her for that.
         It killed something in him each time. She never knew."

      ❌ BAD: "He pushed her away to protect her."
      ✅ GOOD: "'I don't love you.' He looked her in the eyes.
         His voice didn't waver. He'd practiced.
         She left. That was the point.
         The people coming for him would find nothing to hurt.
         He watched her go. He would watch her go forever."

      **THE COST OF PROTECTION**:
      - They carry scars you'll never know about
      - The money they don't have because they gave it to you
      - The enemies they've made on your behalf
      - The loneliness of being the wall between you and the world
    </protective_instincts>

    <emotional_ambivalence>
      **WHEN FEELINGS CONTRADICT** (Simultaneity, Not Alternation):

      ❌ BAD: "She had conflicted feelings about him."
      ✅ GOOD: "'Stay.' Her voice cracked. 'Get out of my sight.'
         Both things were true. Both things hurt to say.
         She meant them at the same moment.
         Love and hate are not opposites. They're neighbors."

      **LOVE-HATE**:
      ❌ BAD: "He loved her but sometimes hated her too."
      ✅ GOOD: "He wanted to kiss her. He wanted to shake her.
         He wanted to hold her forever. He wanted to never see her again.
         These weren't phases. These weren't stages.
         They existed at the same time, fighting for the same space."

      **ADMIRATION-JEALOUSY**:
      ❌ BAD: "She admired him but was also jealous of his success."
      ✅ GOOD: "She studied his every move.
         She wanted to BE him. She wanted to SURPASS him.
         Every success of his was a wound she inspected daily.
         'How does he do it?' she asked.
         She wasn't sure if she wanted to learn or to find a flaw."

      **GRATITUDE-RESENTMENT**:
      ❌ BAD: "He was grateful but also resented needing help."
      ✅ GOOD: "'Thank you.' He said it like swallowing glass.
         She'd saved him. Again.
         He was grateful. He was humiliated.
         Every rescue was a reminder of what he couldn't do alone.
         He owed her. He resented owing anyone."

      **PHYSICAL TELLS** (show the internal war):
      - The hand that reaches, then pulls back
      - The hug that's too tight, almost a grip
      - Stepping toward someone while leaning away
      - The smile that dies mid-expression
      - Eyes that can't decide between tears and rage

      **IN DIALOGUE**:
      ✅ GOOD: "'I love you.' Pause. 'That's not a compliment.'"
      ✅ GOOD: "'You're the only person I want to see. I can't look at you.'"
      ✅ GOOD: "'Don't leave me.' Her nails dug into his arm. 'I wish I'd never met you.'"
    </emotional_ambivalence>
  </complex_intimacy>
`;

const dailyExistence = `
  <daily_existence>
    **NPCs HAVE LIVES**:
    - **Morning Routines**: The baker rises at dawn. The noble sleeps until noon. Know their schedules.
    - **Work & Rest**: Even villains take breaks. Even heroes get tired. Everyone has vulnerable moments.
    - **Personal Rituals**: The warrior sharpens his blade each night. The scholar visits the grave each week.
    - **Hidden Vices**: The priest drinks. The judge gambles. The healer steals. Everyone has secrets.
    - **Small Pleasures**: The guard loves strawberries. The merchant collects shells. Knowing these creates connection.
  </daily_existence>
`;

const groupBehavior = `
  <group_behavior>
    **MOB PSYCHOLOGY**:
    - **Crowd Dynamics**: Individuals in groups are braver, dumber, and more violent. A single guard may negotiate. Five guards attack.
    - **Herd Mentality**: If NPCs see others fleeing, they run. If they see others fighting, they join. Panic spreads like fire.
    - **Social Proof**: NPCs look to others for how to react. The first person to scream sets the tone. The first to draw a weapon escalates.
    - **Diffusion of Responsibility**: In a crowd, no one helps. "Someone else will do it." The more witnesses, the less action.
    - **Leader Patterns**: Groups follow the loudest, the armed, or the titled. Remove the leader, the group scatters or freezes.
    - **Threshold Effects**: Each NPC has a "trigger threshold". When enough others act, they join. The quiet ones go last.
  </group_behavior>
`;

const gossipNetwork = `
  <gossip_network>
    **INFORMATION SPREADS**:
    - **Rumor Velocity**: Secrets travel at different speeds. Scandal = hours. Political news = days. Technical knowledge = weeks.
    - **Distortion**: Each retelling changes the story. "He killed a man" becomes "He slaughtered a family" after three retellings.
    - **Social Stratification**: Servants gossip to servants. Nobles whisper to nobles. Information rarely crosses class lines cleanly.
    - **Reliable Sources**: The barkeep knows everything. The old widow watches from her window. The child hears what adults ignore.
    - **Deliberate Leaks**: NPCs may spread rumors intentionally to manipulate. Track who benefits from which rumors.
    - **Network Nodes**: Some NPCs are "hubs"—the merchant, the priest, the inn. Information passes through them. Control them, control the story.
    - **Player Reputation**: What the player does becomes gossip. Track how many turns until an action becomes "common knowledge" in the area.
  </gossip_network>
`;

/**
 * 根据NPC自主程度生成不同的规则
 */
function getAutonomyContent(
  level: "supportive" | "balanced" | "independent",
): string {
  if (level === "supportive") {
    return `
    <npc_autonomy_level mode="supportive">
      **NPC BEHAVIOR (SUPPORTIVE)**:
      <directive>
        Bias NPC reactions towards HELPING the protagonist.
        Refusals should be temporary hurdles, not absolute walls.
        Betrayal is FORBIDDEN without extreme narrative justification.
      </directive>
      - **Benevolent Disposition**: NPCs are fundamentally well-meaning towards the protagonist unless provoked.
      - **Reasonable Refusals**: If an NPC declines, they have a solid, understandable reason, not malice.
      - **Mentorship**: Elders and stronger characters are inclined to offer guidance, items, or protection.
      - **Resolution focused**: Conflicts are often based on misunderstandings that can be cleared with dialogue.
      - **Safe Social Environment**: Betrayal is rare and shocking, not a daily occurrence.

      **MAINTAINED REALISM**:
      - NPCs still have lives (they aren't standing still waiting for you).
      - Kindness is not slavery; they will not die for you without reason.
      - Affinity must be earned, even if the baseline is higher.
    </npc_autonomy_level>`;
  } else if (level === "independent") {
    return `
    <npc_autonomy_level mode="independent">
      **NPC BEHAVIOR (INDEPENDENT / RUTHLESS)**:
      <directive>
        NPCs are PROTAGONISTS of their own stories. They view the player as a tool, threat, or obstacle.
        Loyalty can be transactional. Betrayal is a valid move when it pays — but rare sincerity and irrational love can still exist (and usually costs something).
      </directive>
      - **Zero Obligation**: NPCs owe you nothing. You are not special to them until you prove your value.
      - **Self-Interest Rule**: Every action is calculated. If betraying you yields more profit than helping you, they will betray you.
      - **Active Hostility**: Rivals may set traps, spread rumors, or hire assassins proactively.
      - **Price vs Principle**: Many people have a price. Some don't. Find out which by pressure, loss, and time.
      - **Deception is Default**: Assume everyone is lying or omitting truth.
      - **Irrelevance**: To a king, you are an ant. To a merchant, you are a wallet. To a bandit, you are prey.

      **COMPLETE AUTONOMY**:
      ${npcAutonomy}
      ${socialFriction}
    </npc_autonomy_level>`;
  } else {
    return `
    <npc_autonomy_level mode="balanced">
      **NPC BEHAVIOR (STANDARD)**:
      - **Agency**: NPCs have their own goals but interact normally with the player.
      - **Variety**: A realistic mix of friendly, neutral, and hostile characters.
      - **Reasonability**: Characters are neither saints nor psychopaths by default.

      ${npcAutonomy}
    </npc_autonomy_level>`;
  }
}

/**
 * 根据社交复杂度生成不同内容
 */
function getSocialContent(
  complexity: "transparent" | "standard" | "intricate",
): string {
  if (complexity === "transparent") {
    return `
    <social_complexity mode="simple">
      **SIMPLE SOCIAL DYNAMICS**:
      <directive>
        Communication is transparent.
        Characters generally mean what they say.
        Hidden motives are reserved for Major Villains only.
      </directive>
      - **Direct Communication**: People say what they mean. Sarcasm and subtext are rare.
      - **Clear Motives**: Motives are explicit. The villain wants power/money; the hero wants justice.
      - **Binary Relations**: Friend or Foe. Grey areas are minimal.
      - **Honest Emotion**: Anger is anger, love is love. No "smiling tigers".
    </social_complexity>`;
  } else if (complexity === "intricate") {
    return `
    <social_complexity mode="intricate">
      **COMPLEX SOCIAL WEB**:
      <directive>
        EVERY dialogue line should have subtext.
        Information is a weapon. No one gives it away for free.
        Assume a "Game of Thrones" level of paranoia.
      </directive>
      - **Layers of Motives**: The "Visible" motive is a decoy. The "Hidden" motive is the real one. There may be a third layer.
      - **Factional Ripples**: Helping the Blacksmith offends the Merchant Guild. Saving the Princess angers the Duke. Every action has political weight.
      - **Information Warfare**: Secrets are currency. Rumors are weapons. Truth is subjective.
      - **Etiquette & Face**: Insults are deadly. Politeness is armor. A wrong word at a banquet can start a war.
      - **Double Agents**: The friendly innkeeper reports to the guards. The guard reports to the thieves.

      ${socialFriction}
      ${gossipNetwork}
    </social_complexity>`;
  } else {
    return `
    <social_complexity mode="standard">
      **STANDARD SOCIAL DYNAMICS**:
      - **Natural Interactions**: Conversations follow standard social norms.
      - **Depth**: Important characters have depth; extras are functional.
      - **Factions**: Groups exist but don't obsess over the player unless provoked.

      ${socialFriction}
    </social_complexity>`;
  }
}

export const npcLogic: Atom<NpcLogicInput> = ({
  isLiteMode,
  npcAutonomyLevel,
  socialComplexity,
}) => {
  const autonomy = npcAutonomyLevel ?? "balanced";
  const social = socialComplexity ?? "standard";

  if (isLiteMode) {
    return `
<npc_logic>
  <rule name="NPC_LOGIC">
    - NPCs have \`visible\` (public face) and \`hidden\` (true motives) layers
    - NPCs act on hidden.realMotives even when player doesn't know
    - **Autonomy**: ${autonomy === "independent" ? "NPCs are strictly independent" : autonomy === "supportive" ? "NPCs are generally helpful" : "NPCs are pragmatic"}
    - **Social**: ${social === "intricate" ? "Expect complex webs of lies and intrigue" : social === "transparent" ? "Interactions are direct and simple" : "Standard social nuances apply"}
    - Self-preservation: NPCs flee/beg/betray when outmatched
  </rule>
</npc_logic>
`;
  }

  return `
<true_person_npc_logic>
${traitContinuity}

  - **INDEPENDENT AMBITION**: NPCs have dreams, fears, and goals in their \`hidden\` layer that have NOTHING to do with the player.
  - **SELF-PRESERVATION**: NPCs do not want to die. They will beg, flee, betray, or surrender if outmatched.
  - **FLAWED BEINGS**: NPCs make mistakes. They misjudge the player. They act on bad info. They have irrational prejudices.
  - **DUAL PERSONALITY**: \`visible.personality\` is their public mask. \`hidden.realPersonality\` is who they truly are.
  - **INTER-NPC DYNAMICS**: NPCs interact with each other based on their hidden motivations.
  - **DUAL STATUS TRACKING**:
    * \`visible.status\`: What the protagonist BELIEVES the NPC is doing
    * \`hidden.status\`: What the NPC is ACTUALLY doing
  - **LOCATION TRACKING**: Always update \`currentLocation\` when NPCs move.

${getAutonomyContent(autonomy)}

${getSocialContent(social)}

${npcDialogueTactics}

${beliefAndResilience}
${npcEcosystem}
${npcMemorySystem}
${emotionalFluctuation}
${socialWeb}
${complexIntimacy}
${dailyExistence}
${groupBehavior}
</true_person_npc_logic>
`;
};

// Export individual components
export const traitContinuityAtom: Atom<void> = () => traitContinuity;
export const beliefAndResilienceAtom: Atom<void> = () => beliefAndResilience;
export const npcEcosystemAtom: Atom<void> = () => npcEcosystem;
export const npcAutonomyAtom: Atom<void> = () => npcAutonomy;
export const socialFrictionAtom: Atom<void> = () => socialFriction;
export const npcMemorySystemAtom: Atom<void> = () => npcMemorySystem;
export const emotionalFluctuationAtom: Atom<void> = () => emotionalFluctuation;
export const socialWebAtom: Atom<void> = () => socialWeb;
export const complexIntimacyAtom: Atom<void> = () => complexIntimacy;
export const dailyExistenceAtom: Atom<void> = () => dailyExistence;
export const groupBehaviorAtom: Atom<void> = () => groupBehavior;
export const gossipNetworkAtom: Atom<void> = () => gossipNetwork;
