import { outlinePhase7Schema } from "../../../schemas";
import { createFinishOutlinePhaseHandler } from "./finishOutlinePhaseFactory";

export const handleFinishOutlinePhase7 = createFinishOutlinePhaseHandler(
  7,
  "vfs_finish_outline_phase_7",
  outlinePhase7Schema,
);
