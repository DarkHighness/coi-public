import type { VfsFile, VfsFileMap } from "../types";
import { hashContent, normalizeVfsPath } from "../utils";
import type { GlobalSkillSeed } from "./types";
import {
  SKILLS_README_SEED,
  SKILLS_STYLE_SEED,
  SKILLS_TAXONOMY_SEED,
  buildSkillsIndexSeed,
  type SkillIndexEntry,
} from "./manifest";
import { WRITING_SKILLS } from "./writing";
import { THEME_SKILLS_EXTENDED } from "./theme";
import { GM_SKILLS } from "./gm";
import { WORLDBUILDING_SKILLS } from "./worldbuilding";
import { PSYCHOLOGY_SKILLS } from "./psychology";

const ALL_SKILL_SEEDS: GlobalSkillSeed[] = [
  SKILLS_README_SEED,
  SKILLS_STYLE_SEED,
  SKILLS_TAXONOMY_SEED,
  ...WRITING_SKILLS,
  ...THEME_SKILLS_EXTENDED,
  ...GM_SKILLS,
  ...WORLDBUILDING_SKILLS,
  ...PSYCHOLOGY_SKILLS,
];

const SKILL_INDEX: SkillIndexEntry[] = [
  {
    id: "writing-sensory-detail",
    title: "Sensory Detail (Decision-Relevant)",
    tags: ["writing", "description", "immersion", "scene"],
    path: "skills/writing-sensory-detail/SKILL.md",
  },
  {
    id: "writing-dialogue",
    title: "Dialogue (Intent + Subtext + Power)",
    tags: ["writing", "dialogue", "character", "subtext"],
    path: "skills/writing-dialogue/SKILL.md",
  },
  {
    id: "writing-pacing",
    title: "Pacing (Pressure + Cost + Payoff)",
    tags: ["writing", "structure", "rhythm", "turns"],
    path: "skills/writing-pacing/SKILL.md",
  },
  {
    id: "writing-scene-anchoring",
    title: "Scene Anchoring (Spatial Clarity)",
    tags: ["writing", "clarity", "spatial", "continuity"],
    path: "skills/writing-scene-anchoring/SKILL.md",
  },
  {
    id: "writing-character-voice",
    title: "Character Voice (NPC Differentiation)",
    tags: ["writing", "dialogue", "character"],
    path: "skills/writing-character-voice/SKILL.md",
  },
  {
    id: "writing-clue-seeding",
    title: "Clue Seeding (Residue + Contradiction)",
    tags: ["writing", "mystery", "investigation"],
    path: "skills/writing-clue-seeding/SKILL.md",
  },
  {
    id: "writing-action-clarity",
    title: "Action Clarity (Combat / Chase / Stealth)",
    tags: ["writing", "action", "clarity"],
    path: "skills/writing-action-clarity/SKILL.md",
  },
  {
    id: "writing-emotion-without-mindreading",
    title: "Emotion Without Mind‑Reading (Body / Perception / Consequence)",
    tags: ["writing", "emotion", "immersion"],
    path: "skills/writing-emotion-without-mindreading/SKILL.md",
  },
  {
    id: "writing-reveal-control",
    title: "Reveal Control (Evidence + Friction)",
    tags: ["writing", "reveal", "clarity"],
    path: "skills/writing-reveal-control/SKILL.md",
  },
  {
    id: "writing-subtext",
    title: "Subtext (Intent + Risk + What’s Not Said)",
    tags: ["writing", "dialogue", "subtext", "social"],
    path: "skills/writing-subtext/SKILL.md",
  },
  {
    id: "writing-foreshadowing",
    title: "Foreshadowing (Constraints + Residue + Payoff)",
    tags: ["writing", "structure", "setup-payoff", "continuity"],
    path: "skills/writing-foreshadowing/SKILL.md",
  },
  {
    id: "writing-suspense",
    title: "Suspense (Questions + Delays + Pressure)",
    tags: ["writing", "tension", "pacing", "mystery"],
    path: "skills/writing-suspense/SKILL.md",
  },
  {
    id: "writing-multi-character-scenes",
    title: "Multi‑Character Scenes (Staging + Turn Economy)",
    tags: ["writing", "scene", "dialogue", "clarity"],
    path: "skills/writing-multi-character-scenes/SKILL.md",
  },
  {
    id: "writing-recap-without-repetition",
    title: "Recap Without Repetition (Residue + Goals + Constraints)",
    tags: ["writing", "clarity", "structure", "continuity"],
    path: "skills/writing-recap-without-repetition/SKILL.md",
  },
  {
    id: "writing-twist-fairness",
    title: "Twist Fairness (Surprise + Retrospect Clarity)",
    tags: ["writing", "structure", "setup-payoff", "mystery"],
    path: "skills/writing-twist-fairness/SKILL.md",
  },
  {
    id: "writing-multi-thread-plot-control",
    title: "Multi‑Thread Plot Control (Threads + Interleaving)",
    tags: ["writing", "structure", "continuity", "pacing"],
    path: "skills/writing-multi-thread-plot-control/SKILL.md",
  },
  {
    id: "writing-pov-discipline",
    title: "POV Discipline (Perception + Inference + Limits)",
    tags: ["writing", "pov", "clarity", "immersion"],
    path: "skills/writing-pov-discipline/SKILL.md",
  },
  {
    id: "writing-scene-objectives",
    title: "Scene Objectives (Objective + Obstacle + Outcome)",
    tags: ["writing", "scene", "structure", "choices"],
    path: "skills/writing-scene-objectives/SKILL.md",
  },
  {
    id: "writing-arc-milestones",
    title: "Arc Milestones (State Changes Across Acts)",
    tags: ["writing", "structure", "pacing", "setup-payoff"],
    path: "skills/writing-arc-milestones/SKILL.md",
  },
  {
    id: "writing-reliable-narration",
    title: "Reliable Narration (Observation + Source + Consistency)",
    tags: ["writing", "clarity", "continuity", "pov"],
    path: "skills/writing-reliable-narration/SKILL.md",
  },
  {
    id: "writing-micro-goals-per-turn",
    title: "Micro‑Goals Per Turn (Momentum Without Filler)",
    tags: ["writing", "pacing", "turns", "choices"],
    path: "skills/writing-micro-goals-per-turn/SKILL.md",
  },
  {
    id: "writing-scene-transitions",
    title: "Scene Transitions (Continuity + Pressure)",
    tags: ["writing", "continuity", "pacing"],
    path: "skills/writing-scene-transitions/SKILL.md",
  },
  {
    id: "writing-object-affordances",
    title: "Object Affordances (Props That Create Play)",
    tags: ["writing", "props", "playability"],
    path: "skills/writing-object-affordances/SKILL.md",
  },
  {
    id: "writing-injury-and-fatigue",
    title: "Injury and Fatigue (Costs That Change Play)",
    tags: ["writing", "stakes", "consequences"],
    path: "skills/writing-injury-and-fatigue/SKILL.md",
  },
  {
    id: "theme-fantasy",
    title: "Fantasy Theme (Material + Cost + Institutions)",
    tags: ["theme", "fantasy", "worldbuilding"],
    path: "skills/theme-fantasy/SKILL.md",
  },
  {
    id: "theme-scifi",
    title: "Sci‑Fi Theme (Constraints + Failure + Society)",
    tags: ["theme", "scifi", "worldbuilding"],
    path: "skills/theme-scifi/SKILL.md",
  },
  {
    id: "theme-noir",
    title: "Noir Theme (Leverage + Moral Cost)",
    tags: ["theme", "noir", "tone", "dialogue"],
    path: "skills/theme-noir/SKILL.md",
  },
  {
    id: "theme-horror",
    title: "Horror Theme (Uncertainty + Escalation)",
    tags: ["theme", "horror", "tension"],
    path: "skills/theme-horror/SKILL.md",
  },
  {
    id: "theme-romance",
    title: "Romance Theme (Vulnerability + Choice)",
    tags: ["theme", "romance", "relationships", "stakes"],
    path: "skills/theme-romance/SKILL.md",
  },
  {
    id: "theme-cyberpunk",
    title: "Cyberpunk Theme (Debt + Surveillance + Identity)",
    tags: ["theme", "cyberpunk", "scifi", "systems"],
    path: "skills/theme-cyberpunk/SKILL.md",
  },
  {
    id: "theme-wuxia",
    title: "Wuxia Theme (Honor + Reputation + Obligation)",
    tags: ["theme", "wuxia", "martial", "social"],
    path: "skills/theme-wuxia/SKILL.md",
  },
  {
    id: "theme-mystery",
    title: "Mystery Theme (Solvable Uncertainty)",
    tags: ["theme", "mystery", "investigation"],
    path: "skills/theme-mystery/SKILL.md",
  },
  {
    id: "theme-slice-of-life",
    title: "Slice‑of‑Life Theme (Routines + Small Stakes)",
    tags: ["theme", "slice-of-life", "everyday", "texture"],
    path: "skills/theme-slice-of-life/SKILL.md",
  },
  {
    id: "theme-post-apocalypse",
    title: "Post‑Apocalypse Theme (Scarcity + Logistics + New Orders)",
    tags: ["theme", "post-apocalypse", "survival", "worldbuilding"],
    path: "skills/theme-post-apocalypse/SKILL.md",
  },
  {
    id: "theme-western",
    title: "Western Theme (Jurisdiction + Reputation + Distance)",
    tags: ["theme", "western", "law", "reputation"],
    path: "skills/theme-western/SKILL.md",
  },
  {
    id: "theme-heist",
    title: "Heist Theme (Security + Roles + Clocks + Fallout)",
    tags: ["theme", "heist", "systems", "pressure"],
    path: "skills/theme-heist/SKILL.md",
  },
  {
    id: "theme-political-thriller",
    title: "Political Thriller Theme (Institutions + Deniability)",
    tags: ["theme", "political", "institutions", "investigation"],
    path: "skills/theme-political-thriller/SKILL.md",
  },
  {
    id: "theme-steampunk",
    title: "Steampunk Theme (Industry + Class + Patents)",
    tags: ["theme", "steampunk", "industry", "institutions"],
    path: "skills/theme-steampunk/SKILL.md",
  },
  {
    id: "theme-space-opera",
    title: "Space Opera Theme (Empire + Logistics + Identity)",
    tags: ["theme", "space-opera", "scifi", "factions"],
    path: "skills/theme-space-opera/SKILL.md",
  },
  {
    id: "theme-military",
    title: "Military Theme (Orders + Logistics + ROE)",
    tags: ["theme", "military", "combat", "institutions"],
    path: "skills/theme-military/SKILL.md",
  },
  {
    id: "theme-espionage",
    title: "Espionage Theme (Tradecraft + Deniability + Burn Risk)",
    tags: ["theme", "espionage", "investigation", "systems"],
    path: "skills/theme-espionage/SKILL.md",
  },
  {
    id: "theme-gothic",
    title: "Gothic Theme (Inheritance + Secrecy + Decay)",
    tags: ["theme", "gothic", "horror", "architecture"],
    path: "skills/theme-gothic/SKILL.md",
  },
  {
    id: "theme-urban-fantasy",
    title: "Urban Fantasy Theme (Hidden Rules + Modern Systems)",
    tags: ["theme", "urban-fantasy", "fantasy", "modern"],
    path: "skills/theme-urban-fantasy/SKILL.md",
  },
  {
    id: "theme-mythic-epic",
    title: "Mythic Epic Theme (Vows + Omens + Institutions)",
    tags: ["theme", "mythic", "epic", "institutions"],
    path: "skills/theme-mythic-epic/SKILL.md",
  },
  {
    id: "theme-legal-drama",
    title: "Legal Drama Theme (Procedure + Evidence + Jurisdiction)",
    tags: ["theme", "legal", "institutions", "investigation"],
    path: "skills/theme-legal-drama/SKILL.md",
  },
  {
    id: "theme-medical-thriller",
    title: "Medical Thriller Theme (Triage + Ethics + Systems)",
    tags: ["theme", "medical", "thriller", "institutions"],
    path: "skills/theme-medical-thriller/SKILL.md",
  },
  {
    id: "theme-corporate-drama",
    title: "Corporate Drama Theme (Incentives + Bureaucracy + Reputation)",
    tags: ["theme", "corporate", "institutions", "social"],
    path: "skills/theme-corporate-drama/SKILL.md",
  },
  {
    id: "theme-occult-detective",
    title: "Occult Detective Theme (Rules + Residue + Institutions)",
    tags: ["theme", "occult", "detective", "investigation"],
    path: "skills/theme-occult-detective/SKILL.md",
  },
  {
    id: "theme-dark-fantasy",
    title: "Dark Fantasy Theme (Corruption + Institutions + Hope)",
    tags: ["theme", "dark-fantasy", "fantasy", "worldbuilding"],
    path: "skills/theme-dark-fantasy/SKILL.md",
  },
  {
    id: "theme-fae-courts",
    title: "Fae Courts Theme (Contracts + Names + Etiquette)",
    tags: ["theme", "fae", "fantasy", "social"],
    path: "skills/theme-fae-courts/SKILL.md",
  },
  {
    id: "theme-police-procedural",
    title: "Police Procedural Theme (Jurisdiction + Evidence + Procedure)",
    tags: ["theme", "police", "procedure", "investigation"],
    path: "skills/theme-police-procedural/SKILL.md",
  },
  {
    id: "theme-startup-tech",
    title: "Startup / Tech Theme (Velocity + Debt + Incentives)",
    tags: ["theme", "tech", "startup", "institutions"],
    path: "skills/theme-startup-tech/SKILL.md",
  },
  {
    id: "theme-finance-thriller",
    title: "Finance Thriller Theme (Leverage + Compliance + Liquidity)",
    tags: ["theme", "finance", "thriller", "institutions"],
    path: "skills/theme-finance-thriller/SKILL.md",
  },
  {
    id: "theme-holy-inquisition",
    title: "Holy Inquisition Theme (Doctrine + Procedure + Confession)",
    tags: ["theme", "religion", "institutions", "fantasy"],
    path: "skills/theme-holy-inquisition/SKILL.md",
  },
  {
    id: "theme-infernal-bureaucracy",
    title: "Infernal Bureaucracy Theme (Contracts + Quotas + Procedure)",
    tags: ["theme", "infernal", "contracts", "institutions"],
    path: "skills/theme-infernal-bureaucracy/SKILL.md",
  },
  {
    id: "theme-cosmic-horror",
    title: "Cosmic Horror Theme (Scale + Rules + Contamination)",
    tags: ["theme", "cosmic-horror", "horror", "tension"],
    path: "skills/theme-cosmic-horror/SKILL.md",
  },
  {
    id: "gm-cause-effect",
    title: "Cause → Effect Consistency (Residue + Reaction)",
    tags: ["gm", "consistency", "continuity", "stakes"],
    path: "skills/gm-cause-effect/SKILL.md",
  },
  {
    id: "gm-anti-vague-language",
    title: "Anti‑Vague Language (Evidence + Constraint)",
    tags: ["gm", "clarity", "precision"],
    path: "skills/gm-anti-vague-language/SKILL.md",
  },
  {
    id: "gm-choice-design",
    title: "Choice Design (Tradeoffs)",
    tags: ["gm", "choices", "agency"],
    path: "skills/gm-choice-design/SKILL.md",
  },
  {
    id: "gm-clocks-and-pressure",
    title: "Clocks and Pressure (Escalation)",
    tags: ["gm", "pacing", "pressure"],
    path: "skills/gm-clocks-and-pressure/SKILL.md",
  },
  {
    id: "gm-npc-agency",
    title: "NPC Agency (Goals + Constraints + Tactics)",
    tags: ["gm", "npcs", "world-sim"],
    path: "skills/gm-npc-agency/SKILL.md",
  },
  {
    id: "gm-failure-and-complications",
    title: "Failure and Complications (Costs That Bite)",
    tags: ["gm", "failure", "stakes"],
    path: "skills/gm-failure-and-complications/SKILL.md",
  },
  {
    id: "gm-investigation-structure",
    title: "Investigation Structure (Clue Webs)",
    tags: ["gm", "investigation", "mystery"],
    path: "skills/gm-investigation-structure/SKILL.md",
  },
  {
    id: "gm-social-conflict",
    title: "Social Conflict (Stakes + Leverage)",
    tags: ["gm", "social", "negotiation"],
    path: "skills/gm-social-conflict/SKILL.md",
  },
  {
    id: "gm-quest-design",
    title: "Quest Design (Pressure + Information)",
    tags: ["gm", "quests", "structure"],
    path: "skills/gm-quest-design/SKILL.md",
  },
  {
    id: "gm-reward-and-relief",
    title: "Reward and Relief (Payouts That Don’t Reset Stakes)",
    tags: ["gm", "rewards", "pacing"],
    path: "skills/gm-reward-and-relief/SKILL.md",
  },
  {
    id: "gm-vfs-reading",
    title: "VFS Reading Workflow",
    tags: ["gm", "tools", "vfs"],
    path: "skills/gm-vfs-reading/SKILL.md",
  },
  {
    id: "gm-spotlight-rotation",
    title: "Spotlight Rotation (Fair Attention)",
    tags: ["gm", "table", "agency", "pacing"],
    path: "skills/gm-spotlight-rotation/SKILL.md",
  },
  {
    id: "gm-scene-framing",
    title: "Scene Framing (Start Sharp, End Hooked)",
    tags: ["gm", "structure", "pacing", "clarity"],
    path: "skills/gm-scene-framing/SKILL.md",
  },
  {
    id: "gm-combat-clarity",
    title: "Combat Clarity (Telegraph + Geometry + Cost)",
    tags: ["gm", "combat", "clarity", "stakes"],
    path: "skills/gm-combat-clarity/SKILL.md",
  },
  {
    id: "gm-resource-pressure",
    title: "Resource Pressure (Scarcity + Tradeoffs + Residue)",
    tags: ["gm", "resources", "pressure", "pacing"],
    path: "skills/gm-resource-pressure/SKILL.md",
  },
  {
    id: "gm-encounter-design",
    title: "Encounter Design (Pressure + Gates + Methods)",
    tags: ["gm", "encounters", "choices", "structure"],
    path: "skills/gm-encounter-design/SKILL.md",
  },
  {
    id: "gm-heist-runner",
    title: "Heist Runner (Windows + Clocks + Gates)",
    tags: ["gm", "heist", "structure", "pressure"],
    path: "skills/gm-heist-runner/SKILL.md",
  },
  {
    id: "worldbuilding-location-as-system",
    title: "Location as a System (Rules + Routines)",
    tags: ["worldbuilding", "locations", "playability"],
    path: "skills/worldbuilding-location-as-system/SKILL.md",
  },
  {
    id: "worldbuilding-faction-dynamics",
    title: "Faction Dynamics (Assets + Escalation)",
    tags: ["worldbuilding", "factions", "politics"],
    path: "skills/worldbuilding-faction-dynamics/SKILL.md",
  },
  {
    id: "worldbuilding-economy-friction",
    title: "Economy Friction (Scarcity + Logistics)",
    tags: ["worldbuilding", "economy", "constraints"],
    path: "skills/worldbuilding-economy-friction/SKILL.md",
  },
  {
    id: "worldbuilding-law-and-jurisdiction",
    title: "Law and Jurisdiction (Procedures + Permissions)",
    tags: ["worldbuilding", "law", "institutions", "constraints"],
    path: "skills/worldbuilding-law-and-jurisdiction/SKILL.md",
  },
  {
    id: "worldbuilding-magic-system-constraints",
    title: "Magic Systems (Constraints + Costs + Residue)",
    tags: ["worldbuilding", "magic", "constraints", "institutions"],
    path: "skills/worldbuilding-magic-system-constraints/SKILL.md",
  },
  {
    id: "worldbuilding-travel-and-distance",
    title: "Travel and Distance (Time + Exposure + Logistics)",
    tags: ["worldbuilding", "travel", "logistics", "pressure"],
    path: "skills/worldbuilding-travel-and-distance/SKILL.md",
  },
  {
    id: "worldbuilding-culture-and-ritual",
    title: "Culture and Ritual (Rules People Live By)",
    tags: ["worldbuilding", "culture", "rituals", "social"],
    path: "skills/worldbuilding-culture-and-ritual/SKILL.md",
  },
  {
    id: "worldbuilding-infrastructure-and-utilities",
    title: "Infrastructure and Utilities (Constraints + Control Points)",
    tags: ["worldbuilding", "infrastructure", "logistics", "institutions"],
    path: "skills/worldbuilding-infrastructure-and-utilities/SKILL.md",
  },
  {
    id: "worldbuilding-history-as-residue",
    title: "History as Residue (Scars + Records + Taboos)",
    tags: ["worldbuilding", "history", "continuity", "constraints"],
    path: "skills/worldbuilding-history-as-residue/SKILL.md",
  },
  {
    id: "psychology-character-complexity",
    title: "Character Complexity (Shadows Within Light)",
    tags: ["psychology", "character", "complexity", "shadows"],
    path: "skills/psychology-character-complexity/SKILL.md",
  },
  {
    id: "psychology-moral-dilemma",
    title: "Moral Dilemma (No Clean Answers)",
    tags: ["psychology", "moral", "dilemma", "choices"],
    path: "skills/psychology-moral-dilemma/SKILL.md",
  },
  {
    id: "psychology-emotional-ambivalence",
    title: "Emotional Ambivalence (Simultaneity, Not Alternation)",
    tags: ["psychology", "emotion", "ambivalence", "conflict"],
    path: "skills/psychology-emotional-ambivalence/SKILL.md",
  },
];

const GLOBAL_SKILLS: GlobalSkillSeed[] = [
  ...ALL_SKILL_SEEDS,
  buildSkillsIndexSeed(SKILL_INDEX),
];

export function buildGlobalVfsSkills(now: number = Date.now()): VfsFileMap {
  const files: VfsFileMap = {};
  for (const seed of GLOBAL_SKILLS) {
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
