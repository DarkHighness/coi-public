import { describe, expect, it } from "vitest";
import { vfsToolRegistry } from "../../vfs/tools";
import {
  createOpenRouterGeminiTool,
  type OpenAISchema,
} from "../../zodCompiler";
import { collectToolSchemaContractIssues } from "../toolSchemaContracts";

describe("OpenRouter Gemini tool schema guardrails", () => {
  it("keeps compiled schemas free of anyOf and required/property mismatch", () => {
    const tools = vfsToolRegistry.getDefinitions();

    for (const tool of tools) {
      const compiled = createOpenRouterGeminiTool(
        tool.name,
        tool.description,
        tool.parameters,
      ).function.parameters;
      const issues = collectToolSchemaContractIssues(compiled, {
        forbidAnyOf: true,
        forbidTypeArray: true,
      });
      expect(
        issues.map((issue) => `${issue.path}: ${issue.message}`),
        tool.name,
      ).toEqual([]);
    }
  });

  it("keeps vfs_patch_json patch item required keys aligned", () => {
    const tool = vfsToolRegistry
      .getDefinitions()
      .find((entry) => entry.name === "vfs_patch_json");
    expect(tool).toBeDefined();
    if (!tool) return;

    const compiled = createOpenRouterGeminiTool(
      tool.name,
      tool.description,
      tool.parameters,
    ).function.parameters;
    const patchSchema = compiled.properties?.patch;
    expect(patchSchema).toBeDefined();
    if (!patchSchema) return;
    const itemSchema = patchSchema.items;
    expect(itemSchema).toBeDefined();
    if (!itemSchema || typeof itemSchema !== "object") return;

    const itemObject = itemSchema as OpenAISchema;
    expect(itemObject.required).toEqual(expect.arrayContaining(["op", "path"]));
    expect(itemObject.properties?.op).toBeDefined();
    expect(itemObject.properties?.path).toBeDefined();
  });
});
