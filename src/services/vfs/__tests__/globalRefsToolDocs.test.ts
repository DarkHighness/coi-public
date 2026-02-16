import { describe, expect, it } from "vitest";
import { vfsToolRegistry } from "../tools";
import { buildGlobalVfsRefs } from "../globalRefs";

const definedTools = vfsToolRegistry.getDefinitions();

describe("VFS global refs tool docs", () => {
  it("generates refs/tools README and index", () => {
    const files = buildGlobalVfsRefs();
    const readme = files["refs/tools/README.md"]?.content ?? "";
    const indexRaw = files["refs/tools/index.json"]?.content ?? "{}";
    const index = JSON.parse(indexRaw) as {
      count?: number;
      tools?: Array<{ name: string; path: string }>;
    };

    expect(readme).toContain("Generated from `vfsToolRegistry.getDefinitions()`.");
    expect(readme).toContain('vfs_ls({ path: "current/refs/tools" })');
    expect(index.count).toBe(definedTools.length);
    expect(index.tools?.length).toBe(definedTools.length);
  });

  it("emits one markdown doc per defined tool with INTRO/SCHEMA/EXAMPLES sections", () => {
    const files = buildGlobalVfsRefs();

    for (const tool of definedTools) {
      const path = `refs/tools/${tool.name}.md`;
      const doc = files[path]?.content ?? "";
      expect(doc).toContain(`# ${tool.name}`);
      expect(doc).toContain("## INTRO");
      expect(doc).toContain("## SCHEMA");
      expect(doc).toContain("## EXAMPLES");
      expect(doc).toContain("```ts");
      expect(doc).toContain("```json");
    }
  });
});
