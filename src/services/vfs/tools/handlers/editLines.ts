import type { VfsToolHandler } from "./shared";
import { executeMutateOps, type MutateOp } from "./mutateCore";

export const handleEditLines: VfsToolHandler = (args, ctx) => {
  const typedArgs = args as Omit<Extract<MutateOp, { op: "edit_lines" }>, "op">;
  return executeMutateOps(
    "vfs_edit_lines",
    typedArgs as Record<string, unknown>,
    [{ op: "edit_lines", ...typedArgs }],
    ctx,
  );
};
