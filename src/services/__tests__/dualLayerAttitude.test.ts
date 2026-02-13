import { describe, it, expect } from "vitest";
import {
  relationAttitudeSchema,
  relationPerceptionSchema,
  actorProfileSchema,
} from "../zodSchemas";

describe("Dual-layer relations (attitude vs perception)", () => {
  it("allows NPC→player true affinity only in hidden.affinity", () => {
    const rel = relationAttitudeSchema.strict().parse({
      id: "rel:1",
      kind: "attitude",
      to: { kind: "character", id: "char:player" },
      knownBy: ["char:player"],
      unlocked: false,
      visible: { signals: ["Polite words, guarded eyes"] },
      hidden: { affinity: 42, impression: "Cautiously optimistic" },
    });
    expect(rel.hidden?.affinity).toBe(42);
  });

  it("rejects placing numeric affinity in attitude.visible", () => {
    expect(() =>
      relationAttitudeSchema.strict().parse({
        id: "rel:1",
        kind: "attitude",
        to: { kind: "character", id: "char:player" },
        knownBy: ["char:player"],
        visible: { signals: ["Cold stare"], affinity: 12 },
        hidden: { affinity: 12 },
      }),
    ).toThrow();
  });

  it("rejects placing affinity in player→npc perception", () => {
    expect(() =>
      relationPerceptionSchema.strict().parse({
        id: "rel:1",
        kind: "perception",
        to: { kind: "character", id: "char:npc_1" },
        knownBy: ["char:player"],
        visible: { description: "Seems uneasy", affinity: 10 },
      }),
    ).toThrow();
  });

  it("accepts an actor profile with relations using strict schema", () => {
    const actor = actorProfileSchema.strict().parse({
      id: "char:npc_1",
      kind: "npc",
      currentLocation: "loc:1",
      knownBy: ["char:player"],
      visible: { name: "Bob" },
      relations: [
        {
          id: "rel:attitude",
          kind: "attitude",
          to: { kind: "character", id: "char:player" },
          knownBy: ["char:player"],
          visible: { signals: ["Keeps distance"] },
          hidden: { affinity: 12 },
        },
      ],
    });
    expect(actor.id).toBe("char:npc_1");
  });
});
