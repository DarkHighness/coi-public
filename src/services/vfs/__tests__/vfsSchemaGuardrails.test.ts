import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("vfs schema guardrails", () => {
  it("does not use unbounded z.any/z.unknown in vfs schema registry", () => {
    const schemaFilePath = path.resolve(__dirname, "../schemas.ts");
    const source = fs.readFileSync(schemaFilePath, "utf8");

    const forbiddenPatterns = [
      /z\.any\s*\(/,
      /z\.unknown\s*\(/,
      /z\.record\(\s*z\.any\s*\(/,
    ];

    const findings: Array<{ pattern: string; line: number; text: string }> = [];
    const lines = source.split(/\r?\n/);

    lines.forEach((lineText, index) => {
      for (const pattern of forbiddenPatterns) {
        if (pattern.test(lineText)) {
          findings.push({
            pattern: pattern.source,
            line: index + 1,
            text: lineText.trim(),
          });
        }
      }
    });

    expect(findings).toEqual([]);
  });
});
