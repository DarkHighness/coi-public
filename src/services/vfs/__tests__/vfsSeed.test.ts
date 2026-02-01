import { describe, it, expect } from "vitest";
import { VfsSession } from "../vfsSession";
import { deriveGameStateFromVfs } from "../derivations";
import { seedVfsSessionFromGameState } from "../seed";

describe("seedVfsSessionFromGameState", () => {
  it("writes world/global and entity files", () => {
    const state = deriveGameStateFromVfs({});
    state.turnNumber = 1;
    state.forkId = 0;
    state.inventory = [
      {
        id: "inv_key",
        name: "Key",
        visible: { description: "A key." },
      } as any,
    ];

    const session = new VfsSession();
    seedVfsSessionFromGameState(session, state);

    expect(session.readFile("world/global.json")).toBeTruthy();
    expect(session.readFile("world/inventory/inv_key.json")).toBeTruthy();
  });
});
