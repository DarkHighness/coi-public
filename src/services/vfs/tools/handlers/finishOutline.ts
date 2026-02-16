import { createError, createSuccess } from "../../../tools/toolResult";
import { toCurrentPath } from "../../currentAlias";
import { writeOutlineStoryPlan } from "../../outline";
import {
  formatOutlineCommitValidationError,
  OUTLINE_PHASE_SCHEMAS,
  resolveAiWriteContext,
  runWithStructuredErrors,
  withAtomicSession,
  type VfsToolHandler,
} from "./shared";

export const handleFinishOutline: VfsToolHandler = (args, ctx) =>
  runWithStructuredErrors("vfs_finish_outline", args, () => {
    const typedArgs = args as any;
    const phase = typedArgs.phase;
    const schema = OUTLINE_PHASE_SCHEMAS[phase];
    if (!schema) {
      return createError(
        `vfs_finish_outline: phase ${phase} is out of range [0..9]`,
        "INVALID_DATA",
      );
    }

    const parsedData = schema.safeParse(typedArgs.data);
    if (!parsedData.success) {
      return createError(
        `vfs_finish_outline: schema validation failed: ${formatOutlineCommitValidationError(parsedData.error)}`,
        "INVALID_DATA",
      );
    }

    return withAtomicSession(
      ctx,
      (draft) => {
        const path = `outline/phases/phase${phase}.json`;
        draft.writeFile(path, JSON.stringify(parsedData.data), "application/json");

        let planPath: string | undefined;
        if (phase === 1) {
          const storyPlanMarkdown = (parsedData.data as any)?.storyPlanMarkdown;
          if (typeof storyPlanMarkdown === "string") {
            writeOutlineStoryPlan(draft, storyPlanMarkdown);
            planPath = toCurrentPath("outline/story_outline/plan.md");
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
