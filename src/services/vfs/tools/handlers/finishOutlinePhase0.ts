import { outlinePhase0Schema } from "../../../schemas";
import { createFinishOutlinePhaseHandler } from "./finishOutlinePhaseFactory";

export const handleFinishOutlinePhase0 = createFinishOutlinePhaseHandler(
  0,
  "vfs_finish_outline_phase_0",
  outlinePhase0Schema,
);
