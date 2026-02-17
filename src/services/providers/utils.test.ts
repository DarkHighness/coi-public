import { describe, expect, it, vi } from "vitest";
import { withRetry } from "./utils";
import { AIProviderError } from "./types";

describe("provider withRetry", () => {
  it("does not retry when long-request streaming transport is required", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const fn = vi
      .fn()
      .mockRejectedValue(
        new Error(
          "Streaming is required for operations that may take longer than 10 minutes. See long-requests docs.",
        ),
      );

    await expect(withRetry(fn, 3, 0, "claude")).rejects.toThrow(
      "Streaming is required",
    );
    expect(fn).toHaveBeenCalledTimes(1);
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it("still retries transient errors", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const randomSpy = vi.spyOn(Math, "random").mockReturnValue(0);
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error("503 service unavailable"))
      .mockResolvedValueOnce("ok");

    const result = await withRetry(fn, 3, 0, "claude");

    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(2);
    expect(warn).toHaveBeenCalledTimes(1);
    warn.mockRestore();
    randomSpy.mockRestore();
  });

  it("does not retry STREAM_TIMEOUT provider errors", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const fn = vi
      .fn()
      .mockRejectedValue(
        new AIProviderError(
          "stream exceeded timeout guard",
          "claude",
          "STREAM_TIMEOUT",
        ),
      );

    await expect(withRetry(fn, 3, 0, "claude")).rejects.toThrow(
      "stream exceeded timeout guard",
    );
    expect(fn).toHaveBeenCalledTimes(1);
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it("does not retry STREAM_INCOMPLETE provider errors", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const fn = vi
      .fn()
      .mockRejectedValue(
        new AIProviderError(
          "stream ended before a complete message was assembled",
          "claude",
          "STREAM_INCOMPLETE",
        ),
      );

    await expect(withRetry(fn, 3, 0, "claude")).rejects.toThrow(
      "stream ended before a complete message was assembled",
    );
    expect(fn).toHaveBeenCalledTimes(1);
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });
});
