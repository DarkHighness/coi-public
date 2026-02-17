import type { VfsToolHandler } from "./shared";
import { executeMutateOps, type MutateOp } from "./mutateCore";

export const handlePatchJson: VfsToolHandler = (args, ctx) => {
  const typedArgs = args as Omit<Extract<MutateOp, { op: "patch_json" }>, "op">;
  return executeMutateOps(
    "vfs_patch_json",
    typedArgs as Record<string, unknown>,
    [{ op: "patch_json", ...typedArgs }],
    ctx,
  );
};
