import { describe, expect, it } from "vitest";
import {
  createToolCallMessage,
  createToolResponseMessage,
  extractSystemInstruction,
  fromGeminiFormat,
  fromOpenAIFormat,
  getContentMessages,
  toGeminiFormat,
  toOpenAIFormat,
} from "./messageTypes";

describe("messageTypes", () => {
  it("creates assistant tool-call message with reasoning and text", () => {
    const msg = createToolCallMessage(
      [{ id: "call_1", name: "vfs_ls", arguments: { path: "current" } }],
      "I will inspect files",
      "analyze",
    );

    expect(msg.role).toBe("assistant");
    expect(msg.content).toEqual([
      { type: "reasoning", reasoning: "analyze" },
      { type: "text", text: "I will inspect files" },
      {
        type: "tool_use",
        toolUse: {
          id: "call_1",
          name: "vfs_ls",
          args: { path: "current" },
          thoughtSignature: undefined,
        },
      },
    ]);
  });

  it("converts unified messages to gemini format with tool calls/results and media", () => {
    const messages: any[] = [
      { role: "system", content: [{ type: "text", text: "sys" }] },
      {
        role: "assistant",
        content: [
          { type: "text", text: "planning" },
          {
            type: "tool_use",
            toolUse: {
              id: "call_2",
              name: "vfs_read_chars",
              args: { path: "a" },
              thoughtSignature: "sig-1",
            },
          },
        ],
      },
      createToolResponseMessage([
        { toolCallId: "call_2", name: "vfs_read_chars", content: { ok: true } },
      ]),
      {
        role: "user",
        content: [
          { type: "image", mimeType: "image/png", data: "abc" },
          { type: "text", text: "look" },
        ],
      },
    ];

    const gemini = toGeminiFormat(messages);

    expect(gemini).toHaveLength(3);
    expect(gemini[0]).toEqual({
      role: "model",
      parts: [
        { text: "planning" },
        {
          functionCall: {
            id: "call_2",
            name: "vfs_read_chars",
            args: { path: "a" },
          },
          thoughtSignature: "sig-1",
        },
      ],
    });

    expect(gemini[1]).toEqual({
      role: "function",
      parts: [
        {
          functionResponse: {
            id: "call_2",
            name: "vfs_read_chars",
            response: { content: { ok: true } },
          },
        },
      ],
    });

    expect(gemini[2]).toEqual({
      role: "user",
      parts: [
        { inlineData: { mimeType: "image/png", data: "abc" } },
        { text: "look" },
      ],
    });
  });

  it("converts gemini messages back to unified format with role/id mapping", () => {
    const unified = fromGeminiFormat([
      {
        role: "model",
        parts: [
          { text: "hello" },
          { functionCall: { name: "vfs_ls", args: {} } },
        ],
      },
      {
        role: "function",
        parts: [
          { functionResponse: { name: "vfs_ls", response: { content: "ok" } } },
        ],
      },
    ]);

    expect(unified[0]?.role).toBe("assistant");
    expect(unified[0]?.content).toContainEqual({ type: "text", text: "hello" });
    expect(unified[0]?.content).toContainEqual({
      type: "tool_use",
      toolUse: {
        id: "call_vfs_ls",
        name: "vfs_ls",
        args: {},
        thoughtSignature: undefined,
      },
    });

    expect(unified[1]).toEqual({
      role: "tool",
      content: [
        {
          type: "tool_result",
          toolResult: {
            id: "call_vfs_ls",
            name: "vfs_ls",
            content: "ok",
          },
        },
      ],
    });
  });

  it("preserves tool result id in Gemini round-trip", () => {
    const source = createToolResponseMessage([
      { toolCallId: "call_123", name: "vfs_read_chars", content: { ok: true } },
    ]);

    const gemini = toGeminiFormat([source]);
    const unified = fromGeminiFormat(gemini);

    expect(unified).toEqual([
      {
        role: "tool",
        content: [
          {
            type: "tool_result",
            toolResult: {
              id: "call_123",
              name: "vfs_read_chars",
              content: { ok: true },
            },
          },
        ],
      },
    ]);
  });

  it("converts unified messages to openai format", () => {
    const openai = toOpenAIFormat([
      {
        role: "assistant",
        content: [
          { type: "text", text: "I will call tool" },
          {
            type: "tool_use",
            toolUse: {
              id: "call_3",
              name: "vfs_search",
              args: { q: "x" },
              thoughtSignature: "sig-3",
            },
          },
        ],
      },
      createToolResponseMessage([
        { toolCallId: "call_3", name: "vfs_search", content: { results: [1] } },
        { toolCallId: "call_4", name: "vfs_read_chars", content: "raw" },
      ]),
      {
        role: "user",
        content: [
          { type: "text", text: "show me" },
          { type: "image", mimeType: "image/jpeg", data: "base64data" },
        ],
      },
    ] as any);

    expect(openai[0]).toEqual({
      role: "assistant",
      content: "I will call tool",
      tool_calls: [
        {
          id: "call_3",
          type: "function",
          function: {
            name: "vfs_search",
            arguments: JSON.stringify({ q: "x" }),
          },
          extra_content: { google: { thought_signature: "sig-3" } },
        },
      ],
    });

    expect(openai[1]).toEqual({
      role: "tool",
      tool_call_id: "call_3",
      content: JSON.stringify({ results: [1] }),
    });
    expect(openai[2]).toEqual({
      role: "tool",
      tool_call_id: "call_4",
      content: "raw",
    });

    expect(openai[3]).toEqual({
      role: "user",
      content: [
        { type: "text", text: "show me" },
        {
          type: "image_url",
          image_url: { url: "data:image/jpeg;base64,base64data" },
        },
      ],
    });
  });

  it("converts openai messages back to unified format", () => {
    const unified = fromOpenAIFormat([
      {
        role: "assistant",
        content: "tooling",
        tool_calls: [
          {
            id: "call_5",
            function: { name: "vfs_ls", arguments: '{"path":"x"}' },
            extra_content: { google: { thought_signature: "sig-5" } },
          },
        ],
      },
      {
        role: "tool",
        tool_call_id: "call_5",
        name: "vfs_ls",
        content: "ok",
      },
      {
        role: "user",
        content: "plain",
      },
    ]);

    expect(unified[0]).toEqual({
      role: "assistant",
      content: [
        { type: "text", text: "tooling" },
        {
          type: "tool_use",
          toolUse: {
            id: "call_5",
            name: "vfs_ls",
            args: { path: "x" },
            thoughtSignature: "sig-5",
          },
        },
      ],
    });

    expect(unified[1]).toEqual({
      role: "tool",
      content: [
        {
          type: "tool_result",
          toolResult: {
            id: "call_5",
            name: "vfs_ls",
            content: "ok",
          },
        },
      ],
    });

    expect(unified[2]).toEqual({
      role: "user",
      content: [{ type: "text", text: "plain" }],
    });
  });

  it("restores structured tool result content from OpenAI format", () => {
    const source = createToolResponseMessage([
      { toolCallId: "call_9", name: "vfs_json", content: { k: [1, 2, 3] } },
    ]);

    const openai = toOpenAIFormat([source]);
    const unified = fromOpenAIFormat(openai);

    expect(unified).toEqual([
      {
        role: "tool",
        content: [
          {
            type: "tool_result",
            toolResult: {
              id: "call_9",
              name: "unknown",
              content: { k: [1, 2, 3] },
            },
          },
        ],
      },
    ]);
  });

  it("preserves structured tool errors and warnings through OpenAI tool-result round-trip", () => {
    const source = createToolResponseMessage([
      {
        toolCallId: "call_err",
        name: "vfs_read_lines",
        content: {
          success: false,
          code: "INVALID_DATA",
          error: "vfs_read_lines: requested range exceeded limit",
          details: {
            tool: "vfs_read_lines",
            recovery: ["retry with bounded range"],
            hint: {
              code: "READ_LIMIT_HINT",
              summary: "Use smaller windows",
              nextCalls: [
                'vfs_read_lines({ path: "current/world/notes.md", startLine: 1, lineCount: 120 })',
              ],
            },
          },
        },
      },
      {
        toolCallId: "call_warn",
        name: "vfs_read_chars",
        content: {
          success: true,
          data: {
            content: "yz",
            warnings: ["requested end=123 exceeds max end=26; clamped to 26."],
          },
          message: "VFS file read",
        },
      },
    ]);

    const openai = toOpenAIFormat([source]);
    const unified = fromOpenAIFormat(openai);

    expect(unified).toEqual([
      {
        role: "tool",
        content: [
          {
            type: "tool_result",
            toolResult: {
              id: "call_err",
              name: "unknown",
              content: {
                success: false,
                code: "INVALID_DATA",
                error: "vfs_read_lines: requested range exceeded limit",
                details: {
                  tool: "vfs_read_lines",
                  recovery: ["retry with bounded range"],
                  hint: {
                    code: "READ_LIMIT_HINT",
                    summary: "Use smaller windows",
                    nextCalls: [
                      'vfs_read_lines({ path: "current/world/notes.md", startLine: 1, lineCount: 120 })',
                    ],
                  },
                },
              },
            },
          },
        ],
      },
      {
        role: "tool",
        content: [
          {
            type: "tool_result",
            toolResult: {
              id: "call_warn",
              name: "unknown",
              content: {
                success: true,
                data: {
                  content: "yz",
                  warnings: ["requested end=123 exceeds max end=26; clamped to 26."],
                },
                message: "VFS file read",
              },
            },
          },
        ],
      },
    ]);
  });

  it("extracts system instruction and removes system content messages", () => {
    const messages = [
      { role: "system", content: [{ type: "text", text: "A" }] },
      { role: "system", content: [{ type: "text", text: "B" }] },
      { role: "user", content: [{ type: "text", text: "hello" }] },
    ] as any;

    expect(extractSystemInstruction(messages)).toBe("A\n\nB");

    const contentOnly = getContentMessages(messages);
    expect(contentOnly).toEqual([
      { role: "user", content: [{ type: "text", text: "hello" }] },
    ]);
  });
});
