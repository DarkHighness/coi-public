import { createSuccess } from "../../../tools/toolResult";
import { runWithStructuredErrors, type VfsToolHandler } from "./shared";

export const handleEndTurn: VfsToolHandler = (args) =>
  runWithStructuredErrors("vfs_end_turn", args, () =>
    createSuccess({ ended: true }, "Player-rate turn ended"),
  );
