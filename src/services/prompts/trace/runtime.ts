import type { SkillOutput } from "../atoms/types";
import type {
  AtomCallTrace,
  PromptSectionTrace,
  PromptTrace,
  PromptAtomKind,
  RegisteredPromptAtom,
} from "./types";

type PromptTraceSession = {
  trace: {
    promptId: string;
    startedAt: number;
    endedAt: number;
    totalChars: number;
    atoms: AtomCallTrace[];
    sections: PromptSectionTrace[];
  };
  callStack: string[];
  callSeq: number;
};

export type AtomTraceMeta = {
  atomId: string;
  source: string;
  exportName: string;
};

type AtomTraceKind = Exclude<PromptAtomKind, "inline">;
type AtomLikeFn<TInput = unknown> = (input: TInput) => string;

const ATOM_TRACE_META = Symbol("promptTraceMeta");
const ATOM_TRACE_KIND = Symbol("promptTraceKind");

type TraceTaggedFn = {
  [ATOM_TRACE_META]?: AtomTraceMeta;
  [ATOM_TRACE_KIND]?: AtomTraceKind;
};

export interface PromptTraceRuntime {
  record<TInput>(atom: AtomLikeFn<TInput>, input?: TInput): string;
  record<TInput>(
    meta: AtomTraceMeta,
    atom: AtomLikeFn<TInput>,
    input?: TInput,
  ): string;
  section(id: string, content: string): string;
}

const promptTraceSessions: PromptTraceSession[] = [];
const promptTraceLatest = new Map<string, PromptTrace>();
const promptTraceHistory: PromptTrace[] = [];
const registeredPromptAtoms = new Map<string, RegisteredPromptAtom>();
const MAX_TRACE_HISTORY = 200;

let promptTraceEnabled = false;

function currentSession(): PromptTraceSession | undefined {
  return promptTraceSessions[promptTraceSessions.length - 1];
}

function safeJson(value: unknown): string {
  try {
    const json = JSON.stringify(value);
    return json ?? String(value ?? "");
  } catch {
    return String(value ?? "");
  }
}

function hashString(input: string): string {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function hashArgs(input: unknown): string {
  return hashString(safeJson(input));
}

function estimateSkillOutputChars(output: SkillOutput): number {
  const parts: string[] = [output.main || "", output.quickStart || ""];
  if (Array.isArray(output.checklist)) {
    parts.push(output.checklist.join("\n"));
  }
  if (Array.isArray(output.examples)) {
    parts.push(
      output.examples
        .map(
          (example) =>
            `${example.scenario || ""}${example.wrong}${example.right}`,
        )
        .join("\n"),
    );
  }
  if (output.references) {
    parts.push(Object.values(output.references).join("\n"));
  }
  return parts.join("\n").length;
}

function finalizeTrace(trace: PromptTrace): void {
  promptTraceLatest.set(trace.promptId, trace);
  promptTraceHistory.push(trace);
  if (promptTraceHistory.length > MAX_TRACE_HISTORY) {
    promptTraceHistory.splice(0, promptTraceHistory.length - MAX_TRACE_HISTORY);
  }
}

function toTrace(session: PromptTraceSession): PromptTrace {
  const { trace } = session;
  return {
    promptId: trace.promptId,
    startedAt: trace.startedAt,
    endedAt: trace.endedAt,
    totalChars: trace.totalChars,
    atoms: [...trace.atoms],
    sections: [...trace.sections],
  };
}

function inferOutputChars(output: unknown): number {
  if (typeof output === "string") return output.length;
  if (output === null || output === undefined) return 0;
  if (typeof output === "object") return safeJson(output).length;
  return String(output).length;
}

function attachTraceMeta<TFn extends Function>(
  fn: TFn,
  meta: AtomTraceMeta,
  kind: AtomTraceKind,
): TFn {
  const tagged = fn as TFn & TraceTaggedFn;
  tagged[ATOM_TRACE_META] = meta;
  tagged[ATOM_TRACE_KIND] = kind;
  return fn;
}

function getTraceMeta(fn: unknown): AtomTraceMeta | undefined {
  if (!fn || typeof fn !== "function") return undefined;
  return (fn as TraceTaggedFn)[ATOM_TRACE_META];
}

function getTraceKind(fn: unknown): AtomTraceKind | undefined {
  if (!fn || typeof fn !== "function") return undefined;
  return (fn as TraceTaggedFn)[ATOM_TRACE_KIND];
}

function registerPromptAtom(meta: AtomTraceMeta, kind: AtomTraceKind): void {
  registeredPromptAtoms.set(meta.atomId, {
    atomId: meta.atomId,
    source: meta.source,
    exportName: meta.exportName,
    kind,
  });
}

function runRecordedCall<TInput, TOutput>(
  meta: AtomTraceMeta,
  kind: PromptAtomKind,
  input: TInput,
  invoke: (input: TInput) => TOutput,
  outputCharsEstimator: (output: TOutput | undefined) => number,
): TOutput {
  const session = currentSession();
  if (!session) {
    return invoke(input);
  }

  const callId = `${meta.atomId}:${session.callSeq + 1}`;
  const parentId = session.callStack[session.callStack.length - 1];
  const startedAt = Date.now();
  session.callSeq += 1;
  session.callStack.push(callId);

  let output: TOutput | undefined;
  try {
    output = invoke(input);
    return output;
  } finally {
    session.callStack.pop();
    const endedAt = Date.now();
    const outputChars = outputCharsEstimator(output);
    session.trace.atoms.push({
      id: callId,
      atomId: meta.atomId,
      source: meta.source,
      exportName: meta.exportName,
      kind,
      parentId,
      argsHash: hashArgs(input),
      outputChars,
      included: outputChars > 0,
      startedAt,
      endedAt,
    });
  }
}

function inferRecordMeta(fn: AtomLikeFn<unknown>): AtomTraceMeta {
  return (
    getTraceMeta(fn) || {
      atomId: `atoms/inline/${fn.name || "anonymous"}#record`,
      source: "inline",
      exportName: fn.name || "anonymous",
    }
  );
}

function createTraceRuntime(): PromptTraceRuntime {
  const runtime: PromptTraceRuntime = {
    record<TInput>(
      first: AtomTraceMeta | AtomLikeFn<TInput>,
      second?: AtomLikeFn<TInput> | TInput,
      third?: TInput,
    ): string {
      let meta: AtomTraceMeta;
      let atomFn: AtomLikeFn<TInput>;
      let input: TInput | undefined;
      let kind: PromptAtomKind;

      if (typeof first === "function") {
        atomFn = first;
        input = second as TInput | undefined;

        const taggedMeta = getTraceMeta(atomFn as AtomLikeFn<unknown>);
        if (taggedMeta) {
          return atomFn(input as TInput) ?? "";
        }

        meta = inferRecordMeta(atomFn as AtomLikeFn<unknown>);
        kind = "inline";
      } else {
        meta = first;
        atomFn = second as AtomLikeFn<TInput>;
        input = third;
        kind = getTraceKind(atomFn as AtomLikeFn<unknown>) ?? "inline";
      }

      return runRecordedCall(
        meta,
        kind,
        input as TInput,
        (value) => atomFn(value) ?? "",
        (output) =>
          typeof output === "string" ? output.length : inferOutputChars(output),
      );
    },

    section(id: string, content: string): string {
      recordPromptSection(id, content);
      return content;
    },
  };

  return runtime;
}

export function setPromptTraceEnabled(enabled: boolean): void {
  promptTraceEnabled = enabled;
}

export function isPromptTraceEnabled(): boolean {
  return promptTraceEnabled;
}

export function clearPromptTraceRegistry(): void {
  promptTraceLatest.clear();
  promptTraceHistory.splice(0, promptTraceHistory.length);
}

export function getLatestPromptTrace(promptId: string): PromptTrace | undefined {
  return promptTraceLatest.get(promptId);
}

export function getPromptTraceHistory(): PromptTrace[] {
  return [...promptTraceHistory];
}

export function getRegisteredPromptAtoms(): RegisteredPromptAtom[] {
  return [...registeredPromptAtoms.values()].sort((left, right) =>
    left.atomId.localeCompare(right.atomId),
  );
}

export function getRegisteredPromptAtom(
  atomId: string,
): RegisteredPromptAtom | undefined {
  return registeredPromptAtoms.get(atomId);
}

export function runPromptWithTrace<T>(promptId: string, renderFn: () => T): T {
  if (!promptTraceEnabled) {
    return renderFn();
  }

  const session: PromptTraceSession = {
    trace: {
      promptId,
      startedAt: Date.now(),
      endedAt: 0,
      totalChars: 0,
      atoms: [],
      sections: [],
    },
    callStack: [],
    callSeq: 0,
  };

  promptTraceSessions.push(session);

  try {
    const output = renderFn();
    session.trace.totalChars = inferOutputChars(output);
    return output;
  } finally {
    session.trace.endedAt = Date.now();
    promptTraceSessions.pop();
    finalizeTrace(toTrace(session));
  }
}

export function recordPromptSection(id: string, content: string): void {
  const session = currentSession();
  if (!session) return;

  session.trace.sections.push({
    id,
    outputChars: content.length,
    included: content.length > 0,
  });
}

export function defineAtom<TInput>(
  meta: AtomTraceMeta,
  fn: (input: TInput, trace: PromptTraceRuntime) => string,
): (input: TInput) => string {
  registerPromptAtom(meta, "atom");

  const wrapped = (input: TInput) =>
    runRecordedCall(
      meta,
      "atom",
      input,
      (value) => fn(value, createTraceRuntime()) ?? "",
      (output) =>
        typeof output === "string" ? output.length : inferOutputChars(output),
    );

  return attachTraceMeta(wrapped, meta, "atom");
}

export function defineSkillAtom<TInput>(
  meta: AtomTraceMeta,
  fn: (input: TInput, trace: PromptTraceRuntime) => SkillOutput,
): (input: TInput) => SkillOutput {
  registerPromptAtom(meta, "skill");

  const wrapped = (input: TInput) =>
    runRecordedCall(
      meta,
      "skill",
      input,
      (value) => fn(value, createTraceRuntime()),
      (output) => (output ? estimateSkillOutputChars(output) : 0),
    );

  return attachTraceMeta(wrapped, meta, "skill");
}
