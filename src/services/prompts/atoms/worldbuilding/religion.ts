/**
 * ============================================================================
 * Worldbuilding Skill: Religion & Sacred Power
 * ============================================================================
 *
 * 宗教是“意义的机器”：它生产禁忌、赦免、身份、权力与资源分配。
 * 让宗教成为机制：谁能赦免、谁能宣告异端、谁控制圣地与仪式。
 */

import type { Atom, SkillAtom, SkillOutput } from "../types";

export const religion: Atom<void> = () => `
<worldbuilding_context>
**RELIGION & SACRED POWER (Mechanics, not set dressing)**

Design goal: religion should generate **constraints**, **access**, **legitimacy**, and **conflict**.

<rule name="The 4 Religious Functions (pick 2-3)">
1) **Legitimacy**: crowns are blessed, contracts are witnessed, wars are justified
2) **Social Sorting**: caste, purity, membership, oaths, taboo boundaries
3) **Resource Control**: land, tithe, charity, relics, pilgrim money, hospitals
4) **Meaning & Fear**: sin, afterlife, curse, salvation, prophecy, apocalypse
</rule>

<structure>
## Structure (who holds the keys?)
- Authority type: pope/council/elders/prophet/corporate-church AI
- Enforcement arm: inquisitors, temple guards, social shaming, excommunication registry
- Jurisdiction: sacred districts, cemeteries, holy routes, marriage/burial control
</structure>

<ritual_economy>
## Ritual Economy (rituals cost something)
Pick 2 rituals that matter:
- cleansing / confession / blessing
- burial rites / ancestor rites
- oath-taking / marriage / adoption
- exorcism / warding / pilgrimage

Each ritual must define:
- price (money/time/sacrifice)
- gatekeeper (who can perform it)
- failure consequence (social/legal/spiritual)
</ritual_economy>

<heresy_and_exemptions>
## Heresy & Exemptions (creates gameplay)
- 1 enforceable heresy (actually punished)
- 1 tolerated deviance (quietly allowed for a price)
- 1 exemption mechanism (dispensation, relic token, sponsor letter)
</heresy_and_exemptions>

<sacred_sites>
## Sacred Sites (access control as story engine)
Define a sacred place with:
- threshold (who can enter)
- surveillance (confession logs, watchers, vows)
- value (healing, asylum, prophecy, trade protection)
</sacred_sites>

<level_2>
## Level 2: Schisms & Syncretism (religion is not one thing)
Define:
- one internal split (purists vs reformers, clergy vs monks, miracle-workers vs bureaucrats)
- one “foreign” faith interaction (assimilation, persecution, trade alliance)
- one contested doctrine that affects law/economy (marriage, burial, debt, purity)

Gameplay:
- factions inside the faith compete for relics, appointments, and narratives.
</level_2>

<advanced>
## Advanced: Miracle Economy (power creates markets)
If miracles exist (even socially, as belief), define:
- who can certify a miracle (and for what price)
- relic authentication (forgery + audits)
- pilgrimage routes (security, taxes, underworld)

Religion often becomes:
- a bank (tithes, loans, charity with strings)
- a registry (names, confessions, oaths)
- an immunity zone (sanctuary, asylum)
</advanced>

<quick_design_template>
## Quick Template
- Religion function(s):
- Authority type:
- Enforcement arm:
- Ritual #1 + price:
- Ritual #2 + gatekeeper:
- Enforceable heresy:
- Buyable deviance:
- Exemption mechanism:
- Sacred site + threshold:
</quick_design_template>
</worldbuilding_context>
`;

export const religionPrimer: Atom<void> = () => `
<worldbuilding_context>
**RELIGION PRIMER**: Model religion as legitimacy + sorting + resource control. Define rituals with gatekeepers, prices, and enforceable heresy/exemptions.
</worldbuilding_context>
`.trim();

export const religionSkill: SkillAtom<void> = (): SkillOutput => ({
  main: religion(),
  quickStart: `
1) Pick 2 functions (legitimacy/sorting/resources/meaning)
2) Define one ritual with a price and a gatekeeper
3) Define one enforceable heresy and one buyable exemption
4) Define one sacred site with access control
`.trim(),
  checklist: [
    "Religion has concrete power (legitimacy/resources), not just beliefs.",
    "At least one ritual has a price and a gatekeeper.",
    "There is an enforceable heresy (actually punished).",
    "There is an exemption/dispensation mechanism (creates deals).",
    "Sacred sites have thresholds and surveillance, not open access.",
  ],
  examples: [
    {
      scenario: "Exemption as gameplay",
      wrong: `"The church forbids magic, but you can do it anyway."`,
      right:
        `"Magic is heresy—unless you carry a relic-seal issued by the abbey.
The seal expires in seven days. Renewal requires 'service' (a favor) or a tithe.
Now magic use creates a clock: pay, negotiate, hide, or convert."`,
    },
    {
      scenario: "Ritual economy creates stakes",
      wrong: `"You get blessed for free."`,
      right:
        `"Blessing requires incense imported through the Temple Gate.
Without it, the priest can still bless you—but the community will treat you as 'unwitnessed':
merchants won't extend credit, and guards search you at checkpoints."`,
    },
  ],
});
