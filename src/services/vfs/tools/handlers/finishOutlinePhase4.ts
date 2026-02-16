import { outlinePhase4Schema } from "../../../schemas";
import { createFinishOutlinePhaseHandler } from "./finishOutlinePhaseFactory";

export const handleFinishOutlinePhase4 = createFinishOutlinePhaseHandler(
  4,
  "vfs_finish_outline_phase_4",
  outlinePhase4Schema,
);
