import { describe, it, expect } from "vitest";
import type { VfsFileMap } from "../types";
import { hashContent } from "../utils";
import { deriveGameStateFromVfs } from "../derivations";

const makeJsonFile = (path: string, data: unknown) => {
  const content = JSON.stringify(data);
  return {
    path,
    content,
    contentType: "application/json" as const,
    hash: hashContent(content),
    size: content.length,
    updatedAt: 0,
  };
};

describe("deriveGameStateFromVfs", () => {
  it("derives global, character, and inventory state", () => {
    const files: VfsFileMap = {
      "world/global.json": makeJsonFile("world/global.json", {
        time: "Day 2, 10:00",
        theme: "wuxia",
        currentLocation: "loc:inn",
        atmosphere: { envTheme: "wuxia", ambience: "rainy" },
        turnNumber: 3,
        forkId: 1,
      }),
      "world/character.json": makeJsonFile("world/character.json", {
        name: "Arin",
        title: "Wanderer",
        status: "Healthy",
        attributes: [],
        skills: [],
        conditions: [],
        hiddenTraits: [],
        appearance: "Travel-worn",
        age: "21",
        profession: "Scout",
        background: "Raised on the frontier.",
        race: "Human Male",
        currentLocation: "loc:inn",
      }),
      "world/inventory/inv_key.json": makeJsonFile(
        "world/inventory/inv_key.json",
        {
          id: "inv_key",
          name: "Rusty Key",
          visible: {
            description: "A rusted iron key.",
          },
        },
      ),
    };

    const state = deriveGameStateFromVfs(files);

    expect(state.time).toBe("Day 2, 10:00");
    expect(state.theme).toBe("wuxia");
    expect(state.currentLocation).toBe("loc:inn");
    expect(state.atmosphere).toEqual({ envTheme: "wuxia", ambience: "rainy" });
    expect(state.turnNumber).toBe(3);
    expect(state.forkId).toBe(1);
    expect(state.character.name).toBe("Arin");
    expect(state.inventory).toHaveLength(1);
    expect(state.inventory[0]?.id).toBe("inv_key");
  });
});
