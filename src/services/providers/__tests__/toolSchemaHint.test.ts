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
});
