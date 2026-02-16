import { outlinePhase8Schema } from "../../../schemas";
import { createFinishOutlinePhaseHandler } from "./finishOutlinePhaseFactory";

export const handleFinishOutlinePhase8 = createFinishOutlinePhaseHandler(
  8,
  "vfs_finish_outline_phase_8",
  outlinePhase8Schema,
);
