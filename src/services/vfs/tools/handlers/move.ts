import type { VfsToolHandler } from "./shared";
import { executeMutateOps, type MutateOp } from "./mutateCore";

export const handleMove: VfsToolHandler = (args, ctx) => {
  const typedArgs = args as Omit<Extract<MutateOp, { op: "move" }>, "op">;
  return executeMutateOps(
    "vfs_move",
    typedArgs as Record<string, unknown>,
    [{ op: "move", ...typedArgs }],
    ctx,
  );
};
