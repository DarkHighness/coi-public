import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { vfsToolRegistry } from "../../../../vfs/tools";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const OUTLINE_FINISH_TOOL_PREFIX = "vfs_finish_outline_";

describe("outline read-only toolset parity", () => {
  it("keeps outline read-only allowlist aligned with registry", () => {
    const outlineDriverPath = path.resolve(__dirname, "../outline.ts");
    const source = fs.readFileSync(outlineDriverPath, "utf8");

    const allowlistMatch = source.match(
      /const READ_ONLY_VFS_TOOL_DEFS:[\s\S]*?\];/,
    );
    expect(allowlistMatch).not.toBeNull();
    const allowlistSource = allowlistMatch?.[0] ?? "";

    const manualAllowlist = Array.from(
      allowlistSource.matchAll(/getDefinition\("([^"]+)"\)/g),
      (match) => match[1],
    ).sort();
    const registryReadOnlyAllowlist = vfsToolRegistry
      .getToolset("outline")
      .tools.filter(
        (toolName) => !toolName.startsWith(OUTLINE_FINISH_TOOL_PREFIX),
      )
      .sort();

    expect(manualAllowlist).toEqual(registryReadOnlyAllowlist);
  });

  it("allows read-only markdown path validation in outline flow", () => {
    const outlineDriverPath = path.resolve(__dirname, "../outline.ts");
    const source = fs.readFileSync(outlineDriverPath, "utf8");

    expect(source).toMatch(/toolName === "vfs_read_markdown"/);
  });
});
