import { describe, expect, it } from "vitest";
import { buildCacheHint } from "../cacheHint";

describe("buildCacheHint", () => {
  it("returns deterministic key for same inputs", () => {
    const inputMessages = [{ role: "system", content: "A" }];

    const first = buildCacheHint("openai", "sys", inputMessages);
    const second = buildCacheHint("openai", "sys", inputMessages);

    expect(first).toEqual(second);
    expect(first).toMatchObject({
      protocol: "openai",
      cacheKey: expect.stringMatching(/^coi:/),
    });
  });

  it("changes key when prompt material changes", () => {
    const base = buildCacheHint("openrouter", "sys", [{ id: 1 }]);
    const changedInstruction = buildCacheHint("openrouter", "sys-2", [
      { id: 1 },
    ]);
    const changedMessages = buildCacheHint("openrouter", "sys", [{ id: 2 }]);

    expect((base as any).cacheKey).not.toBe(
      (changedInstruction as any).cacheKey,
    );
    expect((base as any).cacheKey).not.toBe((changedMessages as any).cacheKey);
  });

  it("maps protocol-specific hint shapes", () => {
    expect(buildCacheHint("gemini", "sys", [])).toMatchObject({
      protocol: "gemini",
      cachedContentName: expect.stringMatching(/^coi:/),
    });

    expect(buildCacheHint("openai", "sys", [])).toMatchObject({
      protocol: "openai",
      cacheKey: expect.stringMatching(/^coi:/),
    });

    expect(buildCacheHint("openrouter", "sys", [])).toMatchObject({
      protocol: "openrouter",
      cacheKey: expect.stringMatching(/^coi:/),
    });

    expect(buildCacheHint("claude", "sys", [])).toMatchObject({
      protocol: "claude",
      cacheKey: expect.stringMatching(/^coi:/),
    });
  });
});
