import { describe, it, expect } from "vitest";
import { extractOpenRouterToolCalls } from "../openRouterToolParser";

describe("extractOpenRouterToolCalls", () => {
  it("parses tool_calls (OpenAI style)", () => {
    const message = {
      tool_calls: [
        {
          id: "call_1",
          function: {
            name: "vfs_write_file",
            arguments: JSON.stringify({
              files: [
                {
                  path: "current/world/global.json",
                  content: "{}",
                  contentType: "application/json",
                },
              ],
            }),
          },
        },
      ],
    };

    const calls = extractOpenRouterToolCalls(message);

    expect(calls).toHaveLength(1);
    expect(calls[0].name).toBe("vfs_write_file");
    expect(calls[0].args).toEqual({
      files: [
        {
          path: "current/world/global.json",
          content: "{}",
          contentType: "application/json",
        },
      ],
    });
  });

  it("parses toolCalls (camelCase)", () => {
    const message = {
      toolCalls: [
        {
          id: "call_2",
          function: {
            name: "vfs_read_chars",
            arguments: JSON.stringify({ path: "current/world/global.json" }),
          },
        },
      ],
    };

    const calls = extractOpenRouterToolCalls(message);

    expect(calls).toHaveLength(1);
    expect(calls[0].name).toBe("vfs_read_chars");
    expect(calls[0].args).toEqual({ path: "current/world/global.json" });
  });

  it("falls back to root name/arguments when function payload is empty", () => {
    const message = {
      tool_calls: [
        {
          id: "call_legacy",
          function: {},
          name: "vfs_read_lines",
          arguments: JSON.stringify({
            path: "current/world/global.json",
            startLine: 1,
            endLine: 5,
          }),
        },
      ],
    };

    const calls = extractOpenRouterToolCalls(message);

    expect(calls).toHaveLength(1);
    expect(calls[0].name).toBe("vfs_read_lines");
    expect(calls[0].args).toEqual({
      path: "current/world/global.json",
      startLine: 1,
      endLine: 5,
    });
  });

  it("ignores non-function tool-like payload entries", () => {
    const message = {
      tool_calls: [
        {
          id: "call_1",
          function: {
            name: "vfs_read_chars",
            arguments: JSON.stringify({ path: "current/world/global.json" }),
          },
        },
        {
          type: "url_citation",
          url_citation: {
            url: "https://example.com",
          },
        },
      ],
    };

    const calls = extractOpenRouterToolCalls(message);

    expect(calls).toHaveLength(1);
    expect(calls[0].name).toBe("vfs_read_chars");
  });
});
