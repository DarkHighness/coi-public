import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("outline retry budget semantics", () => {
  it("resets retries once at phase start, not every inner iteration", () => {
    const outlineDriverPath = path.resolve(__dirname, "../outline.ts");
    const source = fs.readFileSync(outlineDriverPath, "utf8");

    expect(source).toMatch(
      /let phaseSubmitted = false;\s*if \(budgetState\.retriesUsed !== 0\) \{\s*budgetState\.retriesUsed = 0;\s*\}\s*while \(!phaseSubmitted\)/s,
    );

    expect(source).not.toMatch(
      /while \(!phaseSubmitted\) \{\s*if \(budgetState\.retriesUsed !== 0\) \{\s*budgetState\.retriesUsed = 0;/s,
    );
  });
});
