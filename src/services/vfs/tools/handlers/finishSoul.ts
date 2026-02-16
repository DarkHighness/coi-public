import { createError, createSuccess } from "../../../tools/toolResult";
import { toCurrentPath } from "../../currentAlias";
import { normalizeVfsPath } from "../../utils";
import { normalizeSoulMarkdown } from "../../soulTemplates";
import {
  isPathResolveError,
  resolveAiWriteContext,
  resolveCurrentPath,
  runWithStructuredErrors,
  withAtomicSession,
  type VfsToolHandler,
} from "./shared";

export const handleFinishSoul: VfsToolHandler = (args, ctx) =>
  runWithStructuredErrors("vfs_finish_soul", args, () => {
    const typedArgs = args as any;
    const hasCurrentSoul =
      typeof typedArgs.currentSoul === "string" &&
      typedArgs.currentSoul.trim().length > 0;
    const hasGlobalSoul =
      typeof typedArgs.globalSoul === "string" &&
      typedArgs.globalSoul.trim().length > 0;

    if (!hasCurrentSoul && !hasGlobalSoul) {
      return createError(
        "vfs_finish_soul: at least one of currentSoul or globalSoul must be provided.",
        "INVALID_DATA",
      );
    }

    return withAtomicSession(
      ctx,
      (draft) => {
        const updated: string[] = [];

        if (hasCurrentSoul) {
          const resolvedCurrentSoul = resolveCurrentPath(ctx, "world/soul.md");
          if (isPathResolveError(resolvedCurrentSoul)) {
            return resolvedCurrentSoul.error;
          }

          const normalizedCurrentSoulPath = normalizeVfsPath(
            resolvedCurrentSoul.path,
          );
          draft.writeFile(
            normalizedCurrentSoulPath,
            normalizeSoulMarkdown("current", typedArgs.currentSoul),
            "text/markdown",
          );
          draft.noteToolAccessFile(normalizedCurrentSoulPath);
          updated.push(toCurrentPath(normalizedCurrentSoulPath));
        }

        if (hasGlobalSoul) {
          const resolvedGlobalSoul = resolveCurrentPath(
            ctx,
            "world/global/soul.md",
          );
          if (isPathResolveError(resolvedGlobalSoul)) {
            return resolvedGlobalSoul.error;
          }

          const normalizedGlobalSoulPath = normalizeVfsPath(
            resolvedGlobalSoul.path,
          );
          draft.writeFile(
            normalizedGlobalSoulPath,
            normalizeSoulMarkdown("global", typedArgs.globalSoul),
            "text/markdown",
          );
          draft.noteToolAccessFile(normalizedGlobalSoulPath);
          updated.push(toCurrentPath(normalizedGlobalSoulPath));
        }

        return createSuccess({ updated }, "Soul committed");
      },
      {
        writeContext: resolveAiWriteContext(ctx),
      },
    );
  });
