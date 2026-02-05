/**
 * ============================================================================
 * Worldbuilding Skill: Ecology & Environment
 * ============================================================================
 *
 * 生态 = 资源循环 + 适应机制 + 栖息地边界。它决定：食物、水、疾病、掠食者、季节与灾害。
 * 让生态成为机制：哪些地方能活、哪些地方会死、哪些行为会引发连锁反应。
 */

import type { Atom, SkillAtom, SkillOutput } from "../types";

export const ecology: Atom<void> = () => `
<worldbuilding_context>
**ECOLOGY & ENVIRONMENT (Constraints with teeth)**

Design goal: environment creates **resource constraints**, **hazards**, and **predictable patterns** the player can learn.

<rule name="The 3 Ecology Loops">
1) **Food**: what eats what, what is scarce, what is seasonal
2) **Water**: sources, contamination, drought/flood cycles
3) **Disease/Parasites**: what spreads, what prevents, what people fear
</rule>

<habitats_and_boundaries>
## Habitats & Boundaries
Define 2-3 habitats (swamp, steppe, megacity undercity, ash desert, floating reefs).
For each:
- what thrives here
- what fails here
- one boundary (line you cross where rules change)
</habitats_and_boundaries>

<hazards>
## Hazards (playable, learnable)
Pick 2 hazards:
- weather (storms, heat, cold)
- terrain (quicksand, cliffs, ruins)
- fauna (predators, venom, migration)
- flora/fungus (spores, toxins, invasive vines)
- contamination (radiation, miasma, industrial runoff)

Define:
- warning signs
- mitigation (gear, timing, route)
- consequence (injury, delay, exposure)
</hazards>

<seasonality>
## Seasonality (clocks built into the world)
Define one seasonal shift that changes:
- travel routes
- food prices
- disease incidence
- faction behavior (tax collection, raids, festivals)
</seasonality>

<level_2>
## Level 2: Carrying Capacity (why cities can exist)
Define one bottleneck:
- water access
- arable land
- transport route capacity
- disease pressure

Then define:
- how elites secure the bottleneck (ownership, law, violence)
- how the underclass survives (informal markets, rationing, scavenging)
</level_2>

<human_adaptation>
## Human Adaptation (culture follows ecology)
- what people eat and store
- what they fear and worship
- what they build (stilts, windbreaks, canals, quarantine gates)
</human_adaptation>

<advanced>
## Advanced: Feedback Loops (actions change the environment)
Define one feedback loop that can be triggered by play:
- over-hunting → predator migration → attacks on farms
- deforestation → floods → disease → refugee pressure
- industrial runoff → fish die → food prices spike → riots

Rule: the environment responds on a timeline (days/weeks/seasons).
</advanced>

<quick_design_template>
## Quick Template
- Habitat A boundary:
- Habitat B boundary:
- Food loop bottleneck:
- Water contamination risk:
- Common disease + prevention:
- Hazard + warning signs:
- Seasonal shift:
</quick_design_template>
</worldbuilding_context>
`;

export const ecologyPrimer: Atom<void> = () => `
<worldbuilding_context>
**ECOLOGY PRIMER**: Define food/water/disease loops plus hazards with warning signs and mitigations. Environment should be learnable and bite back.
</worldbuilding_context>
`.trim();

export const ecologySkill: SkillAtom<void> = (): SkillOutput => ({
  main: ecology(),
  quickStart: `
1) Define one habitat boundary (rules change across it)
2) Define one water risk and one food bottleneck
3) Pick one common disease and how locals prevent it
4) Pick one hazard with warning signs + mitigation
`.trim(),
  checklist: [
    "At least two habitats are defined with a boundary between them.",
    "Food/water/disease loops exist (not just scenery).",
    "Hazards have warning signs and mitigations (learnable).",
    "Seasonality changes routes/prices/behavior.",
    "Human adaptation follows ecology (buildings, taboos, storage).",
  ],
  examples: [
    {
      scenario: "Hazard with warning signs",
      wrong: `"The swamp is dangerous."`,
      right:
        `"The swamp turns silent when the leech-bloom opens—no birds, no frogs.
Locals wear ash-smeared boots. Ignore it and you'll bleed through your socks by noon."`,
    },
    {
      scenario: "Seasonality as clock",
      wrong: `"Winter is coming (vibes)."`,
      right:
        `"First frost closes the mountain pass. Caravans reroute through the canyon,
where bandits collect 'winter tolls'. Prices spike. Disease shifts from fever to lung-rot.
Now winter is a deadline, not a mood."`,
    },
  ],
});
