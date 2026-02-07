import { describe, it, expect } from "vitest";
import { z } from "zod";
import { getToolSchemaHint } from "../utils";

describe("getToolSchemaHint", () => {
  it("renders discriminated unions with literal op variants", () => {
    const patchSchema = z.discriminatedUnion("op", [
      z.object({
        op: z.literal("add"),
        path: z.string(),
        value: z.string(),
      }),
      z.object({
        op: z.literal("move"),
        path: z.string(),
        from: z.string(),
      }),
    ]);

    const schema = z.object({
      edits: z.array(
        z.object({
          path: z.string(),
          patch: z.array(patchSchema),
        }),
      ),
    });

    const hint = getToolSchemaHint(schema);

    expect(hint).toContain('op: "add"');
    expect(hint).toContain('op: "move"');
    expect(hint).toContain("from: string");
    expect(hint).toContain("value: string");
  });

  it("expands default-wrapped nested objects instead of showing any", () => {
    const relationSchema = z.discriminatedUnion("kind", [
      z.object({
        kind: z.literal("attitude"),
        visible: z
          .object({
            signals: z.array(z.string()).optional(),
          })
          .strict(),
      }),
      z.object({
        kind: z.literal("perception"),
        visible: z
          .object({
            description: z.string(),
            evidence: z.array(z.string()).optional(),
          })
          .strict(),
      }),
    ]);

    const schema = z.object({
      data: z.object({
        relations: z.array(relationSchema).default([]),
        placeholders: z
          .array(
            z.object({
              id: z.string(),
              visible: z.object({ description: z.string() }),
            }),
          )
          .default([]),
      }),
    });

    const hint = getToolSchemaHint(schema);

    expect(hint).toContain("relations?");
    expect(hint).toContain('kind: "attitude"');
    expect(hint).toContain("signals?: Array<string>");
    expect(hint).toContain('kind: "perception"');
    expect(hint).toContain("description: string");
    expect(hint).toContain("placeholders?");
    expect(hint).toContain("visible: {");
    expect(hint).not.toContain("relations?: any");
    expect(hint).not.toContain("placeholders?: any");
  });

  it("maps any/unknown to JsonValue-friendly hints", () => {
    const schema = z.object({
      unknownField: z.unknown(),
      anyField: z.any(),
      recordUnknown: z.record(z.unknown()),
    });

    const hint = getToolSchemaHint(schema);

    expect(hint).toContain("unknownField: JsonValue");
    expect(hint).toContain("anyField: JsonValue");
    expect(hint).toContain("recordUnknown: Record<string, JsonValue>");
    expect(hint).not.toContain(": any");
    expect(hint).not.toContain(": unknown");
    expect(hint).not.toContain("Record<string, any>");
  });
});
