/**
 * ============================================================================
 * Worldbuilding Skill: Culture & Ritual
 * ============================================================================
 *
 * 文化不是橱窗里的陈列品，它是活的——是呼吸、是伤疤、是债。
 * 归属/羞耻/义务/禁忌/仪式构成一个运转的系统。
 * 把文化做成机制：它规定谁能说什么、谁欠谁、哪些行为会引发代价或机会。
 */

import type { Atom, SkillAtom, SkillOutput } from "../types";
import { defineAtom, defineSkillAtom } from "../../trace/runtime";

export const cultureRitual: Atom<void> = defineAtom(
  {
    atomId: "atoms/worldbuilding/cultureRitual#cultureRitual",
    source: "atoms/worldbuilding/cultureRitual.ts",
    exportName: "cultureRitual",
  },
  () => `
<worldbuilding_context>
**CULTURE & RITUAL (Living practice, not museum exhibit)**

Design goal: culture should create **constraints**, **signals**, and **obligations** that drive play. A ritual is not flavor text — it is a machine built from habit, enforced by shame, and fueled by the terror of being cast out.

<rule name="3 Anchors (pick 1 each)">
1) **Honor/Face**: reputation as currency — spend it carelessly and you are bankrupt in ways no coin can remedy
2) **Purity/Taboo**: contamination, sin, pollution, caste — the stain that soap cannot reach
3) **Debt/Obligation**: favors, oaths, patronage, fealty — the invisible ledger everyone keeps but no one shows
</rule>

<signals>
## Signals (how people read each other — the silent language spoken before anyone opens their mouth)
Define 3 signals:
- **Greeting**: who bows first, who offers name/title, who touches whom
- **Dress marker**: colors, badges, rings, tattoos, toolmarks
- **Speech marker**: honorifics, indirect refusal, forbidden topics

Make signals actionable:
- Misread signal → offense → price or conflict
- Correct signal → access → discount or trust
</signals>

<rituals>
## Rituals (repeated actions with stakes — the choreography of power)
Pick 2:
- Daily ritual: prayer, roll-call, cleansing, offerings — the pulse of communal life
- Seasonal ritual: festival, harvest rites, mourning week — the heartbeat of the calendar
- Crisis ritual: quarantine, trial by ordeal, emergency councils — the body politic under stress

Each ritual should have:
- **Participants** (who must attend)
- **Cost** (time/money/sacrifice)
- **Enforcement** (who punishes refusal)
- **Exploitation** (who uses it to gain leverage)
</rituals>

<taboos>
## Taboos (hard rules that trigger consequences — the electric fence of social life)
Define 1-2 taboos that are actually enforced:
- Speaking a name
- Eating a food
- Touching a sacred object
- Entering a space uninvited

Taboos create:
- "I can’t do that" constraints
- Smuggling / disguise / exemptions as gameplay
</taboos>

<institutions>
## Institutions (culture has operators)
Pick 1-2:
- temple, elders, guild, corp HR, militia, inquisitors
Define:
- What they want
- What they control (marriage, burial, permits, education)
</institutions>

<level_2>
## Level 2: Microcultures (culture varies by place and role)
Define 2 microcultures inside the same society:
- dockworkers vs clerks
- soldiers vs priests
- old families vs new money

Give each:
- one unique signal
- one taboo
- one “favor economy” rule

This prevents “culture = one flat rulebook”.
</level_2>

<advanced>
## Advanced: Ritual as Communication (safe channel)
Rituals can encode:
- status (who stands where)
- consent/refusal (indirect speech)
- threats (public shame)
- alliances (shared offerings)

Design one ritual that:
- allows negotiation without “speaking openly”
- creates a clock (deadline, expiring token, seasonal window)
</advanced>

<quick_design_template>
## Quick Template
- Anchor (honor/purity/debt):
- Greeting rule:
- Dress marker:
- Speech marker:
- Daily ritual:
- Seasonal ritual:
- Enforced taboo:
- Institution operator:
</quick_design_template>
</worldbuilding_context>
`,
);

export const cultureRitualDescription: Atom<void> = defineAtom(
  {
    atomId: "atoms/worldbuilding/cultureRitual#cultureRitualDescription",
    source: "atoms/worldbuilding/cultureRitual.ts",
    exportName: "cultureRitualDescription",
  },
  () =>
    `
<worldbuilding_context>
**CULTURE PRIMER**: Culture is not decor — it is the grammar of belonging. Model it as signals + obligations + taboos with enforcement. Make missteps costly and mastery rewarding.
</worldbuilding_context>
`.trim(),
);

export const cultureRitualSkill: SkillAtom<void> = defineSkillAtom(
  {
    atomId: "atoms/worldbuilding/cultureRitual#cultureRitualSkill",
    source: "atoms/worldbuilding/cultureRitual.ts",
    exportName: "cultureRitualSkill",
  },
  (_input, trace): SkillOutput => ({
    main: trace.record(cultureRitual),
    quickStart: `
1) Choose 1 anchor (honor / purity / debt)
2) Define 3 signals (greeting, dress, speech)
3) Define 1 enforced taboo
4) Define 1 ritual that can be exploited
`.trim(),
    checklist: [
      "Culture has at least one enforced anchor (honor/purity/debt).",
      "Signals are readable and actionable (misread has consequences).",
      "At least one taboo is genuinely enforced.",
      "Rituals cost something and can be exploited for leverage.",
      "Institutions exist to operate the culture (not just 'everyone believes').",
    ],
    examples: [
      {
        scenario: "Signal mastery creates access",
        wrong: `"They are a strange culture with weird customs."`,
        right: `"You address her as 'Captain'—and the room freezes. In this district,
rank is never spoken aloud; you *imply* it with seating order.
Correct it and she offers a private audience. Fail and you pay a public apology tax."`,
      },
      {
        scenario: "Taboo creates gameplay",
        wrong: `"The temple is sacred so you can't enter."`,
        right: `"Only the 'cleansed' may enter. Cleansing takes an hour and a donation.
Smugglers sell counterfeit ash marks—but the inquisitors test with vinegar.
Now it's a choice: pay, wait, cheat, or find an insider."`,
      },
    ],
  }),
);
