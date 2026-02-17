import { describe, expect, it } from "vitest";
import { vfsToolRegistry } from "../tools";
import { buildGlobalVfsRefs } from "../globalRefs";

const definedTools = vfsToolRegistry.getDefinitions();

describe("VFS global refs tool docs", () => {
  it("generates split tool/schema indexes", () => {
    const files = buildGlobalVfsRefs();
    const readme = files["refs/tools/README.md"]?.content ?? "";
    const toolsIndexRaw = files["refs/tools/index.json"]?.content ?? "{}";
    const schemaIndexRaw =
      files["refs/tool-schemas/index.json"]?.content ?? "{}";
    const toolsIndex = JSON.parse(toolsIndexRaw) as {
      count?: number;
      tools?: Array<{
        name: string;
        overviewPath: string;
        examplesPath: string;
        schemaSummaryPath: string;
        schemaPartPaths: string[];
      }>;
    };
    const schemaIndex = JSON.parse(schemaIndexRaw) as {
      count?: number;
      schemas?: Array<{
        name: string;
        summaryPath: string;
        partPaths: string[];
      }>;
    };

    expect(readme).toContain(
      "Generated from `vfsToolRegistry.getDefinitions()`.",
    );
    expect(readme).toContain(
      'vfs_read_json({ path: "current/refs/tools/index.json" })',
    );
    expect(readme).toContain(
      'vfs_read_json({ path: "current/refs/tool-schemas/index.json" })',
    );
    expect(readme).not.toContain("## SCHEMA");
    expect(readme).not.toContain("## EXAMPLES");
    expect(toolsIndex.count).toBe(definedTools.length);
    expect(toolsIndex.tools?.length).toBe(definedTools.length);
    expect(schemaIndex.count).toBe(definedTools.length);
    expect(schemaIndex.schemas?.length).toBe(definedTools.length);
  });

  it("emits per-tool split docs (overview/examples/schema summary + schema parts)", () => {
    const files = buildGlobalVfsRefs();

    for (const tool of definedTools) {
      const overviewPath = `refs/tools/${tool.name}/README.md`;
      const examplesPath = `refs/tools/${tool.name}/EXAMPLES.md`;
      const schemaSummaryPath = `refs/tool-schemas/${tool.name}/README.md`;
      const overview = files[overviewPath]?.content ?? "";
      const examples = files[examplesPath]?.content ?? "";
      const schemaSummary = files[schemaSummaryPath]?.content ?? "";

      expect(overview).toContain(`# ${tool.name}`);
      expect(overview).toContain("## INTRO");
      expect(overview).toContain("## WHERE TO READ NEXT");
      expect(examples).toContain(`# ${tool.name} Examples`);
      expect(examples).toContain("```json");
      expect(schemaSummary).toContain(`# ${tool.name} Schema`);
      expect(schemaSummary).toContain("## Parts");

      const partFiles = Object.keys(files).filter(
        (path) =>
          path.startsWith(`refs/tool-schemas/${tool.name}/PART-`) &&
          path.endsWith(".md"),
      );
      expect(partFiles.length).toBeGreaterThan(0);
      expect(files[partFiles[0]]?.content ?? "").toContain("```ts");
    }
  });
});
