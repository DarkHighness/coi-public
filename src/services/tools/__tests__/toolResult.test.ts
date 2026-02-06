import { describe, expect, it } from "vitest";
import { createError, createSuccess } from "../toolResult";

describe("toolResult helpers", () => {
  it("creates success envelopes with payload and message", () => {
    expect(createSuccess({ id: "npc:1" }, "updated")).toEqual({
      success: true,
      data: { id: "npc:1" },
      message: "updated",
    });
  });

  it("creates error envelopes with default and custom codes", () => {
    expect(createError("missing")).toEqual({
      success: false,
      error: "missing",
      code: "UNKNOWN",
    });

    expect(createError("bad", "INVALID_DATA")).toEqual({
      success: false,
      error: "bad",
      code: "INVALID_DATA",
    });
  });
});
