import { describe, it, expect } from "vitest";
import { buildNpcList } from "../sidebar/NPCPanel";

const createNpc = (overrides: Record<string, unknown> = {}) =>
  ({
    id: "char:npc_1",
    kind: "npc",
    knownBy: ["char:player"],
    currentLocation: "loc:1",
    visible: {
      name: "NPC One",
      description: "A mysterious stranger.",
    },
    relations: [],
    hidden: {},
    ...overrides,
  }) as any;

describe("NPCPanel helpers", () => {
  it("filters unknown NPCs when unlockMode is false", () => {
    const npcs = [
      createNpc({ id: "char:npc_1", knownBy: [] }),
      createNpc({ id: "char:npc_2", knownBy: ["char:player"] }),
    ];

    const result = buildNpcList(npcs, "char:player", false);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("char:npc_2");
  });

  it("includes unknown NPCs when unlockMode is true", () => {
    const npcs = [
      createNpc({ id: "char:npc_1", knownBy: [] }),
      createNpc({ id: "char:npc_2", knownBy: ["char:player"] }),
    ];

    const result = buildNpcList(npcs, "char:player", true);

    expect(result).toHaveLength(2);
  });
});
