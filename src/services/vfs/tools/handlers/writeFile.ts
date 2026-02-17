import type { VfsToolHandler } from "./shared";
import { executeMutateOps, type MutateOp } from "./mutateCore";

export const handleWriteFile: VfsToolHandler = (args, ctx) => {
  const typedArgs = args as Omit<Extract<MutateOp, { op: "write_file" }>, "op">;
  return executeMutateOps(
    "vfs_write_file",
    typedArgs as Record<string, unknown>,
    [{ op: "write_file", ...typedArgs }],
    ctx,
  );
};
