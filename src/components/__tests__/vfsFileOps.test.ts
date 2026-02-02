import { describe, it, expect } from "vitest";
import { VfsSession } from "../../services/vfs/vfsSession";
import { writeVfsFile } from "../vfsExplorer/fileOps";

describe("vfs file ops", () => {
  it("validates JSON when contentType is application/json", () => {
    const session = new VfsSession();
    expect(() =>
      writeVfsFile(session, "world/global.json", "{", "application/json"),
    ).toThrow();
  });
});
