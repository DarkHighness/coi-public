import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { resolveVfsPath } from "../../vfs/core/pathResolver";
import { vfsPathRegistry } from "../../vfs/core/pathRegistry";
import { normalizeVfsPath } from "../../vfs/utils";

const PROMPT_PATHS_TO_SCAN = [
  "src/services/prompts",
  "src/services/vfs/globalSkills",
  "src/services/vfs/globalRefs",
] as const;

const INLINE_CODE_RE = /`([^`]+)`/g;

const TOKEN_RE =
  /(?:^|[\s(])((?:current|shared|forks|world|conversation|summary|outline|custom_rules|skills|refs)\/[A-Za-z0-9_:\-./*{}<>]+)(?=$|[\s),.;])/g;

const FALLBACK_TEMPLATE_IDS = new Set([
  "template.fallback.shared",
  "template.fallback.fork",
]);

const walkFiles = (root: string): string[] => {
  if (!fs.existsSync(root)) {
    return [];
  }
  const entries = fs.readdirSync(root, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(root, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkFiles(fullPath));
      continue;
    }
    if (entry.isFile() && fullPath.endsWith(".ts")) {
      files.push(fullPath);
    }
  }

  return files;
};

const normalizeSamplePath = (rawToken: string): string => {
  const normalized = normalizeVfsPath(rawToken)
    .replace(/NN-\*/g, "00-id")
    .replace(/\{[^}]+\}/g, "0")
    .replace(/<[^>]+>/g, "id")
    .replace(/\*\*/g, "id")
    .replace(/\*/g, "id")
    .replace(/\/+/g, "/")
    .replace(/\/$/, "");
  return normalizeVfsPath(normalized);
};

const extractPathTokensFromFile = (filePath: string): string[] => {
  const text = fs.readFileSync(filePath, "utf8").replace(/\\`/g, "`");
  const tokens = new Set<string>();

  for (const segmentMatch of text.matchAll(INLINE_CODE_RE)) {
    const segment = segmentMatch[1] ?? "";
    for (const tokenMatch of segment.matchAll(TOKEN_RE)) {
      const token = (tokenMatch[1] ?? "").trim();
      if (!token) {
        continue;
      }
      tokens.add(token);
    }
  }

  return Array.from(tokens);
};

describe("prompt vfs path consistency", () => {
  it("maps prompt-mentioned VFS paths to registered resource templates", () => {
    const files = PROMPT_PATHS_TO_SCAN.flatMap((root) => walkFiles(root));

    const invalid: Array<{ file: string; token: string; sample: string; reason: string }> =
      [];
    const fallbackMatches: Array<{
      file: string;
      token: string;
      sample: string;
      canonicalPath: string;
      templateId: string;
    }> = [];

    for (const file of files) {
      const tokens = extractPathTokensFromFile(file);
      for (const token of tokens) {
        const sample = normalizeSamplePath(token);
        if (!sample) {
          continue;
        }

        try {
          const resolved = resolveVfsPath(sample, { activeForkId: 0 });
          const classification = vfsPathRegistry.classify(resolved.canonicalPath, {
            activeForkId: 0,
          });
          const hasWildcardToken = token.includes("*");
          if (
            !hasWildcardToken &&
            FALLBACK_TEMPLATE_IDS.has(classification.templateId)
          ) {
            fallbackMatches.push({
              file,
              token,
              sample,
              canonicalPath: classification.canonicalPath,
              templateId: classification.templateId,
            });
          }
        } catch (error) {
          invalid.push({
            file,
            token,
            sample,
            reason: error instanceof Error ? error.message : String(error),
          });
        }
      }
    }

    expect(invalid).toEqual([]);
    expect(fallbackMatches).toEqual([]);
  });
});
