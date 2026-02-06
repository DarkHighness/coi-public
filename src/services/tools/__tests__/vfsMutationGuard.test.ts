import { describe, expect, it } from "vitest";
import { VfsSession } from "../../vfs/vfsSession";
import {
  ensureTextFile,
  requireReadBeforeMutateForExistingFile,
  resolveTextContentType,
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

      expectInvalidPayload(result, "only allowed for *.json");
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
      }
    });
  });
});
