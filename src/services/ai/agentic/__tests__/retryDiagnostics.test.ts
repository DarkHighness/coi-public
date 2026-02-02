import { describe, it, expect, vi } from "vitest";
import { z } from "zod";
import { callWithAgenticRetry } from "../retry";

describe("callWithAgenticRetry diagnostics", () => {
  it("logs invalid tool arguments for diagnostics", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const toolSchema = z.object({ foo: z.string() });

    const provider = {
      protocol: "openrouter",
      instanceId: "test",
      instance: {},
      generateChat: async () => ({
        result: {
          functionCalls: [
            {
              id: "call-1",
              name: "test_tool",
              args: {},
            },
          ],
          content: "",
        },
        usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
        raw: null,
      }),
    };

    await expect(
      callWithAgenticRetry(
        provider as any,
        {
          modelId: "test-model",
          systemInstruction: "",
          messages: [],
          tools: [
            { name: "test_tool", description: "test", parameters: toolSchema },
          ],
        },
        [],
        { maxRetries: 0 },
      ),
    ).rejects.toThrow();

    const logged = warn.mock.calls.some((call) =>
      String(call[0]).includes("[ToolValidation] test_tool"),
    );
    expect(logged).toBe(true);
    warn.mockRestore();
  });
});
