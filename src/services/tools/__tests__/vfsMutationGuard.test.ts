import { describe, expect, it } from "vitest";
import { VfsSession } from "../../vfs/vfsSession";
import {
  ensureTextFile,
  filterCanonicalWorldEntityUnlockPatchOps,
  requireReadBeforeMutateForExistingFile,
  resolveWriteContentType,
  resolveTextContentType,
  stripCanonicalWorldEntityUnlockFields,
  validateExpectedHash,
  validateWritePayload,
} from "../handlers/vfsMutationGuard";

const expectInvalidPayload = (
  result: ReturnType<typeof validateWritePayload>,
  textIncludes: string,
): void => {
  expect(result.ok).toBe(false);
  if (!("error" in result)) {
    throw new Error("Expected payload validation to fail.");
  }
  expect(result.error.code).toBe("INVALID_DATA");
  expect(result.error.error).toContain(textIncludes);
  expect(result.error.details?.tool).toBe("vfs_write_file");
  expect(result.error.details?.category).toBe("validation");
  expect(result.error.details?.refs).toContain(
    "current/refs/tools/vfs_write_file/README.md",
  );
};

describe("vfsMutationGuard", () => {
  describe("requireReadBeforeMutateForExistingFile", () => {
    it("returns null for new file paths", () => {
      const session = new VfsSession();

      const result = requireReadBeforeMutateForExistingFile(
        session,
        "world/new.json",
        "overwrite",
      );

      expect(result).toBeNull();
    });

    it("blocks mutation when existing file has not been read", () => {
      const session = new VfsSession();
      session.writeFile("world/global.json", "{}", "application/json");

      const result = requireReadBeforeMutateForExistingFile(
        session,
        "world/global.json",
        "overwrite",
      );

      expect(result?.success).toBe(false);
      expect(result?.code).toBe("INVALID_ACTION");
      expect(result?.error).toContain("must read file before overwrite");
      expect(result?.details?.category).toBe("policy");
      expect(result?.details?.tool).toBe("vfs_write_file");
      expect(result?.details?.issues?.[0]?.code).toBe("READ_REQUIRED");
    });

    it("allows mutation after file was marked as seen in current epoch", () => {
      const session = new VfsSession();
      session.writeFile("world/global.json", "{}", "application/json");
      session.noteToolSeen("world/global.json");

      const result = requireReadBeforeMutateForExistingFile(
        session,
        "world/global.json",
        "merge",
      );

      expect(result).toBeNull();
    });

    it("re-enforces read requirement after out-of-band mutation", () => {
      const session = new VfsSession();
      session.writeFile("world/global.json", "{}", "application/json");
      session.noteToolSeen("world/global.json");

      const initiallyAllowed = requireReadBeforeMutateForExistingFile(
        session,
        "world/global.json",
        "merge",
      );
      expect(initiallyAllowed).toBeNull();

      session.noteOutOfBandMutation("world/global.json", "modified");

      const blockedAfterExternalChange = requireReadBeforeMutateForExistingFile(
        session,
        "world/global.json",
        "merge",
      );
      expect(blockedAfterExternalChange?.success).toBe(false);
      expect(blockedAfterExternalChange?.code).toBe("INVALID_ACTION");
      expect(blockedAfterExternalChange?.details?.issues?.[0]?.code).toBe(
        "READ_REQUIRED",
      );

      session.noteToolSeen("world/global.json");

      const allowedAfterReread = requireReadBeforeMutateForExistingFile(
        session,
        "world/global.json",
        "merge",
      );
      expect(allowedAfterReread).toBeNull();
    });

    it("does not enforce read-before-mutate for read-only skills paths", () => {
      const session = new VfsSession();

      const result = requireReadBeforeMutateForExistingFile(
        session,
        "skills/index.json",
        "overwrite",
      );

      expect(result).toBeNull();
    });
  });

  describe("validateExpectedHash", () => {
    it("returns null when hash matches", () => {
      const session = new VfsSession();
      session.writeFile("world/global.json", "{}", "application/json");
      const existing = session.readFile("world/global.json");

      const result = validateExpectedHash(
        existing,
        existing?.hash,
        "current/world/global.json",
      );

      expect(result).toBeNull();
    });

    it("returns error when hash mismatches", () => {
      const session = new VfsSession();
      session.writeFile("world/global.json", "{}", "application/json");
      const existing = session.readFile("world/global.json");

      const result = validateExpectedHash(
        existing,
        "hash-does-not-match",
        "current/world/global.json",
      );

      expect(result?.success).toBe(false);
      expect(result?.code).toBe("INVALID_ACTION");
      expect(result?.error).toContain("Hash mismatch");
      expect(result?.details?.category).toBe("conflict");
      expect(result?.details?.issues?.[0]?.code).toBe("HASH_MISMATCH");
    });
  });

  describe("ensureTextFile / resolveTextContentType", () => {
    it("rejects non-text existing file", () => {
      const session = new VfsSession();
      session.writeFile("world/global.json", "{}", "application/json");

      const result = ensureTextFile(
        session.readFile("world/global.json"),
        "world/global.json",
      );

      expect(result?.success).toBe(false);
      expect(result?.code).toBe("INVALID_DATA");
    });

    it("resolves markdown/plain fallback correctly", () => {
      expect(resolveTextContentType("notes/readme.md", null)).toBe(
        "text/markdown",
      );
      expect(resolveTextContentType("notes/readme.txt", null)).toBe(
        "text/plain",
      );
    });
  });

  describe("validateWritePayload", () => {
    it("rejects json path with non-json contentType", () => {
      const result = validateWritePayload(
        "world/global.json",
        "{}",
        "text/plain",
      );

      expectInvalidPayload(result, "JSON path requires");
    });

    it("rejects non-json path with json contentType", () => {
      const result = validateWritePayload(
        "notes/readme.md",
        "{}",
        "application/json",
      );

      expectInvalidPayload(
        result,
        "only allowed for matching *.json or *.jsonl",
      );
    });

    it("rejects jsonl path with non-jsonl contentType", () => {
      const result = validateWritePayload(
        "session/session-a.jsonl",
        '{"role":"user"}',
        "text/plain",
      );

      expectInvalidPayload(result, "JSONL path requires");
    });

    it("rejects non-jsonl path with jsonl contentType", () => {
      const result = validateWritePayload(
        "notes/readme.md",
        '{"role":"user"}',
        "application/jsonl",
      );

      expectInvalidPayload(result, "*.jsonl");
    });

    it("passes through non-json content untouched", () => {
      const result = validateWritePayload(
        "notes/readme.md",
        "# hello",
        "text/markdown",
      );

      expect(result).toEqual({
        ok: true,
        normalizedContent: "# hello",
        contentType: "text/markdown",
        warnings: [],
      });
    });

    it("rejects invalid JSON payload", () => {
      const result = validateWritePayload(
        "world/global.json",
        "{",
        "application/json",
      );

      expectInvalidPayload(result, "Invalid JSON content");
    });

    it("rejects invalid JSONL line payload", () => {
      const result = validateWritePayload(
        "session/session-a.jsonl",
        '{"role":"user"}\n{invalid}',
        "application/jsonl",
      );

      expectInvalidPayload(result, "Invalid JSONL content");
    });

    it("accepts valid JSONL payload", () => {
      const result = validateWritePayload(
        "session/session-a.jsonl",
        '{"role":"user"}\n{"role":"assistant"}',
        "application/jsonl",
      );

      expect(result).toEqual({
        ok: true,
        normalizedContent: '{"role":"user"}\n{"role":"assistant"}',
        contentType: "application/jsonl",
        warnings: [],
      });
    });

    it("rejects unknown nested keys after schema validation", () => {
      const result = validateWritePayload(
        "world/global.json",
        JSON.stringify({
          time: "Day 1",
          theme: "fantasy",
          currentLocation: "loc:1",
          atmosphere: {
            envTheme: "fantasy",
            ambience: "forest",
            weather: "clear",
            nestedUnknown: true,
          },
          turnNumber: 1,
          forkId: 0,
        }),
        "application/json",
      );

      expectInvalidPayload(result, "Unknown keys found after validation");
    });

    it("returns compact field-level schema errors for JSON writes", () => {
      const result = validateWritePayload(
        "world/global.json",
        JSON.stringify({
          time: "Day 1",
          theme: "fantasy",
          currentLocation: "loc:1",
          atmosphere: {
            envTheme: "fantasy",
            ambience: "forest",
            weather: "INVALID_WEATHER",
          },
          turnNumber: 1,
          forkId: 0,
        }),
        "application/json",
      );

      expect(result.ok).toBe(false);
      if (!("error" in result)) {
        throw new Error("Expected schema validation failure.");
      }
      expect(result.error.error).toContain("/atmosphere/weather");
      expect(result.error.error).toContain("directSubfields=[");
      expect(result.error.error.length).toBeLessThan(700);
      const schemaIssue = result.error.details?.issues?.find(
        (issue) => issue.code === "SCHEMA_VALIDATION_FAILED",
      );
      expect(schemaIssue?.path).toContain("/atmosphere/weather");
      expect(schemaIssue?.message).toContain("directSubfields=[");
    });

    it("normalizes valid JSON payload to canonical string", () => {
      const result = validateWritePayload(
        "world/global.json",
        JSON.stringify({
          time: "Day 1",
          theme: "fantasy",
          currentLocation: "loc:1",
          atmosphere: {
            envTheme: "fantasy",
            ambience: "forest",
            weather: "clear",
          },
          turnNumber: 1,
          forkId: 0,
        }),
        "application/json",
      );

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.contentType).toBe("application/json");
        expect(JSON.parse(result.normalizedContent)).toMatchObject({
          currentLocation: "loc:1",
          turnNumber: 1,
        });
        expect(result.warnings).toEqual([]);
      }
    });

    it("strips canonical unlocked fields with warning for world entities", () => {
      const result = validateWritePayload(
        "world/world_info.json",
        JSON.stringify({
          title: "World",
          premise: "Premise",
          worldSetting: {
            visible: { description: "Known world", rules: "Known rules" },
            hidden: { hiddenRules: "Secret rules", secrets: ["secret"] },
            history: "Ancient history",
          },
          mainGoal: {
            visible: { description: "Goal", conditions: "Known conditions" },
            hidden: {
              trueDescription: "True goal",
              trueConditions: "True conditions",
            },
          },
          unlocked: true,
          unlockReason: "should be ignored",
        }),
        "application/json",
      );

      expect(result.ok).toBe(true);
      if (result.ok) {
        const parsed = JSON.parse(result.normalizedContent) as Record<
          string,
          unknown
        >;
        expect(parsed.unlocked).toBeUndefined();
        expect(parsed.unlockReason).toBeUndefined();
        expect(result.warnings.length).toBeGreaterThan(0);
      }
    });

    it("injects missing entityId for actor view payloads", () => {
      const result = validateWritePayload(
        "world/characters/char:player/views/quests/quest:welcome.json",
        JSON.stringify({
          status: "active",
        }),
        "application/json",
      );

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(JSON.parse(result.normalizedContent)).toMatchObject({
          entityId: "quest:welcome",
          status: "active",
        });
      }
    });
  });

  describe("resolveWriteContentType", () => {
    it("infers from existing file first", () => {
      const session = new VfsSession();
      session.writeFile("world/notes.md", "# hi", "text/markdown");

      const resolved = resolveWriteContentType(
        session,
        "world/notes.md",
        undefined,
      );
      expect(resolved.ok).toBe(true);
      if (resolved.ok) {
        expect(resolved.contentType).toBe("text/markdown");
      }
    });

    it("infers from extension when file does not exist", () => {
      const session = new VfsSession();
      const resolved = resolveWriteContentType(
        session,
        "world/notes.log",
        undefined,
      );
      expect(resolved.ok).toBe(true);
      if (resolved.ok) {
        expect(resolved.contentType).toBe("text/plain");
      }
    });

    it("returns INVALID_DATA when inference is not possible", () => {
      const session = new VfsSession();
      const resolved = resolveWriteContentType(session, "world/mystery", null);
      expect(resolved.ok).toBe(false);
      if (resolved.ok === false) {
        expect(resolved.error.code).toBe("INVALID_DATA");
        expect(resolved.error.error).toContain("Unable to infer contentType");
      }
    });
  });

  describe("canonical world patch/merge helpers", () => {
    it("strips canonical view/UI fields from canonical merge objects", () => {
      const result = stripCanonicalWorldEntityUnlockFields(
        "world/quests/quest:1.json",
        {
          unlocked: true,
          unlockReason: "proof",
          status: "active",
          highlight: true,
          visible: { description: "x", objectives: ["a"] },
        },
      );

      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.sanitized).toEqual({
        visible: { description: "x", objectives: ["a"] },
      });
    });

    it("filters patch operations that target canonical view/UI fields", () => {
      const result = filterCanonicalWorldEntityUnlockPatchOps(
        "world/quests/quest:1.json",
        [
          { op: "replace", path: "/unlocked", value: true } as any,
          { op: "replace", path: "/status", value: "complete" } as any,
          { op: "replace", path: "/highlight", value: false } as any,
          {
            op: "replace",
            path: "/visible/description",
            value: "updated",
          } as any,
          { op: "remove", path: "/unlockReason" } as any,
        ],
      );

      expect(result.patch).toHaveLength(1);
      expect((result.patch[0] as any).path).toBe("/visible/description");
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it("strips location-only view fields from canonical location merge objects", () => {
      const result = stripCanonicalWorldEntityUnlockFields(
        "world/locations/loc:1.json",
        {
          id: "loc:1",
          isVisited: true,
          visitedCount: 4,
          discoveredAtGameTime: "Day 2",
          visible: { description: "Gate", knownFeatures: [] },
          hidden: { fullDescription: "Hidden gate" },
        },
      );

      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.sanitized).toEqual({
        id: "loc:1",
        visible: { description: "Gate", knownFeatures: [] },
        hidden: { fullDescription: "Hidden gate" },
      });
    });
  });
});
