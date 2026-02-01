import { applyPatch } from "fast-json-patch";
import type { Operation } from "fast-json-patch";
import { z } from "zod";
import { getSchemaForPath } from "./schemas";
import { VfsFile, VfsFileMap, VfsContentType } from "./types";
import { normalizeVfsPath, hashContent } from "./utils";

const cloneFiles = (files: VfsFileMap): VfsFileMap => {
  const cloned: VfsFileMap = {};
  for (const [path, file] of Object.entries(files)) {
    cloned[path] = { ...file };
  }
  return cloned;
};

const hasUnknownKeys = (input: unknown, parsed: unknown): boolean => {
  if (input === null || typeof input !== "object") {
    return false;
  }

  if (Array.isArray(input)) {
    if (!Array.isArray(parsed)) {
      return true;
    }
    return input.some((item, index) => hasUnknownKeys(item, parsed[index]));
  }

  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    return true;
  }

  for (const key of Object.keys(input as Record<string, unknown>)) {
    if (key === "__proto__" || key === "constructor" || key === "prototype") {
      return true;
    }

    if (!Object.prototype.hasOwnProperty.call(parsed, key)) {
      return true;
    }
    if (
      hasUnknownKeys(
        (input as Record<string, unknown>)[key],
        (parsed as Record<string, unknown>)[key],
      )
    ) {
      return true;
    }
  }

  return false;
};

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

  public snapshot(): VfsFileMap {
    return cloneFiles(this.files);
  }

  public restore(snapshot: VfsFileMap): void {
    this.files = cloneFiles(snapshot);
  }

  public renameFile(from: string, to: string): void {
    const normalizedFrom = normalizeVfsPath(from);
    const normalizedTo = normalizeVfsPath(to);
    const file = this.files[normalizedFrom];
    if (!file) {
      throw new Error(`File not found: ${normalizedFrom}`);
    }
    this.files[normalizedTo] = {
      ...file,
      path: normalizedTo,
      updatedAt: Date.now(),
    };
    delete this.files[normalizedFrom];
  }

  public deleteFile(path: string): void {
    const normalized = normalizeVfsPath(path);
    if (!this.files[normalized]) {
      throw new Error(`File not found: ${normalized}`);
    }
    delete this.files[normalized];
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
    const strictSchema =
      schema instanceof z.ZodObject ? schema.strict() : schema;
    const validated = strictSchema.parse(patched);

    if (hasUnknownKeys(patched, validated)) {
      throw new Error(`Unknown keys found after validation: ${file.path}`);
    }

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
