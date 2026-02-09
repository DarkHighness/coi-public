import { describe, expect, it, vi } from "vitest";
import { renderEntityContext, renderEntityContextPrimer } from "./entityContext";

const toToonMock = vi.hoisted(() => vi.fn((value: unknown) => `TOON:${JSON.stringify(value)}`));

vi.mock("../../toon", () => ({
  toToon: toToonMock,
}));

describe("entityContext renderer", () => {
  it("renders grouped entities and preserves npc trueName only when different", () => {
    const output = renderEntityContext({
      npcs: [
        { id: "npc:1", name: "Iris", trueName: "Irisa" },
        { id: "npc:2", name: "Rook", trueName: "Rook" },
      ],
      items: [{ id: "item:1", name: "Compass" }],
      locations: [{ id: "loc:1", name: "Harbor" }],
      quests: [{ id: "quest:1", name: "Find Ledger" }],
      knowledge: [{ id: "know:1", name: "Rift Law" }],
      factions: [{ id: "fac:1", name: "Veil" }],
      timeline: [{ id: "evt:1", name: "Blackout" }],
      conditions: [{ id: "cond:1", name: "Moon Venom" }],
    });

    expect(output).toContain("<current_entities>");
    expect(output).toContain("Use these IDs when editing");
    expect(output).toContain("For NPCs: \"name\" is what player knows");
    expect(toToonMock).toHaveBeenCalledTimes(1);

    const payload = toToonMock.mock.calls[0][0] as any;
    expect(payload.npcs).toEqual([
      { id: "npc:1", name: "Iris", trueName: "Irisa" },
      { id: "npc:2", name: "Rook" },
    ]);
    expect(payload.items).toEqual([{ id: "item:1", name: "Compass" }]);
    expect(payload.conditions).toEqual([{ id: "cond:1", name: "Moon Venom" }]);
  });

  it("still renders context wrapper when no entities exist", () => {
    const output = renderEntityContext({});

    expect(output).toContain("<current_entities>");
    expect(output).toContain("TOON:{}");
  });

  it("renders summary primer with selected category counts", () => {
    const output = renderEntityContextPrimer({
      npcs: [{ id: "npc:1", name: "Iris" }],
      items: [{ id: "item:1", name: "Compass" }],
      locations: [{ id: "loc:1", name: "Harbor" }],
      knowledge: [{ id: "know:1", name: "Rift Law" }],
    });

    expect(output).toContain("<entity_summary>");
    expect(output).toContain("NPCs: 1");
    expect(output).toContain("Items: 1");
    expect(output).toContain("Locations: 1");
    expect(output).toContain("Knowledge: 1");
    expect(output).not.toContain("Factions:");
  });

  it("returns No entities primer when no groups are provided", () => {
    expect(renderEntityContextPrimer({})).toBe(
      "<entity_summary>No entities</entity_summary>",
    );
  });
});
