import { beforeEach, describe, expect, it, vi } from "vitest";
import { VfsSession } from "../../vfs/vfsSession";

const geminiCountTokensMock = vi.hoisted(() => vi.fn());

vi.mock("../../providers/geminiProvider", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("../../providers/geminiProvider")>();
  return {
    ...actual,
    countTokens: geminiCountTokensMock,
  };
});

import { dispatchToolCallAsync } from "../handlers";

const createGeminiContext = (session: VfsSession) =>
  ({
    vfsSession: session,
    settings: {
      story: {
        providerId: "provider-gemini",
        modelId: "gemini-2.0-flash",
      },
      providers: {
        instances: [
          {
            id: "provider-gemini",
            name: "Gemini",
            protocol: "gemini",
            enabled: true,
            apiKey: "sk-test",
            baseUrl: "",
            createdAt: 0,
            lastModified: 1,
          },
        ],
      },
    },
  }) as any;

describe("VFS read handlers with provider token counting", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("enforces read budget using provider count_tokens results", async () => {
    geminiCountTokensMock.mockResolvedValue(2_000_000);
    const session = new VfsSession();
    session.writeFile("world/notes.txt", "short content", "text/plain");
    const ctx = createGeminiContext(session);

    const result = (await dispatchToolCallAsync(
      "vfs_read_chars",
      { path: "current/world/notes.txt" },
      ctx,
    )) as any;

    expect(result.success).toBe(false);
    expect(result.code).toBe("INVALID_DATA");
    expect(result.error).toContain("payload token count");
    expect(geminiCountTokensMock).toHaveBeenCalled();
  });

  it("falls back after provider count failure and still returns data", async () => {
    geminiCountTokensMock
      .mockRejectedValueOnce(new Error("remote-down"))
      .mockRejectedValueOnce(new Error("remote-down"));
    const session = new VfsSession();
    session.writeFile("world/notes.txt", "small text", "text/plain");
    const ctx = createGeminiContext(session);

    const result = (await dispatchToolCallAsync(
      "vfs_read_chars",
      { path: "current/world/notes.txt" },
      ctx,
    )) as any;

    expect(result.success).toBe(true);
    expect(result.data.content).toBe("small text");
    expect(geminiCountTokensMock).toHaveBeenCalledTimes(2);
  });
});
