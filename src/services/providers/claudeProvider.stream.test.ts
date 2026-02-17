import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

const mocks = vi.hoisted(() => ({
  messagesCreate: vi.fn(),
  modelsList: vi.fn(),
}));

vi.mock("@anthropic-ai/sdk", () => ({
  default: class AnthropicMock {
    messages = {
      create: mocks.messagesCreate,
      countTokens: vi.fn(),
    };

    models = {
      list: mocks.modelsList,
    };

    constructor(_config: unknown) {}
  },
}));

import { generateContent } from "./claudeProvider";

const makeStream = (events: unknown[]) => ({
  async *[Symbol.asyncIterator]() {
    for (const event of events) {
      yield event;
    }
  },
});

const baseMessages = [
  {
    role: "user",
    content: [{ type: "text", text: "hi" }],
  },
] as any;

describe("claudeProvider streaming tool input parsing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.messagesCreate.mockReset();
    mocks.modelsList.mockResolvedValue({ data: [] });
  });

  it("uses tool_use start input when stream has no input_json_delta", async () => {
    mocks.messagesCreate.mockImplementation(async (params: { stream: boolean }) => {
      if (!params.stream) {
        throw new Error("expected streaming mode");
      }
      return makeStream([
        {
          type: "message_start",
          message: { usage: { input_tokens: 10 } },
        },
        {
          type: "content_block_start",
          index: 0,
          content_block: {
            type: "tool_use",
            id: "toolu_1",
            name: "test_tool",
            input: { foo: "bar" },
          },
        },
        {
          type: "message_delta",
          delta: { stop_reason: "tool_use", stop_sequence: null },
          usage: { output_tokens: 2 },
        },
        { type: "content_block_stop", index: 0 },
        { type: "message_stop" },
      ]);
    });

    const result = await generateContent(
      { apiKey: "test-key" },
      "claude-sonnet-4-5-20250929",
      "system",
      baseMessages,
      undefined,
      {
        tools: [
          {
            name: "test_tool",
            description: "test tool",
            parameters: z.object({ foo: z.string() }),
          },
        ],
        onChunk: vi.fn(),
      },
    );

    const calls = (result.result as { functionCalls?: Array<any> }).functionCalls;
    expect(calls).toHaveLength(1);
    expect(calls?.[0]?.name).toBe("test_tool");
    expect(calls?.[0]?.args).toEqual({ foo: "bar" });
  });

  it("prefers input_json_delta when stream emits partial tool JSON", async () => {
    mocks.messagesCreate.mockImplementation(async (params: { stream: boolean }) => {
      if (!params.stream) {
        throw new Error("expected streaming mode");
      }
      return makeStream([
        {
          type: "content_block_start",
          index: 0,
          content_block: {
            type: "tool_use",
            id: "toolu_2",
            name: "test_tool",
            input: {},
          },
        },
        {
          type: "content_block_delta",
          index: 0,
          delta: {
            type: "input_json_delta",
            partial_json: '{"foo":"baz"}',
          },
        },
        { type: "content_block_stop", index: 0 },
        { type: "message_stop" },
      ]);
    });

    const result = await generateContent(
      { apiKey: "test-key" },
      "claude-sonnet-4-5-20250929",
      "system",
      baseMessages,
      undefined,
      {
        tools: [
          {
            name: "test_tool",
            description: "test tool",
            parameters: z.object({ foo: z.string() }),
          },
        ],
        onChunk: vi.fn(),
      },
    );

    const calls = (result.result as { functionCalls?: Array<any> }).functionCalls;
    expect(calls).toHaveLength(1);
    expect(calls?.[0]?.name).toBe("test_tool");
    expect(calls?.[0]?.args).toEqual({ foo: "baz" });
  });
});
