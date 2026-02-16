import { outlinePhase5Schema } from "../../../schemas";
import { createFinishOutlinePhaseHandler } from "./finishOutlinePhaseFactory";

export const handleFinishOutlinePhase5 = createFinishOutlinePhaseHandler(
  5,
  "vfs_finish_outline_phase_5",
  outlinePhase5Schema,
);
