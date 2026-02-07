import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("outline task instruction guardrails", () => {
  it("requires function calls and avoids raw JSON output instructions", () => {
    const outlineDriverPath = path.resolve(__dirname, "../outline.ts");
    const source = fs.readFileSync(outlineDriverPath, "utf8");

    expect(source).toContain("You must invoke the tool function directly");
    expect(source).toContain("Do NOT return the schema as a JSON text block");
    expect(source).not.toMatch(/ONLY THE RAW JSON/i);
  });
});

