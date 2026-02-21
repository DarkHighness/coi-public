import { describe, expect, it } from "vitest";
import { vfsToolRegistry } from "../../vfs/tools";
import {
  createClaudeCompatibleTool,
  createGeminiCompatibleTool,
  createOpenAITool,
  createOpenRouterGeminiTool,
  createOpenRouterTool,
  zodToGemini,
  zodToClaudeCompatibleSchema,
} from "../../zodCompiler";
import { collectToolSchemaContractIssues } from "../toolSchemaContracts";

type Profile = {
  name: string;
  compile: (tool: {
    name: string;
    description: string;
    parameters: any;
  }) => unknown;
  forbidAnyOf?: boolean;
  forbidTypeArray?: boolean;
};

describe("provider/tool schema contract matrix", () => {
  it("keeps every tool schema contract-valid across provider compilation paths", () => {
    const tools = vfsToolRegistry.getDefinitions();

    const profiles: Profile[] = [
      {
        name: "openai-strict",
        compile: (tool) =>
          createOpenAITool(tool.name, tool.description, tool.parameters)
            .function.parameters,
      },
      {
        name: "openrouter-standard",
        compile: (tool) =>
          createOpenRouterTool(tool.name, tool.description, tool.parameters)
            .function.parameters,
      },
      {
        name: "openrouter-gemini",
        compile: (tool) =>
          createOpenRouterGeminiTool(
            tool.name,
            tool.description,
            tool.parameters,
          ).function.parameters,
        forbidAnyOf: true,
        forbidTypeArray: true,
      },
      {
        name: "openai-gemini-compatible",
        compile: (tool) =>
          createGeminiCompatibleTool(
            tool.name,
            tool.description,
            tool.parameters,
          ).function.parameters,
        forbidAnyOf: true,
        forbidTypeArray: true,
      },
      {
        name: "openai-claude-compatible",
        compile: (tool) =>
          createClaudeCompatibleTool(
            tool.name,
            tool.description,
            tool.parameters,
          ).function.parameters,
      },
      {
        name: "gemini-native",
        compile: (tool) => zodToGemini(tool.parameters),
      },
      {
        name: "claude-native-input_schema",
        compile: (tool) => {
          const schema = zodToClaudeCompatibleSchema(tool.parameters);
          return {
            type: "object",
            properties: schema.properties ?? {},
            ...(Array.isArray(schema.required) && schema.required.length > 0
              ? { required: schema.required }
              : {}),
          };
        },
      },
    ];

    const issues: Array<{ profile: string; tool: string; issue: string }> = [];

    for (const profile of profiles) {
      for (const tool of tools) {
        const compiled = profile.compile(tool);
        const contractIssues = collectToolSchemaContractIssues(compiled, {
          forbidAnyOf: profile.forbidAnyOf,
          forbidTypeArray: profile.forbidTypeArray,
        });
        for (const issue of contractIssues) {
          issues.push({
            profile: profile.name,
            tool: tool.name,
            issue: `${issue.path}: ${issue.message}`,
          });
        }
      }
    }

    expect(issues).toEqual([]);
  });
});
