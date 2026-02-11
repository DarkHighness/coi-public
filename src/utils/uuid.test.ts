import { afterEach, describe, expect, it, vi } from "vitest";
import { generateUUID } from "./uuid";

describe("generateUUID", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("uses crypto.randomUUID when available", () => {
    vi.stubGlobal("crypto", {
      randomUUID: vi.fn(() => "uuid-from-randomUUID"),
    });

    expect(generateUUID()).toBe("uuid-from-randomUUID");
  });

  it("falls back to crypto.getRandomValues when randomUUID is absent", () => {
    vi.stubGlobal("crypto", {
      getRandomValues: (arr: Uint8Array) => {
        arr[0] = 15;
        return arr;
      },
    });

    const uuid = generateUUID();
    expect(uuid).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
  });

  it("falls back to Math.random pattern when crypto is unavailable", () => {
    vi.stubGlobal("crypto", undefined);

    const uuid = generateUUID();
    expect(uuid).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
  });
});
