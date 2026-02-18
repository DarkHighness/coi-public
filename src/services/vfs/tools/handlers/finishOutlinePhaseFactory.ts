import type { ZodTypeAny } from "zod";
import { createError, createSuccess } from "../../../tools/toolResult";
import { toCurrentPath } from "../../currentAlias";
import { writeOutlineStoryPlan } from "../../outline";
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
  phase: number,
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
          const path = `outline/phases/phase${phase}.json`;
          draft.writeFile(
            path,
            JSON.stringify(parsedData.data),
            "application/json",
          );

          let planPath: string | undefined;
          if (phase === 1) {
            const payload = toObjectRecord(parsedData.data);
            const storyPlanMarkdown = payload?.storyPlanMarkdown;
            if (typeof storyPlanMarkdown === "string") {
              writeOutlineStoryPlan(draft, storyPlanMarkdown);
              planPath = toCurrentPath("workspace/PLAN.md");
            }
          }

          return createSuccess(
            planPath
              ? { phase, path: toCurrentPath(path), planPath }
              : { phase, path: toCurrentPath(path) },
            `Outline phase ${phase} committed`,
          );
        },
        {
          writeContext: resolveAiWriteContext(ctx),
        },
      );
    });
};
