import { outlinePhase1Schema } from "../../../schemas";
import { createFinishOutlinePhaseHandler } from "./finishOutlinePhaseFactory";

export const handleFinishOutlinePhase1 = createFinishOutlinePhaseHandler(
  1,
  "vfs_finish_outline_phase_1",
  outlinePhase1Schema,
);
