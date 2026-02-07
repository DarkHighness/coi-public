export type VfsElevationTokenKind = "ai_elevation" | "editor_session";

interface TokenRecord {
  kind: VfsElevationTokenKind;
  createdAt: number;
  consumeOnUse: boolean;
  consumed: boolean;
}

const makeTokenId = (kind: VfsElevationTokenKind): string =>
  `${kind}:${Date.now()}:${Math.random().toString(36).slice(2, 12)}`;

export class VfsElevationTokenManager {
  private readonly records = new Map<string, TokenRecord>();

  public issueAiElevationToken(): string {
    const token = makeTokenId("ai_elevation");
    this.records.set(token, {
      kind: "ai_elevation",
      createdAt: Date.now(),
      consumeOnUse: true,
      consumed: false,
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
    });
    return token;
  }

  public consumeAiElevationToken(token: string | null | undefined): boolean {
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
