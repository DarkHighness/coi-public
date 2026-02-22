import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { getTurnRuntimeFloor } from "../runtimeFloor";
import { normalTurnInstruction } from "../atoms/core";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const FORBIDDEN_TOOL_CONFLICT_PATTERNS: RegExp[] = [
  /ONLY THE RAW JSON/i,
  /Failure to output raw JSON/i,
  /must output\s+raw\s+json/i,
  /output raw json will cause a system error/i,
];

const collectPromptSourceFiles = (rootDir: string): string[] => {
  const files: string[] = [];
  const stack = [rootDir];

  while (stack.length > 0) {
    const dir = stack.pop()!;
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === "__tests__") continue;
        stack.push(fullPath);
        continue;
      }
      if (!entry.isFile()) continue;
      if (!entry.name.endsWith(".ts")) continue;
      if (entry.name.endsWith(".test.ts")) continue;
      files.push(fullPath);
    }
  }

  return files;
};

describe("tool-calling prompt guardrails", () => {
  it("has no tool-calling vs raw-JSON conflicting directives", () => {
    const promptSourceRoot = path.resolve(__dirname, "..");
    const outlineDriverPath = path.resolve(
      __dirname,
      "../../ai/agentic/outline/outline.ts",
    );

    const filesToScan = [
      ...collectPromptSourceFiles(promptSourceRoot),
      outlineDriverPath,
    ];

    const findings: Array<{ file: string; line: number; text: string }> = [];

    for (const filePath of filesToScan) {
      const content = fs.readFileSync(filePath, "utf8");
      const lines = content.split(/\r?\n/);

      lines.forEach((lineText, index) => {
        for (const pattern of FORBIDDEN_TOOL_CONFLICT_PATTERNS) {
          if (pattern.test(lineText)) {
            findings.push({
              file: filePath,
              line: index + 1,
              text: lineText.trim(),
            });
          }
        }
      });
    }

    expect(findings).toEqual([]);
  });

  it("keeps anti-stringify and gate messaging aligned with runtime enforcement", () => {
    const runtimeFloor = getTurnRuntimeFloor();
    const turnInstruction = normalTurnInstruction({
      finishToolName: "vfs_finish_turn",
      vfsVmEnabled: true,
    });

    expect(runtimeFloor).toContain("Do NOT stringify object/array fields");
    expect(runtimeFloor).toContain(
      "does NOT permanently bypass epoch read-before-write gates",
    );
    expect(turnInstruction).toContain("TOOL ARG SHAPE (STRICT)");
    expect(turnInstruction).toContain("vfs_vm.scripts");
    expect(turnInstruction).toContain("vfs_finish_turn.assistant");
  });
});
