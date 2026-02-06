import { describe, it, expect } from "vitest";
import { z } from "zod";
import { getVfsSchemaHint } from "../utils";
import { pickHintSignatureLines } from "../../__tests__/utils/schemaHint";

describe("getVfsSchemaHint", () => {
  it("keeps a stable object hint format and filters internal/invisible fields", () => {
    const schema = z.object({
      id: z.string().describe("ID"),
      createdAt: z.number(),
      visible: z.object({
        name: z.string().describe("Name"),
        note: z.string().optional().describe("Note"),
      }),
      tags: z.array(z.string()).describe("Tags"),
      items: z
        .array(
          z.object({
            code: z.string(),
            qty: z.number().optional(),
          }),
        )
        .optional()
        .describe("Items"),
      hiddenField: z.string().describe("INVISIBLE secret"),
    });

    const hint = getVfsSchemaHint(schema);

    expect(hint).not.toContain("createdAt");
    expect(hint).not.toContain("hiddenField");

    const signatureLines = pickHintSignatureLines(hint, [
      "id:",
      "visible:",
      "name:",
      "note?:",
      "tags:",
      "items?:",
    ]);

    expect(signatureLines).toMatchInlineSnapshot(`
      [
        "id: string; // ID",
        "visible: {",
        "name: string; // Name",
        "note?: string; // Note",
        "tags: Array<string>; // Tags",
        "items?: Array<{",
      ]
    `);
  });

  it("keeps discriminated union rendering stable in array fields", () => {
    const patchSchema = z.discriminatedUnion("op", [
      z.object({
        op: z.literal("add"),
        path: z.string(),
        value: z.string(),
      }),
      z.object({
        op: z.literal("remove"),
        path: z.string(),
      }),
    ]);

    const schema = z.object({
      patch: z.array(patchSchema).describe("Patch"),
    });

    expect(getVfsSchemaHint(schema)).toMatchInlineSnapshot(`
      "{
        patch: Array<{
          op: \"add\";
          path: string;
          value: string;
        } | {
          op: \"remove\";
          path: string;
        }>; // Patch
      }"
    `);
  });
});
