import { describe, it, expect } from "vitest";
import { VfsSession } from "../../services/vfs/vfsSession";
import {
  formatVfsContent,
  readVfsFile,
  writeVfsFile,
} from "../vfsExplorer/fileOps";

describe("vfs file ops", () => {
  it("returns null when reading a missing file", () => {
    const session = new VfsSession();

    expect(readVfsFile(session, "tmp/missing.txt")).toBeNull();
  });

  it("reads back written file content and contentType", () => {
    const session = new VfsSession();
    writeVfsFile(session, "tmp/demo.txt", "hello", "text/plain");

    expect(readVfsFile(session, "tmp/demo.txt")).toEqual({
      content: "hello",
      contentType: "text/plain",
    });
  });

  it("pretty-prints valid json content", () => {
    const formatted = formatVfsContent('{"a":1,"b":{"c":2}}', "application/json");

    expect(formatted).toBe('{\n  "a": 1,\n  "b": {\n    "c": 2\n  }\n}');
  });

  it("keeps invalid json content unchanged", () => {
    const raw = "{invalid-json";

    expect(formatVfsContent(raw, "application/json")).toBe(raw);
  });

  it("keeps non-json content unchanged", () => {
    const raw = "plain text";

    expect(formatVfsContent(raw, "text/plain")).toBe(raw);
  });

  it("validates JSON when contentType is application/json", () => {
    const session = new VfsSession();

    expect(() =>
      writeVfsFile(session, "world/global.json", "{", "application/json"),
    ).toThrow();
  });
});
