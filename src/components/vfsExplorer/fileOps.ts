import type { VfsContentType } from "../../services/vfs/types";
import type { VfsSession } from "../../services/vfs/vfsSession";
import { getSchemaForPath } from "../../services/vfs/schemas";

export const readVfsFile = (
  session: VfsSession,
  path: string,
): { content: string; contentType: VfsContentType } | null => {
  const file = session.readFile(path);
  if (!file) {
    return null;
  }
  return { content: file.content, contentType: file.contentType };
};

export const formatVfsContent = (
  content: string,
  contentType: VfsContentType,
): string => {
  if (contentType !== "application/json") {
    return content;
  }

  try {
    return JSON.stringify(JSON.parse(content), null, 2);
  } catch {
    return content;
  }
};

export const writeVfsFile = (
  session: VfsSession,
  path: string,
  content: string,
  contentType: VfsContentType,
): void => {
  if (contentType === "application/json") {
    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch (error) {
      throw new Error(`Invalid JSON content: ${path}`, { cause: error });
    }

    let schema = null;
    try {
      schema = getSchemaForPath(path);
    } catch {
      schema = null;
    }

    if (schema) {
      schema.parse(parsed);
    }
  }

  session.writeFile(path, content, contentType);
};
