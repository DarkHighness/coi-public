import { outlinePhase2Schema } from "../../../schemas";
import { createFinishOutlinePhaseHandler } from "./finishOutlinePhaseFactory";

export const handleFinishOutlinePhase2 = createFinishOutlinePhaseHandler(
  2,
  "vfs_finish_outline_phase_2",
  outlinePhase2Schema,
);
