import type { VfsElevationIntent } from "./types";

export type VfsElevationTokenKind = "ai_elevation" | "editor_session";

export type VfsElevationScopeTemplateIds = string[] | "all_elevated";

export interface IssueAiElevationTokenInput {
  intent: Exclude<VfsElevationIntent, "editor_session">;
  scopeTemplateIds: VfsElevationScopeTemplateIds;
  consumeOnUse?: boolean;
}

export interface ConsumeAiElevationTokenInput {
  templateId?: string;
  requiredIntent?: Exclude<VfsElevationIntent, "editor_session">;
  requiredScopeTemplateIds?: VfsElevationScopeTemplateIds;
}

interface TokenRecord {
  kind: VfsElevationTokenKind;
  createdAt: number;
  consumeOnUse: boolean;
  consumed: boolean;
  intent?: VfsElevationIntent;
  scopeTemplateIds?: VfsElevationScopeTemplateIds;
}

const makeTokenId = (kind: VfsElevationTokenKind): string =>
  `${kind}:${Date.now()}:${Math.random().toString(36).slice(2, 12)}`;

const normalizeScope = (
  scope: VfsElevationScopeTemplateIds,
): VfsElevationScopeTemplateIds => {
  if (scope === "all_elevated") {
    return scope;
  }

  return Array.from(
    new Set(
      scope
        .map((entry) => String(entry || "").trim())
        .filter((entry) => entry.length > 0),
    ),
  );
};

const scopeContains = (
  available: VfsElevationScopeTemplateIds | undefined,
  requested: VfsElevationScopeTemplateIds | undefined,
): boolean => {
  if (!requested) {
    return true;
  }

  if (!available) {
    return false;
  }

  if (available === "all_elevated") {
    return true;
  }

  if (requested === "all_elevated") {
    return false;
  }

  return requested.every((templateId) => available.includes(templateId));
};

export class VfsElevationTokenManager {
  private readonly records = new Map<string, TokenRecord>();

  public issueAiElevationToken(input: IssueAiElevationTokenInput): string {
    const token = makeTokenId("ai_elevation");
    const normalizedScope = normalizeScope(input.scopeTemplateIds);
    this.records.set(token, {
      kind: "ai_elevation",
      createdAt: Date.now(),
      consumeOnUse: input.consumeOnUse ?? true,
      consumed: false,
      intent: input.intent,
      scopeTemplateIds: normalizedScope,
    });
    return token;
  }

  public issueEditorSessionToken(): string {
    const token = makeTokenId("editor_session");
    this.records.set(token, {
      kind: "editor_session",
      createdAt: Date.now(),
      consumeOnUse: false,
      consumed: false,
      intent: "editor_session",
      scopeTemplateIds: "all_elevated",
    });
    return token;
  }

  public consumeAiElevationToken(
    token: string | null | undefined,
    input?: ConsumeAiElevationTokenInput,
  ): boolean {
    if (!token) {
      return false;
    }

    const record = this.records.get(token);
    if (!record) {
      return false;
    }

    if (record.kind !== "ai_elevation") {
      return false;
    }

    if (record.consumed) {
      return false;
    }

    if (input?.requiredIntent && record.intent !== input.requiredIntent) {
      return false;
    }

    if (
      !scopeContains(record.scopeTemplateIds, input?.requiredScopeTemplateIds)
    ) {
      return false;
    }

    if (
      input?.templateId &&
      !scopeContains(record.scopeTemplateIds, [input.templateId])
    ) {
      return false;
    }

    if (record.consumeOnUse) {
      record.consumed = true;
    }

    return true;
  }

  public isValidEditorSessionToken(token: string | null | undefined): boolean {
    if (!token) {
      return false;
    }

    const record = this.records.get(token);
    if (!record) {
      return false;
    }

    return record.kind === "editor_session" && !record.consumed;
  }

  public revokeEditorSessionToken(token: string | null | undefined): void {
    if (!token) {
      return;
    }

    const record = this.records.get(token);
    if (!record) {
      return;
    }

    if (record.kind !== "editor_session") {
      return;
    }

    record.consumed = true;
  }

  public reset(): void {
    this.records.clear();
  }
}

export const vfsElevationTokenManager = new VfsElevationTokenManager();
