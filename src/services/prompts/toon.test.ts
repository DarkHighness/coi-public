import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const encodeMock = vi.hoisted(() => vi.fn((value: unknown) => `encoded:${JSON.stringify(value)}`));

vi.mock("@toon-format/toon", () => ({
  encode: encodeMock,
}));

import { toToon } from "./toon";

describe("toToon", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns empty string for falsy input", () => {
    expect(toToon(null)).toBe("");
    expect(toToon(undefined)).toBe("");
    expect(encodeMock).not.toHaveBeenCalled();
  });

  it("returns encoded toon content when encode succeeds", () => {
    const result = toToon({ theme: "fantasy" });

    expect(result).toBe('encoded:{"theme":"fantasy"}');
    expect(encodeMock).toHaveBeenCalledWith({ theme: "fantasy" });
  });

  it("falls back to JSON and warns when toon encode throws", () => {
    encodeMock.mockImplementationOnce(() => {
      throw new Error("boom");
    });
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const payload = { scene: "dock", state: { fog: true } };
    const result = toToon(payload);

    expect(warnSpy).toHaveBeenCalled();
    expect(result).toBe(JSON.stringify(payload, null));
  });
});
