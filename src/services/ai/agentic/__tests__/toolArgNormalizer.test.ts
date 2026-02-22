import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
  formatToolArgCoercionSummary,
  normalizeToolArgs,
} from "../toolArgs/normalize";

describe("tool arg normalizer", () => {
  it("repairs stringified object args for finish assistant payload", () => {
    const schema = z
      .object({
        assistant: z
          .object({
            narrative: z.string(),
            choices: z.array(z.object({ text: z.string() }).strict()).min(1),
          })
          .strict(),
      })
      .strict();

    const result = normalizeToolArgs({
      schema,
      args: {
        assistant: JSON.stringify({
          narrative: "narrative",
          choices: [{ text: "choice-a" }],
        }),
      },
    });

    expect(result.changed).toBe(true);
    expect(schema.safeParse(result.args).success).toBe(true);
    expect((result.args as any).assistant).toEqual({
      narrative: "narrative",
      choices: [{ text: "choice-a" }],
    });
  });

  it("repairs stringified array args for vfs_vm.scripts", () => {
    const schema = z
      .object({
        scripts: z.array(z.string()).length(1),
      })
      .strict();

    const result = normalizeToolArgs({
      schema,
      args: {
        scripts:
          '["async function main(ctx) { await ctx.call(\\"vfs_ls\\", { path: \\"current\\" }); }"]',
      },
    });

    expect(result.changed).toBe(true);
    expect(schema.safeParse(result.args).success).toBe(true);
    expect(Array.isArray((result.args as any).scripts)).toBe(true);
    expect((result.args as any).scripts[0]).toContain("async function main");
  });

  it("returns clear normalization summary when malformed JSON cannot be repaired", () => {
    const schema = z
      .object({
        scripts: z.array(z.string()).min(2),
      })
      .strict();

    const result = normalizeToolArgs({
      schema,
      args: {
        scripts: "not-json-at-all",
      },
    });

    expect(schema.safeParse(result.args).success).toBe(false);
    const summary = formatToolArgCoercionSummary(result.coercions);
    expect(summary).toContain("parse_json_string_to_array");
    expect(summary).toContain("failed");
    expect(summary).toContain("JSON.parse failed");
  });

  it("applies narrow string coercion for integer/boolean fields", () => {
    const schema = z
      .object({
        phase: z.number().int(),
        force: z.boolean(),
      })
      .strict();

    const result = normalizeToolArgs({
      schema,
      args: {
        phase: "42",
        force: "true",
      },
    });

    expect(schema.safeParse(result.args).success).toBe(true);
    expect((result.args as any).phase).toBe(42);
    expect((result.args as any).force).toBe(true);
  });

  it("normalizes enum string by case/separator without semantic guessing", () => {
    const schema = z
      .object({
        protocol: z.enum(["player-rate", "turn"]),
      })
      .strict();

    const result = normalizeToolArgs({
      schema,
      args: {
        protocol: "Player_Rate",
      },
    });

    expect(schema.safeParse(result.args).success).toBe(true);
    expect((result.args as any).protocol).toBe("player-rate");
  });

  it("wraps scalar into array only when minItems <= 1 and item type is simple", () => {
    const schema = z
      .object({
        tags: z.array(z.string()).max(3),
      })
      .strict();

    const result = normalizeToolArgs({
      schema,
      args: {
        tags: "single-tag",
      },
    });

    expect(schema.safeParse(result.args).success).toBe(true);
    expect((result.args as any).tags).toEqual(["single-tag"]);
  });

  it("does not auto-wrap scalar for array fields with minItems > 1", () => {
    const schema = z
      .object({
        choices: z.array(z.string()).min(2),
      })
      .strict();

    const result = normalizeToolArgs({
      schema,
      args: {
        choices: "only-one",
      },
    });

    expect(result.changed).toBe(false);
    expect((result.args as any).choices).toBe("only-one");
    expect(schema.safeParse(result.args).success).toBe(false);
  });

  it("skips string-to-structured coercion on ambiguous string|array unions", () => {
    const schema = z
      .object({
        payload: z
          .union([z.string(), z.array(z.string())])
          .superRefine((value, ctx) => {
            if (typeof value === "string") {
              ctx.addIssue({
                code: z.ZodIssueCode.invalid_type,
                expected: "array",
                received: "string",
                message: "Expected array, received string",
              } as any);
            }
          }),
      })
      .strict();

    const result = normalizeToolArgs({
      schema,
      args: {
        payload: '["a"]',
      },
    });

    expect(result.changed).toBe(false);
    expect((result.args as any).payload).toBe('["a"]');
    expect(schema.safeParse(result.args).success).toBe(false);
    expect(formatToolArgCoercionSummary(result.coercions)).toContain(
      "ambiguous union",
    );
  });
});
