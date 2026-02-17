import { describe, it, expect } from "vitest";
import { vfsToolRegistry } from "../tools";
import { buildGlobalVfsToolDocs } from "../globalRefs/toolDocs";

describe("tool docs examples validation", () => {
  it("keeps tool docs/examples aligned with registry and schema", () => {
    const defs = vfsToolRegistry.getDefinitions();
    const names = new Set(defs.map((d) => d.name));
    const docs = buildGlobalVfsToolDocs();

    const toolIndexRaw = docs["refs/tools/index.json"]?.content;
    expect(toolIndexRaw).toBeTruthy();

    const toolIndex = JSON.parse(toolIndexRaw as string) as {
      tools: Array<{ name: string }>;
    };

    const indexNames = new Set(toolIndex.tools.map((t) => t.name));
    expect(indexNames.size).toBe(names.size);

    for (const name of names) {
      expect(indexNames.has(name)).toBe(true);
      expect(docs[`refs/tools/${name}/README.md`]).toBeTruthy();
      expect(docs[`refs/tools/${name}/EXAMPLES.md`]).toBeTruthy();
      expect(docs[`refs/tool-schemas/${name}/README.md`]).toBeTruthy();
    }

    for (const tool of defs) {
      const examplesPath = `refs/tools/${tool.name}/EXAMPLES.md`;
      const content = docs[examplesPath]?.content;
      expect(content).toBeTruthy();

      const blocks = [
        ...(content as string).matchAll(/```json\n([\s\S]*?)\n```/g),
      ].map((m) => m[1]);
      expect(blocks.length).toBeGreaterThan(0);

      blocks.forEach((block, index) => {
        const parsedJson = JSON.parse(block);
        const parsed = (tool.parameters as any).safeParse(parsedJson);
        expect(
          parsed.success,
          `${tool.name} example #${index + 1} failed: ${
            parsed.success
              ? "ok"
              : parsed.error.issues
                  .map(
                    (issue: any) =>
                      `${issue.path.join(".") || "<root>"}: ${issue.message}`,
                  )
                  .join("; ")
          }`,
        ).toBe(true);
      });
    }
  });
});
