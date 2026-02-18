import {
  createError,
  createSuccess,
  type ToolCallError,
} from "../../../tools/toolResult";
import type { ToolContext } from "../../../tools/toolHandlerRegistry";
import { normalizeVfsPath } from "../../utils";
import type { VfsToolHandler } from "./shared";

const DEFAULT_MAX_TOOL_CALLS = 32;
const MAX_TOOL_CALLS_CAP = 32;
const DEFAULT_MAX_SCRIPT_CHARS = 16000;
const TOTAL_SCRIPT_CHARS_CAP = 16000;

const WRITE_MUTATION_TOOL_NAMES = new Set([
  "vfs_write_file",
  "vfs_append_text",
  "vfs_edit_lines",
  "vfs_write_markdown",
  "vfs_patch_json",
  "vfs_merge_json",
  "vfs_move",
  "vfs_delete",
]);

const DANGEROUS_SCRIPT_PATTERNS: Array<{
  regex: RegExp;
  label: string;
}> = [
  { regex: /\bimport\b/, label: "import" },
  { regex: /\beval\s*\(/, label: "eval" },
  { regex: /\bFunction\b/, label: "Function" },
  { regex: /\bglobalThis\b/, label: "globalThis" },
  { regex: /\bwindow\b/, label: "window" },
  { regex: /\bVFS\s*\./, label: "VFS namespace" },
];

type VmInnerDispatcher = (
  name: string,
  args: JsonObject,
  ctx: ToolContext,
) => Promise<unknown>;

interface VmArgs {
  scripts: string[];
}

const parseVmArgs = (args: JsonObject): VmArgs => {
  const scripts = Array.isArray(args.scripts)
    ? args.scripts.filter((item): item is string => typeof item === "string")
    : [];
  return {
    scripts,
  };
};

interface VmCallTraceItem {
  index: number;
  scriptIndex: number;
  toolName: string;
  args: JsonObject;
  success: boolean;
  code?: string;
  error?: string;
  writeTargets: string[];
}

interface VmExecutionMeta {
  scriptsRequested: number;
  scriptsCompleted: number;
  toolCallsUsed: number;
  maxToolCalls: number;
  maxScriptChars: number;
  emitted: unknown[];
  scriptResults: unknown[];
  state: JsonObject;
  callTrace: VmCallTraceItem[];
  writes: {
    successfulTargets: string[];
    failedTargets: string[];
    hasUnknownFailure: boolean;
    successfulWriteCallCount: number;
  };
  finish: {
    called: boolean;
    callCount: number;
    toolName: string | null;
    callIndex: number | null;
  };
}

const AsyncFunction = Object.getPrototypeOf(async function () {})
  .constructor as new (
  ...args: string[]
) => (...runtimeArgs: unknown[]) => Promise<unknown>;

class VmAbortError extends Error {
  public readonly toolError: ToolCallError;

  constructor(toolError: ToolCallError) {
    super(toolError.error);
    this.name = "VmAbortError";
    this.toolError = toolError;
  }
}

const isRecordObject = (value: unknown): value is JsonObject =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isToolError = (value: unknown): value is ToolCallError => {
  if (!isRecordObject(value)) {
    return false;
  }
  const record = value;
  return (
    record.success === false &&
    typeof record.error === "string" &&
    typeof record.code === "string"
  );
};

const isFinishTool = (toolName: string): boolean =>
  toolName.startsWith("vfs_finish_");

const normalizeWriteTargetPath = (rawPath: string): string | null => {
  const trimmed = rawPath.trim();
  if (!trimmed) return null;

  const normalized = normalizeVfsPath(trimmed);
  if (!normalized) return null;

  if (
    normalized.startsWith("current/") ||
    normalized.startsWith("shared/") ||
    normalized.startsWith("forks/")
  ) {
    return normalized;
  }
  return `current/${normalized}`;
};

const collectWriteTargets = (toolName: string, args: JsonObject): string[] => {
  const targets = new Set<string>();
  const pushTarget = (candidate: unknown): void => {
    if (typeof candidate !== "string") return;
    const normalized = normalizeWriteTargetPath(candidate);
    if (normalized) targets.add(normalized);
  };

  if (toolName === "vfs_move") {
    pushTarget(args.from);
    pushTarget(args.to);
    return Array.from(targets.values());
  }

  if (WRITE_MUTATION_TOOL_NAMES.has(toolName)) {
    pushTarget(args.path);
    return Array.from(targets.values());
  }

  return [];
};

interface VmLineColumn {
  line: number;
  column: number;
}

const getLineColumnFromOffset = (
  source: string,
  offset: number,
): VmLineColumn => {
  const safeOffset = Math.max(0, Math.min(source.length, offset));
  const prior = source.slice(0, safeOffset);
  const lines = prior.split("\n");
  const line = lines.length;
  const column = (lines[lines.length - 1]?.length ?? 0) + 1;
  return { line, column };
};

const parseLineColumnFromStack = (
  stack: string | undefined,
  sourceLabel: string,
  lineOffset: number,
): VmLineColumn | null => {
  if (typeof stack !== "string" || stack.length === 0) {
    return null;
  }

  const escapedSource = sourceLabel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const sourcePattern = new RegExp(`${escapedSource}:(\\d+):(\\d+)`);
  const anonymousPattern = /<anonymous>:(\d+):(\d+)/;
  const patterns = [sourcePattern, anonymousPattern];

  for (const pattern of patterns) {
    const match = pattern.exec(stack);
    if (!match) continue;
    const rawLine = Number(match[1]);
    const rawColumn = Number(match[2]);
    if (!Number.isFinite(rawLine) || !Number.isFinite(rawColumn)) {
      continue;
    }
    const line = Math.max(1, rawLine - lineOffset);
    const column = Math.max(1, rawColumn);
    return { line, column };
  }

  return null;
};

const formatLineColumn = (lineColumn: VmLineColumn): string =>
  `line ${lineColumn.line}:${lineColumn.column}`;

const withScriptLineContext = (
  error: ToolCallError,
  scriptIndex: number,
  lineColumn: VmLineColumn | null,
): ToolCallError => {
  if (!lineColumn) return error;
  if (error.error.includes(" line ")) return error;
  return {
    ...error,
    error:
      `${error.error} ` +
      `(scripts[${scriptIndex}] ${formatLineColumn(lineColumn)}).`,
  };
};

const findDangerousPattern = (
  script: string,
): { label: string; lineColumn: VmLineColumn } | null => {
  for (const item of DANGEROUS_SCRIPT_PATTERNS) {
    const match = item.regex.exec(script);
    if (match) {
      const offset =
        typeof match.index === "number" && match.index >= 0 ? match.index : 0;
      return {
        label: item.label,
        lineColumn: getLineColumnFromOffset(script, offset),
      };
    }
  }
  return null;
};

const normalizeCallArgs = (
  value: unknown,
): { ok: true; args: JsonObject } | { ok: false; error: ToolCallError } => {
  if (value == null) {
    return { ok: true, args: {} };
  }

  if (typeof value !== "object" || Array.isArray(value)) {
    return {
      ok: false,
      error: createError(
        "[VFS_VM_INVALID_ARGS] call(toolName, args) requires args to be an object.",
        "INVALID_PARAMS",
      ),
    };
  }

  return { ok: true, args: value as JsonObject };
};

const wrapInnerToolError = (params: {
  scriptIndex: number;
  callIndex: number;
  toolName: string;
  error: ToolCallError;
}): ToolCallError => ({
  ...params.error,
  error:
    `[VFS_VM_INNER_TOOL_ERROR] scripts[${params.scriptIndex}] call#${params.callIndex} ` +
    `tool="${params.toolName}": ${params.error.error}`,
});

const attachVmMeta = <T extends object>(
  result: T,
  vmMeta: VmExecutionMeta,
): T & { vmMeta: VmExecutionMeta } =>
  ({
    ...(result as object),
    vmMeta,
  }) as T & { vmMeta: VmExecutionMeta };

export const createVmHandler = (
  dispatchInner: VmInnerDispatcher,
): VfsToolHandler => {
  return async (args, ctx) => {
    const typedArgs = parseVmArgs(args);
    const scripts = Array.isArray(typedArgs.scripts) ? typedArgs.scripts : [];
    const maxToolCalls =
      typeof ctx.vfsVmMaxToolCalls === "number" &&
      Number.isFinite(ctx.vfsVmMaxToolCalls)
        ? Math.min(
            Math.max(0, Math.floor(ctx.vfsVmMaxToolCalls)),
            MAX_TOOL_CALLS_CAP,
          )
        : DEFAULT_MAX_TOOL_CALLS;
    const maxScriptChars =
      typeof ctx.vfsVmMaxScriptChars === "number" &&
      Number.isFinite(ctx.vfsVmMaxScriptChars) &&
      ctx.vfsVmMaxScriptChars > 0
        ? Math.min(
            Math.floor(ctx.vfsVmMaxScriptChars),
            DEFAULT_MAX_SCRIPT_CHARS,
          )
        : DEFAULT_MAX_SCRIPT_CHARS;

    const allowedToolNames = new Set(
      (ctx.allowedToolNames ?? []).filter(
        (name): name is string => typeof name === "string" && name.length > 0,
      ),
    );

    const emitted: unknown[] = [];
    const scriptResults: unknown[] = [];
    const state: JsonObject = {};
    const callTrace: VmCallTraceItem[] = [];
    const successfulWriteTargets = new Set<string>();
    const failedWriteTargets = new Set<string>();

    let hasUnknownWriteFailure = false;
    let successfulWriteCallCount = 0;
    let toolCallsUsed = 0;
    let scriptsCompleted = 0;
    let finishCallCount = 0;
    let finishToolName: string | null = null;
    let finishCallIndex: number | null = null;
    let activeScriptIndex = -1;
    let firstFailure: ToolCallError | null = null;

    const buildVmMeta = (): VmExecutionMeta => ({
      scriptsRequested: scripts.length,
      scriptsCompleted,
      toolCallsUsed,
      maxToolCalls,
      maxScriptChars,
      emitted: [...emitted],
      scriptResults: [...scriptResults],
      state: { ...state },
      callTrace: [...callTrace],
      writes: {
        successfulTargets: Array.from(successfulWriteTargets.values()).sort(
          (a, b) => a.localeCompare(b),
        ),
        failedTargets: Array.from(failedWriteTargets.values()).sort((a, b) =>
          a.localeCompare(b),
        ),
        hasUnknownFailure: hasUnknownWriteFailure,
        successfulWriteCallCount,
      },
      finish: {
        called: finishCallCount > 0,
        callCount: finishCallCount,
        toolName: finishToolName,
        callIndex: finishCallIndex,
      },
    });

    if (scripts.length !== 1) {
      const error = createError(
        `[VFS_VM_SCRIPT_COUNT_INVALID] Expected exactly 1 script, received ${scripts.length}.`,
        "INVALID_PARAMS",
      );
      return attachVmMeta(error, buildVmMeta());
    }

    const fail = (error: ToolCallError): VmAbortError => {
      if (!firstFailure) {
        firstFailure = error;
      }
      return new VmAbortError(error);
    };

    const call = async (
      toolName: string,
      rawArgs?: unknown,
    ): Promise<unknown> => {
      if (firstFailure) {
        throw fail(
          createError(
            "[VFS_VM_FAIL_FAST] Previous inner tool call already failed; aborting remaining vm execution.",
            "INVALID_ACTION",
          ),
        );
      }

      const normalizedToolName =
        typeof toolName === "string" ? toolName.trim() : "";
      if (!normalizedToolName) {
        throw fail(
          createError(
            "[VFS_VM_INVALID_TOOL_NAME] call(toolName, args) requires a non-empty tool name.",
            "INVALID_PARAMS",
          ),
        );
      }

      if (normalizedToolName === "vfs_vm") {
        throw fail(
          createError(
            "[VFS_VM_RECURSION_BLOCKED] vfs_vm cannot call itself.",
            "INVALID_ACTION",
          ),
        );
      }

      if (!allowedToolNames.has(normalizedToolName)) {
        throw fail(
          createError(
            `[VFS_VM_TOOL_NOT_ALLOWED] "${normalizedToolName}" is not in this loop's allowlist.`,
            "INVALID_ACTION",
          ),
        );
      }

      const isFinishCall = isFinishTool(normalizedToolName);
      if (isFinishCall && finishCallCount >= 1) {
        throw fail(
          createError(
            "[VFS_VM_MULTIPLE_FINISH_CALLS] Finish tool can be called at most once inside vfs_vm.",
            "INVALID_ACTION",
          ),
        );
      }

      if (finishCallIndex !== null) {
        throw fail(
          createError(
            "[VFS_VM_FINISH_NOT_LAST] Finish tool must be the last inner tool call inside vfs_vm.",
            "INVALID_ACTION",
          ),
        );
      }

      if (toolCallsUsed >= maxToolCalls) {
        throw fail(
          createError(
            `[VFS_VM_MAX_TOOL_CALLS_EXCEEDED] Inner tool call cap reached (${maxToolCalls}).`,
            "INVALID_ACTION",
          ),
        );
      }

      const normalizedArgs = normalizeCallArgs(rawArgs);
      if (normalizedArgs.ok === false) {
        throw fail(normalizedArgs.error);
      }

      toolCallsUsed += 1;

      let output: unknown;
      try {
        output = await dispatchInner(
          normalizedToolName,
          normalizedArgs.args,
          ctx,
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        output = createError(
          `[VFS_VM_INNER_EXECUTION_ERROR] ${normalizedToolName}: ${message}`,
          "UNKNOWN",
        );
      }

      const writeTargets = collectWriteTargets(
        normalizedToolName,
        normalizedArgs.args,
      );
      const outputError = isToolError(output) ? output : null;
      const outputIsError = outputError !== null;

      callTrace.push({
        index: callTrace.length,
        scriptIndex: activeScriptIndex,
        toolName: normalizedToolName,
        args: normalizedArgs.args,
        success: !outputIsError,
        code: outputError?.code,
        error: outputError?.error,
        writeTargets,
      });

      if (isFinishCall) {
        finishCallCount += 1;
        finishToolName = normalizedToolName;
        finishCallIndex = callTrace.length - 1;
      }

      if (WRITE_MUTATION_TOOL_NAMES.has(normalizedToolName)) {
        if (writeTargets.length === 0 && outputIsError) {
          hasUnknownWriteFailure = true;
        }

        if (outputIsError) {
          for (const target of writeTargets) {
            failedWriteTargets.add(target);
            successfulWriteTargets.delete(target);
          }
        } else {
          if (writeTargets.length > 0) {
            successfulWriteCallCount += 1;
          }
          for (const target of writeTargets) {
            successfulWriteTargets.add(target);
            failedWriteTargets.delete(target);
          }
        }
      }

      if (outputError) {
        throw fail(
          wrapInnerToolError({
            scriptIndex: activeScriptIndex,
            callIndex: toolCallsUsed,
            toolName: normalizedToolName,
            error: outputError,
          }),
        );
      }

      return output;
    };

    const totalScriptChars = scripts.reduce(
      (sum, script) => sum + script.length,
      0,
    );
    if (totalScriptChars > TOTAL_SCRIPT_CHARS_CAP) {
      const error = createError(
        `[VFS_VM_TOTAL_SCRIPT_CHARS_EXCEEDED] Total scripts length (${totalScriptChars}) exceeds ${TOTAL_SCRIPT_CHARS_CAP}.`,
        "INVALID_PARAMS",
      );
      return attachVmMeta(error, buildVmMeta());
    }

    if (allowedToolNames.size === 0) {
      const error = createError(
        "[VFS_VM_ALLOWLIST_MISSING] vfs_vm requires runtime allowlist context.",
        "INVALID_ACTION",
      );
      return attachVmMeta(error, buildVmMeta());
    }

    const helperToolNames = Array.from(allowedToolNames.values())
      .filter((name) => name.startsWith("vfs_") && name !== "vfs_vm")
      .sort((a, b) => a.localeCompare(b));
    const helperFunctions = helperToolNames.map(
      (toolName) => (toolArgs?: unknown) => call(toolName, toolArgs),
    );
    const emit = (value: unknown): void => {
      emitted.push(value);
    };

    for (let scriptIndex = 0; scriptIndex < scripts.length; scriptIndex += 1) {
      activeScriptIndex = scriptIndex;
      const script = scripts[scriptIndex] ?? "";
      const sourceLabel = `vfs_vm_script_${scriptIndex}.js`;
      const scriptLineOffset = 1;
      const scriptSource = `"use strict";\n${script}\n//# sourceURL=${sourceLabel}`;

      if (script.length > maxScriptChars) {
        firstFailure = createError(
          `[VFS_VM_SCRIPT_TOO_LARGE] scripts[${scriptIndex}] length ${script.length} exceeds maxScriptChars=${maxScriptChars}.`,
          "INVALID_PARAMS",
        );
        break;
      }

      const dangerousToken = findDangerousPattern(script);
      if (dangerousToken) {
        const lineContext = formatLineColumn(dangerousToken.lineColumn);
        if (dangerousToken.label === "VFS namespace") {
          firstFailure = createError(
            `[VFS_VM_NAMESPACE_BLOCKED] scripts[${scriptIndex}] references "VFS" at ${lineContext}. ` +
              "Call injected helpers directly without namespace (for example `await vfs_read_chars({...})` or `await call(\"vfs_read_chars\", {...})`). " +
              "Do not use `VFS.read(...)` or any `VFS.*` access.",
            "INVALID_ACTION",
          );
        } else {
          firstFailure = createError(
            `[VFS_VM_SCRIPT_FORBIDDEN_TOKEN] scripts[${scriptIndex}] contains forbidden token "${dangerousToken.label}" at ${lineContext}. ` +
              "Allowed language is JavaScript only. Forbidden tokens include: import, eval, Function, globalThis, window, VFS namespace access.",
            "INVALID_ACTION",
          );
        }
        break;
      }

      let scriptRunner: (...runtimeArgs: unknown[]) => Promise<unknown>;
      try {
        scriptRunner = new AsyncFunction(
          "call",
          "emit",
          "state",
          ...helperToolNames,
          "globalThis",
          "window",
          "Function",
          scriptSource,
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        const lineColumn = parseLineColumnFromStack(
          error instanceof Error ? error.stack : undefined,
          sourceLabel,
          scriptLineOffset,
        );
        const lineText = lineColumn ? ` ${formatLineColumn(lineColumn)}` : "";
        firstFailure = createError(
          `[VFS_VM_SCRIPT_SYNTAX_ERROR] scripts[${scriptIndex}]${lineText} failed to compile as JavaScript: ${message}`,
          "INVALID_PARAMS",
        );
        break;
      }

      try {
        const result = await scriptRunner(
          call,
          emit,
          state,
          ...helperFunctions,
          undefined,
          undefined,
          undefined,
        );
        scriptResults.push(result);
        scriptsCompleted += 1;
      } catch (error) {
        if (error instanceof VmAbortError) {
          const lineColumn = parseLineColumnFromStack(
            error.stack,
            sourceLabel,
            scriptLineOffset,
          );
          const vmError = firstFailure ?? error.toolError;
          firstFailure = withScriptLineContext(
            vmError,
            scriptIndex,
            lineColumn,
          );
        } else {
          const message =
            error instanceof Error ? error.message : String(error);
          const lineColumn = parseLineColumnFromStack(
            error instanceof Error ? error.stack : undefined,
            sourceLabel,
            scriptLineOffset,
          );
          const lineText = lineColumn ? ` ${formatLineColumn(lineColumn)}` : "";
          const referencesVfsVariable =
            /\bVFS\b/.test(message) &&
            /is not defined|is undefined|not defined/i.test(message);
          if (referencesVfsVariable) {
            firstFailure = createError(
              `[VFS_VM_NAMESPACE_BLOCKED] scripts[${scriptIndex}]${lineText} references "VFS" variable. ` +
                "Call injected helpers directly without namespace (for example `await vfs_read_chars({...})` or `await call(\"vfs_read_chars\", {...})`). " +
                "Do not use `VFS.read(...)` or any `VFS.*` access.",
              "INVALID_ACTION",
            );
          } else {
            firstFailure = createError(
              `[VFS_VM_SCRIPT_RUNTIME_ERROR] scripts[${scriptIndex}]${lineText} failed: ${message}`,
              "UNKNOWN",
            );
          }
        }
        break;
      }

      if (firstFailure) {
        break;
      }
    }

    const vmMeta = buildVmMeta();
    if (firstFailure) {
      return attachVmMeta(firstFailure, vmMeta);
    }

    const success = createSuccess(vmMeta, "vfs_vm scripts executed");
    return attachVmMeta(success, vmMeta);
  };
};
