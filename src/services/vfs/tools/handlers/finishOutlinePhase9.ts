import { outlinePhase9Schema } from "../../../schemas";
import { createFinishOutlinePhaseHandler } from "./finishOutlinePhaseFactory";

export const handleFinishOutlinePhase9 = createFinishOutlinePhaseHandler(
  9,
  "vfs_finish_outline_phase_9",
  outlinePhase9Schema,
);
