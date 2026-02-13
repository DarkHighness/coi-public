export interface BuildRagDocumentIdInput {
  saveId: string;
  forkId: number;
  sourcePath: string;
  canonicalPath?: string;
  fileHash: string;
  chunkIndex: number;
  provider: string;
  modelId: string;
}

export const buildRagDocumentId = (input: BuildRagDocumentIdInput): string => {
  const canonicalPath = input.canonicalPath || input.sourcePath;
  return [
    input.saveId,
    String(input.forkId),
    canonicalPath,
    input.fileHash,
    String(input.chunkIndex),
    input.provider,
    input.modelId,
  ].join("::");
};
