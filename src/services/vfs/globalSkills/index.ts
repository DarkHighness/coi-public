/**
 * VFS Global Skills - Main Entry Point
 *
 * This module provides the global skills library for VFS.
 * Skills are generated from atoms and served as read-only markdown files.
 */

import type { VfsFile, VfsFileMap } from "../types";
import { hashContent, normalizeVfsPath } from "../utils";
import type { GlobalSkillSeed } from "./types";
import {
  SKILLS_README_SEED,
  SKILLS_STYLE_SEED,
  SKILLS_TAXONOMY_SEED,
  buildSkillsIndexSeed,
} from "./manifest";
import { generateVfsSkillSeeds, getSkillIndexEntries } from "./generator";

// ============================================================================
// Theme Skills (Simplified - 10 Core Themes)
// ============================================================================

const THEME_SKILLS: GlobalSkillSeed[] = [
  {
    path: "skills/theme/fantasy/SKILL.md",
    contentType: "text/plain",
    content: `# Fantasy Theme

**When to load**: When running a fantasy-genre adventure

**Core Constraints**:
- Magic has COSTS (fatigue, components, consequences, time)
- Power has INSTITUTIONS (guilds, academies, churches that regulate it)
- The supernatural is RARE in daily life (not everyone sees dragons)
- Material concerns PERSIST (food, shelter, money still matter)

**Pressure Mechanisms**:
- Magical debt or corruption
- Institutional politics (guild rivalries, church doctrine)
- Resource scarcity for magical components
- Social stigma of certain magics

**Tropes to Use**:
- The wise mentor with hidden agendas
- Ancient prophecies with multiple interpretations
- Artifacts with costs and limitations
- Hidden magical societies

**Tropes to Avoid**:
- Unlimited magic with no cost
- NPCs who exist only to help the player
- Evil that is evil for evil's sake
- Convenient prophecy fulfillment
`,
  },
  {
    path: "skills/theme/noir/SKILL.md",
    contentType: "text/plain",
    content: `# Noir Theme

**When to load**: When running a noir-style mystery or crime story

**Core Constraints**:
- Everyone has LEVERAGE (secrets, debts, dependencies)
- Information costs SOMETHING (money, favors, exposure)
- The law is a TOOL, not an arbiter
- Moral victories often come with personal costs

**Pressure Mechanisms**:
- Time pressure (someone is watching, deadline looms)
- Debt and obligation chains
- Reputation damage
- Escalating violence

**Tropes to Use**:
- The femme fatale with her own agenda
- Corrupt officials who are also human
- The past that won't stay buried
- Double-crosses that make sense in hindsight

**Tropes to Avoid**:
- Pure-evil villains with no logic
- Convenient clue-finding
- Violence without consequence
- Simple good vs evil framing
`,
  },
  {
    path: "skills/theme/horror/SKILL.md",
    contentType: "text/plain",
    content: `# Horror Theme

**When to load**: When running horror or supernatural thriller content

**Core Constraints**:
- The threat is REAL (can actually harm or kill)
- Information is INCOMPLETE (uncertainty breeds dread)
- Escape is COSTLY (not a clean getaway)
- Safety is TEMPORARY (the threat adapts)

**Pressure Mechanisms**:
- Isolation (help is far or unavailable)
- Resource depletion (light, ammo, sanity)
- Escalating exposure to the threat
- Countdown to irreversible change

**Tropes to Use**:
- The warning that should have been heeded
- The safe place that becomes unsafe
- The ally whose reliability is uncertain
- The rule that must not be broken

**Tropes to Avoid**:
- Jump scares without buildup
- Monsters that are visually revealed too early
- Deus ex machina rescues
- Violence replacing genuine dread
`,
  },
  {
    path: "skills/theme/cyberpunk/SKILL.md",
    contentType: "text/plain",
    content: `# Cyberpunk Theme

**When to load**: When running a cyberpunk or high-tech dystopia story

**Core Constraints**:
- CORPORATIONS have more power than governments
- SURVEILLANCE is pervasive (anonymity has a cost)
- BODY is modifiable but modifications have tradeoffs
- DEBT is the universal chain (everyone owes someone)

**Pressure Mechanisms**:
- Corporate interest and retaliation
- Digital trail and exposure
- Cyberware maintenance and dependency
- Credstick balance and debt collection

**Tropes to Use**:
- The megacorp with competing internal factions
- The street-level fixer with corporate ties
- Technology that liberates and enslaves
- The edge between human and machine

**Tropes to Avoid**:
- Technology without social consequence
- Corporations as monolithic evil
- Hacking as instant magic
- Style over substance (literally)
`,
  },
  {
    path: "skills/theme/mystery/SKILL.md",
    contentType: "text/plain",
    content: `# Mystery Theme

**When to load**: When running investigation-focused scenarios

**Core Constraints**:
- CLUES are discoverable (no unsolvable mysteries)
- Evidence requires INTERPRETATION (multiple readings possible)
- Information has SOURCES (who said it, why would they know)
- Time affects EVIDENCE (witnesses forget, scenes change)

**Pressure Mechanisms**:
- Competing investigators or interests
- Witnesses who might disappear
- Evidence that degrades or is destroyed
- The killer who might strike again

**Tropes to Use**:
- The misleading but fair red herring
- The witness with partial truth
- The clue that means different things to different people
- The reveal that recontextualizes earlier events

**Tropes to Avoid**:
- Clues that require mind-reading to find
- Evidence that appears when convenient
- Solutions that require external knowledge
- Twists that contradict established facts
`,
  },
  {
    path: "skills/theme/romance/SKILL.md",
    contentType: "text/plain",
    content: `# Romance Theme

**When to load**: When romantic relationships are central to the narrative

**Core Constraints**:
- VULNERABILITY is required (emotional risk)
- CHEMISTRY comes from conflict and connection
- TIMING matters (wrong time can doom right people)
- STAKES are personal but consequential

**Pressure Mechanisms**:
- External obstacles (family, society, duty)
- Internal conflict (fear, past trauma, goals)
- Rival interests (other suitors, competing priorities)
- Deadline pressure (departure, commitment, revelation)

**Tropes to Use**:
- The moment of almost-but-not-quite
- The gesture that speaks louder than words
- The secret that threatens to surface
- The sacrifice that proves depth

**Tropes to Avoid**:
- Love at first sight without development
- Obstacles that exist only to delay
- Partners who have no life outside romance
- Resolution without earned growth
`,
  },
  {
    path: "skills/theme/wuxia/SKILL.md",
    contentType: "text/plain",
    content: `# Wuxia Theme

**When to load**: When running martial arts / jianghu style adventures

**Core Constraints**:
- HONOR and FACE are currencies (losing face has real cost)
- LINEAGE and SCHOOL matter (techniques have sources)
- DEBTS of gratitude must be repaid
- The JIANGHU has its own law (separate from imperial)

**Pressure Mechanisms**:
- Sect politics and rivalries
- Blood debts and vengeance obligations
- Face and reputation among peers
- Master-disciple obligations

**Tropes to Use**:
- The technique with a hidden cost
- The rival who is also bound by honor
- The elder with secrets from the past
- The challenge that tests more than skill

**Tropes to Avoid**:
- Fights without stakes or consequence
- Dishonorable behavior without cost
- Power levels as simple numbers
- Modern morality in historical context
`,
  },
  {
    path: "skills/theme/heist/SKILL.md",
    contentType: "text/plain",
    content: `# Heist Theme

**When to load**: When running heist, caper, or infiltration scenarios

**Core Constraints**:
- SECURITY has layers (bypass one, face another)
- ROLES matter (each specialist has unique value)
- TIMING is critical (windows open and close)
- COMPLICATIONS escalate (nothing goes perfectly)

**Pressure Mechanisms**:
- Security response escalation
- Time windows closing
- Team trust and potential betrayal
- Unexpected variables (guards, witnesses, systems)

**Tropes to Use**:
- The reveal of preparation we didn't see
- The complication that forces improvisation
- The inside person with divided loyalties
- The exit strategy that changes mid-heist

**Tropes to Avoid**:
- Perfect plans that work perfectly
- Security that exists only to be bypassed
- Team members without personal stakes
- Consequences that don't persist
`,
  },
  {
    path: "skills/theme/post-apocalypse/SKILL.md",
    contentType: "text/plain",
    content: `# Post-Apocalypse Theme

**When to load**: When running survival or post-collapse scenarios

**Core Constraints**:
- RESOURCES are scarce (food, water, medicine, ammo)
- SAFETY is temporary (no permanent haven)
- COMMUNITIES have costs (joining means obligations)
- The OLD WORLD leaves residue (ruins, tech, knowledge)

**Pressure Mechanisms**:
- Resource depletion and rationing
- Territorial conflict with other groups
- Environmental hazards (radiation, weather, fauna)
- Disease and injury without modern medicine

**Tropes to Use**:
- The settlement with a dark secret
- The relic of the old world with unclear function
- The leader whose methods are questionable but effective
- The outsider who brings both hope and danger

**Tropes to Avoid**:
- Unlimited ammunition and supplies
- Societies that reformed perfectly
- Monsters without ecological logic
- Post-apocalypse as aesthetic without hardship
`,
  },
  {
    path: "skills/theme/slice-of-life/SKILL.md",
    contentType: "text/plain",
    content: `# Slice-of-Life Theme

**When to load**: When running low-stakes, everyday-focused scenarios

**Core Constraints**:
- SMALL STAKES feel big (the everyday matters)
- ROUTINES create rhythm (disruption is dramatic)
- RELATIONSHIPS are central (community ties)
- TIME passes naturally (seasons, aging, change)

**Pressure Mechanisms**:
- Social obligations and expectations
- Economic pressure (rent, bills, job)
- Relationship strain (family, friends, neighbors)
- Personal goals vs. responsibilities

**Tropes to Use**:
- The recurring minor characters who have their own lives
- The small victory that feels earned
- The change of season as emotional marker
- The tradition or ritual that creates meaning

**Tropes to Avoid**:
- Artificial drama injection
- Stakes inflation (escalating to "save the world")
- Characters without flaws or conflicts
- Resolution without genuine growth
`,
  },
];

// ============================================================================
// Build Complete Skills Set
// ============================================================================

function buildAllSkillSeeds(): GlobalSkillSeed[] {
  // Generate skills from atoms
  const atomSkills = generateVfsSkillSeeds();

  // Get skill index entries for the catalog
  const atomIndexEntries = getSkillIndexEntries();

  // Add theme index entries
  const themeIndexEntries = THEME_SKILLS.map((skill) => {
    const pathParts = skill.path.split("/");
    const themeName = pathParts[pathParts.length - 2]; // e.g., "fantasy"
    return {
      id: `theme-${themeName}`,
      title: `${themeName.charAt(0).toUpperCase() + themeName.slice(1)} Theme`,
      tags: ["theme", themeName],
      path: skill.path,
    };
  });

  // Combine all index entries
  const allIndexEntries = [...atomIndexEntries, ...themeIndexEntries];

  // Build the complete skills set
  return [
    SKILLS_README_SEED,
    SKILLS_STYLE_SEED,
    SKILLS_TAXONOMY_SEED,
    ...atomSkills,
    ...THEME_SKILLS,
    buildSkillsIndexSeed(allIndexEntries),
  ];
}

// ============================================================================
// Main Export
// ============================================================================

/**
 * Build the complete VFS skills file map
 */
export function buildGlobalVfsSkills(now: number = Date.now()): VfsFileMap {
  const skills = buildAllSkillSeeds();
  const files: VfsFileMap = {};

  for (const seed of skills) {
    const path = normalizeVfsPath(seed.path);
    const content = seed.content;
    const file: VfsFile = {
      path,
      content,
      contentType: seed.contentType,
      hash: hashContent(content),
      size: content.length,
      updatedAt: now,
    };
    files[path] = file;
  }

  return files;
}
