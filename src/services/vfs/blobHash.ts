import type { VfsContentType } from "./types";

const encoder = new TextEncoder();

const toHex = (bytes: Uint8Array): string =>
  Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");

export const buildBlobHashInput = (
  contentType: VfsContentType,
  content: string,
): string => `${contentType}\n${content}`;

export const computeBlobId = async (
  contentType: VfsContentType,
  content: string,
): Promise<string> => {
  const payload = buildBlobHashInput(contentType, content);
  const cryptoApi = globalThis.crypto;
  if (!cryptoApi?.subtle) {
    throw new Error("crypto.subtle is unavailable for blob hashing");
  }
  const digest = await cryptoApi.subtle.digest("SHA-256", encoder.encode(payload));
  return toHex(new Uint8Array(digest));
};
