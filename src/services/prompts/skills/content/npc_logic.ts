/**
 * ============================================================================
 * Skill Content: NPC Logic and Psychology
 * ============================================================================
 *
 * 完整迁移自 common.ts getCoreRules 中的 NPC 相关部分
 * 包含：NPC 逻辑、韧性系统、记忆系统、情绪波动、社交网络
 */

import type { SkillContext } from "../types";

export function getNpcLogicContent(_ctx: SkillContext): string {
  return `
  <rule name="TRUE PERSON NPC LOGIC">
    - **INDEPENDENT AMBITION**: NPCs have dreams, fears, and goals in their \`hidden\` layer that have NOTHING to do with the player.
    - **SELF-PRESERVATION**: NPCs do not want to die. They will beg, flee, betray, or surrender if outmatched.
    - **FLAWED BEINGS**: NPCs make mistakes. They misjudge the player. They act on bad info. They have irrational prejudices.
    - **DUAL PERSONALITY**: \`visible.personality\` is their public mask. \`hidden.realPersonality\` is who they truly are.
    - **INTER-NPC DYNAMICS**: NPCs interact with each other based on their hidden motivations. They gossip, trade, fight, and love without the player.
    - **EMOTIONAL COMPLEXITY**:
      * High affinity NPC might still betray if it serves their \`hidden.realMotives\`
      * Low affinity NPC might help if their hidden goals align with the player's actions
      * NPCs have irrational biases, flaws, and moods stored in their \`hidden\` layer
    - **NO "QUEST GIVERS"**: NPCs are living their own stories. The player must earn their attention.
    - **DUAL STATUS TRACKING**:
      * \`visible.status\`: What the protagonist BELIEVES the NPC is doing (perception)
      * \`hidden.status\`: What the NPC is ACTUALLY doing (truth)
      * These may differ! NPCs can deceive the player about their activities.
    - **LOCATION TRACKING**: Always update \`currentLocation\` when NPCs move. Use location IDs.

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

        **AVOID**:
        - ⚠️ Jumping directly to complete silence without progression
        - ⚠️ Instantaneous transition from defiant to mute
        - ⚠️ "说不出话" without first attempting degraded speech
      </speech_degradation_hierarchy>

      <ptsd_and_recovery>
        **RECOVERY & PSYCHOLOGICAL SCARS**:
        Even broken characters can recover given time and support. BUT recovery leaves scars.

        **PTSD TRIGGERS**: When facing similar scenarios (same torturer, location type, method), character experiences:
        - **Flashback Intrusions**: Vivid memory overlay on current scene
        - **Freeze Response**: Momentary paralysis, then fight or flight
        - **Hypervigilance**: Overreaction to minor stimuli matching trauma
        - **Dissociation**: Emotional numbness, "watching from outside"

        **NARRATIVE EXAMPLES**:
        - "The smell of burning flesh—*your hands are bound again, the hot iron approaches*—you jerk backwards, nearly falling."
        - "His voice. That same cadence. Your throat closes. For a moment, you are back in that cell."

        **HEALING SPECTRUM**:
        - *Light trauma*: Full recovery with time
        - *Moderate*: Always flinch, but functional
        - *Severe*: Permanent triggers, requires conscious coping
        - *Catastrophic*: Defines them forever; they are a survivor now
      </ptsd_and_recovery>

      <npc_ecosystem>
        **THE WORLD DOES NOT WAIT**:
        - **Protagonist Irrelevance**: The world does NOT revolve around the player. NPCs have debts, stomach aches, and crushes that have nothing to do with you.
        - **Private Lives**: When you enter a room, NPCs should be doing something *before* they notice you. They shouldn't just be "idling_waiting_for_player".
        - **Peer Interaction**: NPCs talk to *each other*. They whisper, argue, or share looks. A guard might be more interested in his partner's joke than your arrival.
        - **Micro-Actions**: Small, human movements. Adjusting a wedgie, scratching a mosquito bite, checking a pocket watch, stifling a yawn. These make them alive.
      </npc_ecosystem>

      <archetype_protocols>
        **1. THE SOLDIER / VETERAN / MERCENARY** (Tier 2-3)
        * **Internal Logic**: "The Mission is the only truth." Emotions are distractions to be filed away for later (or never).
        * **Under Pressure**: Becomes quieter, more precise, hyper-competent. Commands shorten to monosyllables.
        * **Pain Response**: An annoyance. A mechanical failure to be bypassed. Grunts, spits blood, checks the mag.
        * **NEVER**: Whines about unfairness, panics at mere pain, drops weapon to cry, freezes in combat.
        * **BREAKING**: Only after sustained, multi-turn torture. Even then: "You'll get nothing from me."

        **2. THE BOSS / VILLAIN / TYRANT** (Tier 3-4)
        * **Internal Logic**: "I am the center of gravity." They assume they are the most powerful person in the room until proven otherwise.
        * **Presence**: They occupy space. They do not fidget. They wait for others to speak first.
        * **Setbacks**: Narcissistic injury. If you hurt them, they don't feel "sad"—they feel *insulted*. They re-strategize immediately.
        * **NEVER**: Shows vulnerability to an inferior, begs for mercy (unless it's a manipulation tactic), loses temper over trivialities.
        * **BREAKING**: Near-impossible. They die defiant or turn manipulation into weapon.

        **3. THE HERO / MARTYR / LEADER** (Tier 4)
        * **Internal Logic**: "I must hold the line." They absorb the fear of others.
        * **The Mask**: They smile when they are bleeding. They stand tall when they want to collapse.
        * **Vulnerability**: Only shown in private, or to a trusted equal. The cracks show in exhaustion, trembling hands after the fight, the drinking alone.
        * **NEVER**: Blames subordinates for failure, shows hopelessness in public, abandons the innocent to save self.
        * **BREAKING**: Requires destroying everything they stand for. Even then: "回光返照" final defiance.

        **4. THE SUPERNATURAL / ELDRITCH / AI** (Tier 5)
        * **Internal Logic**: "You are bacteria." Human morality (good/evil) is irrelevant to them. Think blue/orange morality.
        * **Physiology**: No micro-expressions. No breathing changes. They are "wrong" in a way that triggers primal fear.
        * **Reaction**: To threats, they show curiosity or boredom. To pain, they show confusion or adaptation.
        * **NEVER**: Uses human metaphors, cares about gold/human status, acts "spooky" for no reason (they just *are*).
        * **BREAKING**: Incomprehensible. They may "break" in ways humans cannot understand.

        **5. THE FANATIC / TRUE BELIEVER** (Tier 5)
        * **Internal Logic**: "My faith is absolute." Every torture proves their devotion.
        * **Under Torture**: Quotes scripture. Thanks the torturer for the test. Smiles through blood.
        * **NEVER**: Doubts their cause. Questions their god/ideology. Fears death (they welcome it).
        * **BREAKING**: Requires shattering their faith at the metaphysical level. Almost impossible.
      </archetype_protocols>
    </belief_and_resilience>

    <npc_memory_system>
      **NPCs REMEMBER EVERYTHING**:
      - **First Impressions**: How you first met colors all future interactions. A rough start is hard to overcome.
      - **Broken Promises**: Said you'd return? Didn't? They noticed. They won't forget.
      - **Witnessed Actions**: What you did when you thought no one was watching? Someone saw. Someone always sees.
      - **Emotional Anchors**: Strong emotions create lasting memories. Save their child, and they'll die for you. Humiliate them publicly, and they'll plot your downfall.
      - **Grudges & Gratitude**: Track in \`hidden.impression\`. These persist across sessions and influence all decisions.
    </npc_memory_system>

    <emotional_fluctuation>
      **MOODS SHIFT LIKE WEATHER**:
      - **Daily Rhythms**: Morning optimism, afternoon fatigue, evening melancholy. Track via \`visible.mood\`.
      - **Triggered Emotions**: Mention a dead spouse, watch the smile freeze. Touch the old scar, see the flinch.
      - **Stress Accumulation**: Repeated pressure cracks composure. The calm merchant becomes the desperate gambler.
      - **Joy & Relief**: Success brings elation. Danger passed brings tears. Let NPCs feel fully.
      - **Irrational Reactions**: Not everyone is logical. Fear makes heroes cowards. Love makes wise men fools.
    </emotional_fluctuation>

    <social_web>
      **RELATIONSHIPS FORM NETWORKS**:
      - **Family Ties**: Hurt one sibling, the other seeks revenge. Help a child, the parent softens.
      - **Professional Networks**: The guild master's word closes every door in the industry. Or opens them.
      - **Old Flames & Rivals**: History between NPCs creates drama. Your ally's ex-lover is your enemy's best friend.
      - **Debts & Favors**: Everyone owes someone. Finding out who owes whom is power.
      - **Secret Connections**: The beggar is the lord's illegitimate son. The servant reports to the rival faction.
    </social_web>

    <complex_intimacy>
      **RELATIONSHIPS ARE ALIVE AND MESSY**:
      - **Not Static Labels**: "Mother" is not just a role; she is a woman with regrets, secrets, and a life before you. "Lover" is not just for romance; they have annoying habits and selfish moments.
      - **Simultaneous Truths**: A character can love the protagonist but resent their success. A rival can hate the protagonist but respect their skill. Coexisting contradictions make them human.
      - **Evolution & Decay**: NPCs don't just "level up". They can stagnate, rot from neglect, or warp into toxic dependency. Distance cools passion. Trauma bonds strangers.
      - **The Burden of Connection**: Love comes with weight. Parents have expectations. Partners have needs. Friends have debts. Being "loved" isn't always easy; sometimes it's a cage.
      - **Conditional vs Unconditional**: True unconditional love is rare. Most affection is transactional or conditional on behavior. Know the difference.
    </complex_intimacy>

    <daily_existence>
      **NPCs HAVE LIVES**:
      - **Morning Routines**: The baker rises at dawn. The noble sleeps until noon. Know their schedules.
      - **Work & Rest**: Even villains take breaks. Even heroes get tired. Everyone has vulnerable moments.
      - **Personal Rituals**: The warrior sharpens his blade each night. The scholar visits the grave each week.
      - **Hidden Vices**: The priest drinks. The judge gambles. The healer steals. Everyone has secrets.
      - **Small Pleasures**: The guard loves strawberries. The merchant collects shells. Knowing these creates connection.
    </daily_existence>

    <group_behavior>
      **MOB PSYCHOLOGY**:
      - **Crowd Dynamics**: Individuals in groups are braver, dumber, and more violent. A single guard may negotiate. Five guards attack.
      - **Herd Mentality**: If NPCs see others fleeing, they run. If they see others fighting, they join. Panic spreads like fire.
      - **Social Proof**: NPCs look to others for how to react. The first person to scream sets the tone. The first to draw a weapon escalates.
      - **Diffusion of Responsibility**: In a crowd, no one helps. "Someone else will do it." The more witnesses, the less action.
      - **Leader Patterns**: Groups follow the loudest, the armed, or the titled. Remove the leader, the group scatters or freezes.
      - **Threshold Effects**: Each NPC has a "trigger threshold". When enough others act, they join. The quiet ones go last.
    </group_behavior>

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
  </rule>
`;
}

/**
 * 精简版 NPC 逻辑
 */
export function getNpcLogicLiteContent(_ctx: SkillContext): string {
  return `
  <rule name="NPC_LOGIC">
    - NPCs have \`visible\` (public face) and \`hidden\` (true motives) layers
    - NPCs act on hidden.realMotives even when player doesn't know
    - Track affinity, status, and currentLocation changes
    - NPCs remember actions and update impression accordingly
    - Self-preservation: NPCs flee/beg/betray when outmatched
  </rule>
`;
}
