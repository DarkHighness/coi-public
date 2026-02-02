import { describe, it, expect } from "vitest";
import { buildNpcList } from "../sidebar/NPCPanel";

const createNpc = (overrides: Record<string, unknown> = {}) =>
  ({
    id: "npc-1",
    known: true,
    currentLocation: "loc:1",
    visible: {
      name: "NPC One",
      npcType: "Stranger",
      affinity: 0,
      affinityKnown: false,
      description: "A mysterious stranger.",
    },
    hidden: {},
    ...overrides,
  }) as any;

describe("NPCPanel helpers", () => {
  it("filters unknown NPCs when unlockMode is false", () => {
    const npcs = [
      createNpc({ id: "npc-1", known: false }),
      createNpc({ id: "npc-2", known: true }),
    ];

    const result = buildNpcList(npcs, false);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("npc-2");
  });

  it("includes unknown NPCs when unlockMode is true", () => {
    const npcs = [
      createNpc({ id: "npc-1", known: false }),
      createNpc({ id: "npc-2", known: true }),
    ];

    const result = buildNpcList(npcs, true);

    expect(result).toHaveLength(2);
  });
});
