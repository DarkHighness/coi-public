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
    const file = this.files[normalizeVfsPath(path)];
    return file ? { ...file } : null;
  }

  public list(path: string): string[] {
    const normalized = normalizeVfsPath(path);
    if (normalized === "") {
      const entries = Object.keys(this.files).map((p) => p.split("/")[0]);
      return Array.from(new Set(entries));
    }

    const prefix = normalized.replace(/\/$/, "");
    const entries = Object.keys(this.files)
      .filter((p) => p.startsWith(prefix + "/"))
      .map((p) => p.slice(prefix.length + 1))
      .filter((p) => !p.includes("/"));
    return Array.from(new Set(entries));
  }
}
