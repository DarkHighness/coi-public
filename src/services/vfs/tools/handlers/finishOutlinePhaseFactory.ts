import type { ZodTypeAny } from "zod";
import { createError, createSuccess } from "../../../tools/toolResult";
import { toCurrentPath } from "../../currentAlias";
import { writeOutlineStoryPlan } from "../../outline";
import type { OutlinePhaseId } from "../../../../types";
import {
  formatOutlineCommitValidationError,
  resolveAiWriteContext,
  runWithStructuredErrors,
  withAtomicSession,
  type VfsToolHandler,
} from "./shared";

const toObjectRecord = (value: unknown): JsonObject | null => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as JsonObject;
};

export const createFinishOutlinePhaseHandler = (
  phaseId: OutlinePhaseId,
  toolName: string,
  schema: ZodTypeAny,
): VfsToolHandler => {
  return (args, ctx) =>
    runWithStructuredErrors(toolName, args, () => {
      const parsedData = schema.safeParse(args);
      if (!parsedData.success) {
        return createError(
          `${toolName}: schema validation failed: ${formatOutlineCommitValidationError(parsedData.error)}`,
          "INVALID_DATA",
        );
      }

      return withAtomicSession(
        ctx,
        (draft) => {
          const path = `outline/phases/${phaseId}.json`;
          draft.writeFile(
            path,
            JSON.stringify(parsedData.data),
            "application/json",
          );

          let planPath: string | undefined;
          if (phaseId === "master_plan") {
            const payload = toObjectRecord(parsedData.data);
            const storyPlanMarkdown = payload?.storyPlanMarkdown;
            if (typeof storyPlanMarkdown === "string") {
              writeOutlineStoryPlan(draft, storyPlanMarkdown);
              planPath = toCurrentPath("workspace/PLAN.md");
            }
          }

          return createSuccess(
            planPath
              ? { phaseId, path: toCurrentPath(path), planPath }
              : { phaseId, path: toCurrentPath(path) },
            `Outline phase ${phaseId} committed`,
          );
        },
        {
          writeContext: resolveAiWriteContext(ctx),
        },
      );
    });
};
