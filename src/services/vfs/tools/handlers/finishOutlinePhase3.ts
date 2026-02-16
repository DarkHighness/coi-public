import { outlinePhase3Schema } from "../../../schemas";
import { createFinishOutlinePhaseHandler } from "./finishOutlinePhaseFactory";

export const handleFinishOutlinePhase3 = createFinishOutlinePhaseHandler(
  3,
  "vfs_finish_outline_phase_3",
  outlinePhase3Schema,
);
