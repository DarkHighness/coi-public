import { describe, expect, it } from "vitest";
import { vfsToolRegistry } from "../tools";
import { buildGlobalVfsRefs } from "../globalRefs";

const definedTools = vfsToolRegistry.getDefinitions();

describe("VFS global refs tool docs", () => {
  it("generates tools index with in-folder schema paths", () => {
    const files = buildGlobalVfsRefs();
    const readme = files["refs/tools/README.md"]?.content ?? "";
    const toolsIndexRaw = files["refs/tools/index.json"]?.content ?? "{}";
    const toolsIndex = JSON.parse(toolsIndexRaw) as {
      count?: number;
      tools?: Array<{
        name: string;
        overviewPath: string;
        examplesPath: string;
        schemaPath: string;
      }>;
    };

    expect(readme).toContain(
      "Generated from `vfsToolRegistry.getDefinitions()`.",
    );
    expect(readme).toContain(
      'vfs_read_json({ path: "current/refs/tools/index.json" })',
    );
    expect(readme).toContain(
      'vfs_read_lines({ path: "current/refs/tools/vfs_read_markdown/SCHEMA.md", startLine: 1, lineCount: 120 })',
    );
    expect(readme).not.toContain("## SCHEMA");
    expect(readme).not.toContain("## EXAMPLES");
    expect(readme).not.toContain("tool-schemas");
    expect(readme).not.toContain("PART-");
    expect(toolsIndex.count).toBe(definedTools.length);
    expect(toolsIndex.tools?.length).toBe(definedTools.length);
    expect(
      (toolsIndex.tools ?? []).every(
        (entry) =>
          entry.schemaPath === `current/refs/tools/${entry.name}/SCHEMA.md`,
      ),
    ).toBe(true);
    expect(Object.keys(files).some((path) => path.startsWith("refs/tool-schemas"))).toBe(
      false,
    );
  });

  it("emits per-tool docs (overview/examples/schema) in tools folder", () => {
    const files = buildGlobalVfsRefs();

    for (const tool of definedTools) {
      const overviewPath = `refs/tools/${tool.name}/README.md`;
      const examplesPath = `refs/tools/${tool.name}/EXAMPLES.md`;
      const schemaPath = `refs/tools/${tool.name}/SCHEMA.md`;
      const overview = files[overviewPath]?.content ?? "";
      const examples = files[examplesPath]?.content ?? "";
      const schema = files[schemaPath]?.content ?? "";

      expect(overview).toContain(`# ${tool.name}`);
      expect(overview).toContain("## INTRO");
      expect(overview).toContain("## WHERE TO READ NEXT");
      expect(examples).toContain(`# ${tool.name} Examples`);
      expect(examples).toContain("```json");
      expect(schema).toContain(`# ${tool.name} Schema`);
      expect(schema).toContain("```ts");
    }
  });
});
