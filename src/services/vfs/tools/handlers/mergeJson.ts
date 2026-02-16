import type { VfsToolHandler } from "./shared";
import { executeMutateOps, type MutateOp } from "./mutateCore";

export const handleMergeJson: VfsToolHandler = (args, ctx) => {
  const typedArgs = args as Omit<Extract<MutateOp, { op: "merge_json" }>, "op">;
  return executeMutateOps(
    "vfs_merge_json",
    typedArgs as unknown as Record<string, unknown>,
    [{ op: "merge_json", ...typedArgs }],
    ctx,
  );
};
