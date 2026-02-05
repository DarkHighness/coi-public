/**
 * ============================================================================
 * Worldbuilding Skill: Media & Propaganda
 * ============================================================================
 *
 * 舆论不是“背景噪音”，它是信息扩散/审查/造势/辟谣的机制。
 * 目的：让名誉、叙事与证据标准变成可玩的门槛与后果。
 */

import type { Atom, SkillAtom, SkillOutput } from "../types";

export const mediaPropaganda: Atom<void> = () => `
<worldbuilding_context>
**MEDIA & PROPAGANDA (Narratives with Infrastructure)**

Design goal: make public narratives create *access changes*, *procedural retaliation*, and *long-tail marks*.

<rule name="The 5 Media Primitives">
1) **Channels**: where narratives travel (press, rumor brokers, social platforms, sermons, posters)
2) **Gatekeepers**: who controls distribution (editors, censors, algorithms, priests, unions)
3) **Receipts**: what can be proven later (recordings, archives, witnesses, logs)
4) **Latency**: how fast stories spread and how long they persist
5) **Penalty**: what happens to those who publish/consume/deny (fines, bans, arrests, stigma)
</rule>

<attention_economy>
## Attention Economy (what spreads and why)
Stories spread when they:
- Confirm existing beliefs
- Offer a scapegoat
- Provide a simple moral frame
- Include a vivid "receipt" (photo, witness, seal, leaked doc)

Use a ladder:
- Whisper → rumor → headline → official statement → crackdown
</attention_economy>

<censorship_and_backchannels>
## Censorship & Backchannels (control creates markets)
Define:
- What is banned (topics, names, symbols)
- How censorship works (pre-approval, takedowns, intimidation, platform bans)
- Backchannels (samizdat, pirate radio, couriers, coded sermons)

Control always has failure modes:
- leaks
- false positives
- corruption gates
</censorship_and_backchannels>

<proof_vs_story>
## Proof vs Story (what convinces whom?)
Different audiences require different proofs:
- Courts/HR: documents, logs, witnesses
- Public: vivid story + relatable villain + moral clarity
- Institutions: plausible deniability and containment narrative

Create play by forcing choices:
- Publish now (fast) vs verify (slow)
- Name the source (credibility) vs protect them (weak proof)
</proof_vs_story>

<reputation_marks>
## Reputation Marks (persistent consequences)
Reputation changes access:
- Doors open/close (audiences, sponsors, jobs, safehouses)
- Increased surveillance
- Informant interest
- Protection offers (with strings)
</reputation_marks>

<quick_design_template>
## Quick Template (fill in 90 seconds)
- Channels + gatekeeper:
- Censorship rule + backchannel:
- Proof standard (public vs court):
- Response ladder (24h/7 days/season):
- One reputation mark that persists:
</quick_design_template>
</worldbuilding_context>
`;

export const mediaPropagandaPrimer: Atom<void> = () => `
<worldbuilding_context>
**MEDIA PRIMER**: Narratives travel via channels with gatekeepers. Proof standards differ by audience. Public stories trigger procedural response ladders and persistent reputation marks.
</worldbuilding_context>
`.trim();

export const mediaPropagandaSkill: SkillAtom<void> = (): SkillOutput => ({
  main: mediaPropaganda(),
  quickStart: `
1) Define 2 channels (press/rumor/platform/sermons) and their gatekeepers
2) Define censorship rule + backchannel (control creates markets)
3) Define proof standards for two audiences (public vs authority)
4) Define a response ladder (whisper → crackdown) with a timeline
5) Add a reputation mark that changes access tomorrow
`.trim(),
  checklist: [
    "At least one channel + gatekeeper exists (who can publish?).",
    "Censorship/control has a mechanism and failure modes.",
    "Proof standards differ across audiences (public vs court vs institution).",
    "Stories have latency and persistence (when does it peak, when does it die?).",
    "A response ladder exists (rumor → headline → official response → crackdown).",
    "Reputation marks persist and change access (doors open/close).",
  ],
  examples: [
    {
      scenario: "Proof vs story tradeoff",
      wrong: `"We leak it and everyone believes us."`,
      right:
        `"The leak spreads fast, but the institution claims it’s forged. To make it stick,
you need a witness or a second document. If you verify quietly, the story may die—or your source
may be arrested. Publishing now buys momentum but triggers a crackdown within 24 hours."`,
    },
    {
      scenario: "Censorship creates markets",
      wrong: `"Censorship means no one talks about it."`,
      right:
        `"Banning the topic pushes it into coded sermons and rumor brokers who charge for access.
False positives occur: the censor hits unrelated messages. Corrupt officers sell 'safe' permits.
The player can use backchannels but risks leaving a pattern."`,
    },
  ],
});
