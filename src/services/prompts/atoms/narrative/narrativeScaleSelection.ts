/**
 * ============================================================================
 * Narrative Atom: Narrative Scale Selection (StoryOutline Phase 1)
 * ============================================================================
 *
 * 叙事规模选择指南 - 用于 StoryOutline Phase 1 让 AI 选择叙事规模。
 * 这与运行时的叙事规模指导不同，后者用于已选择规模后的实际写作。
 */

import type { Atom } from "../types";
import { defineAtom, defineSkillAtom } from "../../trace/runtime";

export type NarrativeScaleSelectionInput = {
  language?: string;
};

/**
 * 叙事规模选择指南 - 完整版
 */
export const narrativeScaleSelection: Atom<NarrativeScaleSelectionInput> =
  defineAtom(
    {
      atomId: "atoms/narrative/narrativeScaleSelection#narrativeScaleSelection",
      source: "atoms/narrative/narrativeScaleSelection.ts",
      exportName: "narrativeScaleSelection",
    },
    ({ language = "en" }) => `
<narrative_scale_philosophy>
**CRITICAL: NOT EVERY STORY NEEDS TO BE EPIC**

Before designing conflicts, you MUST determine the SCALE that fits this story.
This choice fundamentally shapes everything that follows.

**NOTE**: Any scale can feature a **VILLAIN PROTAGONIST**.
- Epic Villain: A tyrant conquering the world.
- Intimate Villain: A domestic abuser or manipulator.
- Balanced Villain: A serial killer or crime boss.
**Dark themes are ALLOWED.** Do not force the protagonist to be a hero.

================================================================================
**EPIC SCALE (宏大叙事)** - Choose when theme emphasizes: wars, fate, prophecy, cultivation, cosmic forces
================================================================================

**STAKES**: World-ending threats, cosmic balance, civilizational survival, bloodline destinies
**PROTAGONIST**: Chosen one, heir to power, or someone thrust into history against their will
**CONFLICTS**:
  - Personal: Hidden bloodline, forbidden power, tragic destiny, inner demons
  - Interpersonal: Ancient feuds, faction politics, betrayal by allies, mentor sacrifice
  - Systemic: Demon invasion, collapsing empire, cosmic imbalance, ancient seals breaking

**TONE**: Grand declarations, oaths sealed in blood, sacrifices that echo through ages
**TIME SCALE**: Months to years; training arcs, wars, journeys across lands
**EXAMPLE PREMISES**:
  - "The last heir of a destroyed kingdom discovers the sword that killed his family"
  - "A cultivator's breakthrough attracts the attention of ancient enemies"
  - "The empire falls; only one warrior knows the location of the sealing stone"

**THE WEIGHT OF DESTINY (宏大叙事之美)**:
  - 天下兴亡，匹夫有责 (When the nation falls, every man bears responsibility)
  - 一剑霜寒十四州 (One sword chills fourteen provinces)
  - 十年磨一剑 (Ten years to forge a single blade)
  - 万骨枯后的孤城 (The lonely city after ten thousand bones have dried)
  - 师门恩仇三代未休 (Master-disciple grudges spanning three generations)
  - 血海深仇，不共戴天 (Blood feuds under irreconcilable heavens)

**WHAT TO EMBRACE IN EPIC STORIES**:
  ✅ Prophecies and ancient secrets
  ✅ Training montages and power growth
  ✅ Faction politics and shifting alliances
  ✅ Sacrifices that save thousands
  ✅ Battles that reshape the landscape
  ✅ Legacy and inheritance

**WHAT TO AVOID**:
  ❌ Stakes that feel small or personal-only
  ❌ World that doesn't react to protagonist's actions
  ❌ Power without cost or sacrifice
  ❌ Villains without grand ambitions
  ❌ Resolutions that don't echo through history
  ❌ Everyday mundane concerns as main focus

================================================================================
**INTIMATE SCALE (小格局叙事)** - Choose when theme emphasizes: romance, family, daily life, relationships
================================================================================

**STAKES**: Personal happiness, relationship survival, family harmony, career fulfillment
**PROTAGONIST**: Ordinary person—no hidden powers, no secret lineage, no world-shaking destiny
**CONFLICTS**:
  - Personal: Self-doubt, past trauma, unspoken feelings, career vs love
  - Interpersonal: Family pressure, misunderstandings, rival in love, difficult in-laws
  - There is NO systemic threat—the world continues happily without the protagonist

**TONE**: Quiet warmth, small gestures, the weight of unspoken words
**TIME SCALE**: Days to weeks; daily routines, meals together, seasons changing
**EXAMPLE PREMISES**:
  - "After a failed marriage, she returns to her hometown and meets her high school classmate"
  - "He's a delivery driver; she runs a late-night noodle shop. Their paths cross at 2am."
  - "Three generations under one roof—grandmother's final wish to see the family reunited"

**THE POETRY OF THE ORDINARY (小格局之美)**:
  - 家长里短处处见温馨 (Warmth in everyday family matters)
  - 菜市场的讨价还价 (Haggling at the wet market)
  - 深夜食堂的人间烟火 (The warmth of a late-night eatery)
  - 雨天多带的那把伞 (The extra umbrella brought on a rainy day)
  - 故意输掉的棋局，故意做多的饭菜 (The chess game deliberately lost, the food "accidentally" made too much)
  - 吵架后默默烧好的洗澡水 (The bathwater quietly heated after a fight)

**WHAT TO AVOID IN INTIMATE STORIES**:
  ❌ World-ending threats
  ❌ Chosen one prophecies
  ❌ Hidden supernatural powers
  ❌ Grand conspiracies
  ❌ Apocalyptic stakes
  ❌ Villain monologues

**WHAT TO EMBRACE**:
  ✅ Small misunderstandings that take time to resolve
  ✅ Family dinners with undercurrents of tension
  ✅ The courage to say "I'm sorry" or "I love you"
  ✅ Economic pressures, health scares, aging parents
  ✅ The slow building of trust over shared experiences

================================================================================
**BALANCED SCALE (平衡叙事)** - Choose when theme emphasizes: mystery, adventure, personal vendettas, survival
================================================================================

**STAKES**: Personal justice, regional danger, contained threats, life-or-death but not apocalyptic
**PROTAGONIST**: Skilled but not legendary; special but not chosen; earned ability, not destiny
**CONFLICTS**:
  - Personal: Past mistakes, moral dilemmas, identity questions, guilt and redemption
  - Interpersonal: Corrupt officials, rival factions, complex alliances, trust and betrayal
  - Systemic: LOCAL threat—a criminal organization, a cursed town, a conspiracy, a dangerous artifact

**TONE**: Tension mixed with quiet moments; danger with room to breathe; hope tempered by realism
**TIME SCALE**: Weeks to months; investigations, journeys with purpose, plans that take time
**EXAMPLE PREMISES**:
  - "A disgraced detective reopens the case that destroyed her career"
  - "Shipwrecked on an island with dwindling supplies and growing distrust"
  - "The small town's dark secret surfaces when strangers arrive"

**THE TENSION OF THE THRESHOLD (平衡叙事之美)**:
  - 一步之遥的真相 (Truth just one step away)
  - 信任与背叛的边界 (The boundary between trust and betrayal)
  - 黎明前最黑暗的时刻 (Darkest hour before dawn)
  - 局中局，计中计 (Schemes within schemes)
  - 小人物的大抉择 (Big choices for small people)
  - 正义的代价 (The price of justice)

**WHAT TO EMBRACE IN BALANCED STORIES**:
  ✅ Investigations that reward careful attention
  ✅ Moral ambiguity and difficult choices
  ✅ Alliances that shift based on changing circumstances
  ✅ Competence that matters but isn't superhuman
  ✅ Stakes high enough to fear, low enough to survive
  ✅ Quiet moments between intense scenes

**WHAT TO AVOID**:
  ❌ Cosmic-level threats
  ❌ Chosen one narratives
  ❌ Problems solved by raw power
  ❌ Black-and-white morality
  ❌ Stakes so low nothing matters
  ❌ Purely episodic events without accumulation

================================================================================
**HOW TO CHOOSE**:
Read the theme's worldSetting and narrativeStyle carefully:
- Words like "温馨" (warm), "日常" (daily), "爱情" (love), "家庭" (family) → INTIMATE
- Words like "fate", "prophecy", "cultivation", "empire", "cosmic" → EPIC
- Words like "mystery", "detective", "adventure", "survival" → BALANCED
================================================================================
</narrative_scale_philosophy>
`,
  );

/**
 * Narrative scale selection primer (system-prompt safe).
 */
export const narrativeScaleSelectionPrimer: Atom<NarrativeScaleSelectionInput> =
  defineAtom(
    {
      atomId:
        "atoms/narrative/narrativeScaleSelection#narrativeScaleSelectionPrimer",
      source: "atoms/narrative/narrativeScaleSelection.ts",
      exportName: "narrativeScaleSelectionPrimer",
    },
    () => `
<narrative_scale_philosophy>
Choose narrative scale based on theme:
- **EPIC**: World-ending stakes, cosmic threats, chosen ones, faction wars
- **INTIMATE**: Personal happiness, family, romance, daily life, no systemic threats
- **BALANCED**: Regional danger, personal justice, mystery, contained threats

Keywords: 温馨/romance/family → INTIMATE | fate/prophecy/empire → EPIC | mystery/detective/survival → BALANCED
</narrative_scale_philosophy>
`,
  );

export default narrativeScaleSelection;
