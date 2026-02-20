import { describe, expect, it } from "vitest";
import {
  generateVfsSkillSeeds,
  getSkillIndexEntries,
  getSkillMappings,
} from "../globalSkills/generator";

const ENTITY_KINDS = [
  "character",
  "npc",
  "item",
  "location",
  "quest",
  "knowledge",
  "timeline",
  "faction",
  "causal-chain",
  "skill",
  "condition",
  "trait",
  "attribute",
  "global",
] as const;

const DESIGN_PATHS = ENTITY_KINDS.map(
  (kind) => `gm/actor-design/${kind}` as const,
);
const LOGIC_PATHS = ENTITY_KINDS.map(
  (kind) => `gm/actor-logic/${kind}` as const,
);

const LEGACY_PATHS = [
  "npc/logic",
  "npc/soul",
  "worldbuilding/actors-territory",
  "worldbuilding/actors-territory/locations",
  "worldbuilding/actors-territory/factions",
] as const;

describe("entity skill coverage", () => {
  it("covers all 14 entities with design + logic skills and keeps leaves discoverable", () => {
    const mappings = getSkillMappings();

    for (const path of [...DESIGN_PATHS, ...LOGIC_PATHS]) {
      const mapping = mappings.find((entry) => entry.path === path);
      expect(mapping).toBeDefined();
      expect(mapping?.visibility ?? "catalog").toBe("catalog");
    }

    const npcSoul = mappings.find(
      (entry) => entry.path === "gm/actor-logic/npc-soul",
    );
    expect(npcSoul).toBeDefined();
    expect(npcSoul?.visibility ?? "catalog").toBe("catalog");
  });

  it("removes legacy entity paths from mappings, seeds, and index entries", () => {
    const mappingPaths = getSkillMappings().map((entry) => entry.path);
    const seedPaths = generateVfsSkillSeeds().map((seed) => seed.path);
    const indexPaths = getSkillIndexEntries().map((entry) => entry.path);

    for (const legacy of LEGACY_PATHS) {
      expect(
        mappingPaths.some(
          (path) => path === legacy || path.startsWith(`${legacy}/`),
        ),
      ).toBe(false);
      expect(
        seedPaths.some((path) => path.startsWith(`skills/${legacy}/`)),
      ).toBe(false);
      expect(
        indexPaths.some((path) => path.startsWith(`current/skills/${legacy}/`)),
      ).toBe(false);
    }
  });

  it("indexes all new entity design + logic leaf paths", () => {
    const indexedPaths = new Set(
      getSkillIndexEntries().map((entry) => entry.path),
    );

    for (const path of [
      ...DESIGN_PATHS,
      ...LOGIC_PATHS,
      "gm/actor-logic/npc-soul",
    ]) {
      expect(indexedPaths.has(`current/skills/${path}/SKILL.md`)).toBe(true);
    }
  });
});
