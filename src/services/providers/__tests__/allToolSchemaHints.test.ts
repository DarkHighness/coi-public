import { describe, expect, it } from "vitest";
import { ALL_DEFINED_TOOLS } from "../../tools";
import { getToolInfo, getToolSchemaHint } from "../utils";

describe("all tool schema hints", () => {
  it("do not expose unhelpful any/unknown types", () => {
    const offenders: Array<{ name: string; lines: string[] }> = [];
    const badLineRe = /:\s*any\b|:\s*unknown\b|Record<string,\s*any>/;

    for (const tool of ALL_DEFINED_TOOLS) {
      const hint = getToolSchemaHint(tool.parameters);
      const lines = hint.split("\n").filter((line) => badLineRe.test(line));
      if (lines.length > 0) {
        offenders.push({ name: tool.name, lines });
      }
    }

    expect(offenders).toEqual([]);
  });

  it("keeps final tool_info parameters free of any/unknown type hints", () => {
    const offenders: Array<{ name: string; lines: string[] }> = [];
    const badTypeLineRe =
      /:\s*any\b|:\s*unknown\b|Record<string,\s*any>|Array<\s*any\s*>|Array<\s*unknown\s*>/;

    for (const tool of ALL_DEFINED_TOOLS) {
      const toolInfo = getToolInfo(tool);
      const lines = toolInfo
        .split("\n")
        .filter((line) => badTypeLineRe.test(line));
      if (lines.length > 0) {
        offenders.push({ name: tool.name, lines });
      }
    }

    expect(offenders).toEqual([]);
  });
});
