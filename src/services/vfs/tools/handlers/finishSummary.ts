import { createError, createSuccess } from "../../../tools/toolResult";
import {
  resolveAiWriteContext,
  runWithStructuredErrors,
  safeParseJson,
  withAtomicSession,
  type VfsToolHandler,
} from "./shared";

const toObjectRecord = (value: unknown): Record<string, unknown> | null => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
};

export const handleFinishSummary: VfsToolHandler = (args, ctx) =>
  runWithStructuredErrors("vfs_finish_summary", args, () => {
    const runtime = args as Record<string, unknown>;

    if ("id" in runtime || "createdAt" in runtime) {
      return createError(
        "vfs_finish_summary: runtime fields id/createdAt are system-managed and must not be provided by AI.",
        "INVALID_DATA",
      );
    }

    const nodeRangeRaw = runtime.nodeRange as
      | { fromIndex?: unknown; toIndex?: unknown }
      | undefined;
    const lastSummarizedIndexRaw = runtime.lastSummarizedIndex;

    const fromIndex =
      typeof nodeRangeRaw?.fromIndex === "number" &&
      Number.isFinite(nodeRangeRaw.fromIndex)
        ? Math.floor(nodeRangeRaw.fromIndex)
        : null;
    const toIndex =
      typeof nodeRangeRaw?.toIndex === "number" &&
      Number.isFinite(nodeRangeRaw.toIndex)
        ? Math.floor(nodeRangeRaw.toIndex)
        : null;
    const lastSummarizedIndex =
      typeof lastSummarizedIndexRaw === "number" &&
      Number.isFinite(lastSummarizedIndexRaw)
        ? Math.floor(lastSummarizedIndexRaw)
        : null;

    if (
      fromIndex === null ||
      toIndex === null ||
      lastSummarizedIndex === null
    ) {
      return createError(
        "vfs_finish_summary: runtime fields nodeRange and lastSummarizedIndex are required. They must be injected by summary loop.",
        "INVALID_DATA",
      );
    }

    if (lastSummarizedIndex !== toIndex + 1) {
      return createError(
        `vfs_finish_summary: lastSummarizedIndex must equal nodeRange.toIndex + 1 (expected ${toIndex + 1}, got ${lastSummarizedIndex})`,
        "INVALID_DATA",
      );
    }

    return withAtomicSession(
      ctx,
      (draft) => {
        const existingFile = draft.readFile("summary/state.json");
        const parsed = existingFile ? safeParseJson(existingFile.content) : null;
        const existingState = toObjectRecord(parsed);
        const existingSummaries = Array.isArray(existingState?.summaries)
          ? existingState.summaries.filter(
              (summary): summary is Record<string, unknown> =>
                !!summary &&
                typeof summary === "object" &&
                !Array.isArray(summary),
            )
          : [];

        const maxId = existingSummaries.reduce((max: number, summary) => {
          const id = summary?.id;
          return typeof id === "number" && Number.isFinite(id)
            ? Math.max(max, id)
            : max;
        }, -1);
        const nextId = maxId + 1;

        const summary = {
          id: nextId,
          createdAt: Date.now(),
          displayText: runtime.displayText,
          visible: runtime.visible,
          hidden: runtime.hidden,
          timeRange: runtime.timeRange ?? null,
          nodeRange: {
            fromIndex,
            toIndex,
          },
          nextSessionReferencesMarkdown:
            runtime.nextSessionReferencesMarkdown ?? null,
        };

        const nextSummaries = [...existingSummaries, summary];
        draft.mergeJson(
          "summary/state.json",
          {
            summaries: nextSummaries,
            lastSummarizedIndex,
          },
          { operation: "finish_summary" },
        );

        return createSuccess(
          { summary, path: "current/summary/state.json" },
          "Summary committed",
        );
      },
      {
        writeContext: resolveAiWriteContext(ctx, {
          allowFinishGuardedWrite: true,
        }),
      },
    );
  });
