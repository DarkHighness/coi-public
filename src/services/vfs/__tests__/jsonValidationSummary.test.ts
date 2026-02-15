import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
  formatJsonValidationSummary,
  summarizeJsonValidationError,
} from "../jsonValidationSummary";

describe("jsonValidationSummary", () => {
  it("keeps long zod issue messages without truncation", () => {
    const longMessage = `invalid payload ${"x".repeat(260)}`;
    const schema = z.object({
      field: z.string().superRefine((_value, ctx) => {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: longMessage,
        });
      }),
    });

    let caught: unknown = null;
    try {
      schema.parse({ field: "value" });
    } catch (error) {
      caught = error;
    }

    const summaries = summarizeJsonValidationError(caught, { field: "value" });
    expect(summaries).not.toBeNull();
    expect(summaries?.[0]?.message).toBe(longMessage);
  });

  it("formats summary with pointer, message and directSubfields", () => {
    const schema = z
      .object({
        visible: z
          .object({
            title: z.string(),
          })
          .strict(),
      })
      .strict();

    let caught: unknown = null;
    try {
      schema.parse({
        visible: { title: "ok", extra: true },
      });
    } catch (error) {
      caught = error;
    }

    const summaries = summarizeJsonValidationError(caught, {
      visible: { title: "ok", extra: true },
    });
    expect(summaries).not.toBeNull();
    const formatted = formatJsonValidationSummary(summaries ?? []);
    expect(formatted).toContain("/visible");
    expect(formatted).toContain("Unrecognized key(s) in object");
    expect(formatted).toContain("directSubfields=[title, extra]");
  });
});
