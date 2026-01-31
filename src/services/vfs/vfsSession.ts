import { VfsFile, VfsFileMap, VfsContentType } from "./types";
import { normalizeVfsPath, hashContent } from "./utils";

export class VfsSession {
  private files: VfsFileMap = {};

  public writeFile(path: string, content: string, contentType: VfsContentType) {
    const normalized = normalizeVfsPath(path);
    const hash = hashContent(content);
    this.files[normalized] = {
      path: normalized,
      content,
      contentType,
      hash,
      size: content.length,
      updatedAt: Date.now(),
    };
  }

  public readFile(path: string): VfsFile | null {
    return this.files[normalizeVfsPath(path)] || null;
  }

  public list(path: string): string[] {
    const prefix = normalizeVfsPath(path).replace(/\/$/, "");
    const entries = Object.keys(this.files)
      .filter((p) => p.startsWith(prefix + "/"))
      .map((p) => p.slice(prefix.length + 1))
      .filter((p) => !p.includes("/"));
    return entries;
  }
}
