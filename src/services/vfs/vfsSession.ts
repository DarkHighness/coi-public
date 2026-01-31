import { applyPatch } from "fast-json-patch";
import type { Operation } from "fast-json-patch";
import { getSchemaForPath } from "./schemas";
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

  public applyJsonPatch(path: string, patchOps: Operation[]): void {
    const file = this.readFile(path);
    if (!file) {
      throw new Error(`File not found: ${normalizeVfsPath(path)}`);
    }

    if (file.contentType !== "application/json") {
      throw new Error(`File is not JSON: ${file.path}`);
    }

    let document: unknown;
    try {
      document = JSON.parse(file.content);
    } catch (error) {
      throw new Error(`Invalid JSON content: ${file.path}`, { cause: error });
    }

    const patched = applyPatch(document, patchOps, true, false).newDocument;
    const schema = getSchemaForPath(file.path);
    const validated = schema.parse(patched);

    this.writeFile(file.path, JSON.stringify(validated), file.contentType);
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
