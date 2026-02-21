import { describe, it, expect } from "vitest";
import {
  relationAttitudeSchema,
  relationPerceptionSchema,
  actorProfileSchema,
} from "../zodSchemas";

describe("Dual-layer relations (attitude vs perception)", () => {
  it("allows NPC→player true affinity text only in hidden.affinity", () => {
    const rel = relationAttitudeSchema.strict().parse({
      id: "rel:1",
      kind: "attitude",
      to: { kind: "character", id: "char:player" },
      knownBy: ["char:player"],
      unlocked: false,
      visible: { signals: ["Polite words, guarded eyes"] },
      hidden: {
        affinity: "Guarded trust",
        impression: "Cautiously optimistic",
      },
    });
    expect(rel.hidden?.affinity).toBe("Guarded trust");
  });

  it("rejects placing affinity in attitude.visible", () => {
    expect(() =>
      relationAttitudeSchema.strict().parse({
        id: "rel:1",
        kind: "attitude",
        to: { kind: "character", id: "char:player" },
        knownBy: ["char:player"],
        visible: { signals: ["Cold stare"], affinity: "Guarded trust" },
        hidden: { affinity: "Guarded trust" },
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
        visible: { description: "Seems uneasy", affinity: "Wary" },
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
          hidden: { affinity: "Guarded" },
        },
      ],
    });
    expect(actor.id).toBe("char:npc_1");
  });
});
