import { outlinePhase6Schema } from "../../../schemas";
import { createFinishOutlinePhaseHandler } from "./finishOutlinePhaseFactory";

export const handleFinishOutlinePhase6 = createFinishOutlinePhaseHandler(
  6,
  "vfs_finish_outline_phase_6",
  outlinePhase6Schema,
);
