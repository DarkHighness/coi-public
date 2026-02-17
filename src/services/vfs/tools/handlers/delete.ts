import type { VfsToolHandler } from "./shared";
import { executeMutateOps, type MutateOp } from "./mutateCore";

export const handleDelete: VfsToolHandler = (args, ctx) => {
  const typedArgs = args as Omit<Extract<MutateOp, { op: "delete" }>, "op">;
  return executeMutateOps(
    "vfs_delete",
    typedArgs as JsonObject,
    [{ op: "delete", ...typedArgs }],
    ctx,
  );
};
