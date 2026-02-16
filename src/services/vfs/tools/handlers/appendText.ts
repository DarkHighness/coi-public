import type { VfsToolHandler } from "./shared";
import { executeMutateOps, type MutateOp } from "./mutateCore";

export const handleAppendText: VfsToolHandler = (args, ctx) => {
  const typedArgs = args as Omit<
    Extract<MutateOp, { op: "append_text" }>,
    "op"
  >;
  return executeMutateOps(
    "vfs_append_text",
    typedArgs as unknown as Record<string, unknown>,
    [{ op: "append_text", ...typedArgs }],
    ctx,
  );
};
