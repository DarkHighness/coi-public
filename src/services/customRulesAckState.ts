import type {
  CustomRulesAckPendingReason,
  CustomRulesAckState,
} from "../types";
import type { VfsSession } from "./vfs/vfsSession";
import type { VfsFileMap } from "./vfs/types";
import { hashContent, normalizeVfsPath } from "./vfs/utils";

export const CUSTOM_RULES_ACK_STATE_PATH =
  "world/runtime/custom_rules_ack_state.json";

export interface CustomRulesAckSignatureDigest {
  effectiveHash: string;
  customRulesHash: string;
}

export interface RetconAckPayload {
  hash: string;
  summary: string;
}

const normalizeText = (value?: string): string =>
  typeof value === "string" ? value.trim() : "";

const isCustomRulesContentPath = (path: string): boolean => {
  const normalized = normalizeVfsPath(path);

  if (normalized.startsWith("custom_rules/")) {
    return normalized !== "custom_rules/README.md";
  }

  if (normalized.startsWith("world/custom_rules/")) {
    return true;
  }

  return false;
};

const normalizeCustomRulesFileSet = (files: VfsFileMap): string => {
  const entries = Object.values(files)
    .map((file) => {
      const path = normalizeVfsPath(file.path);
      return {
        path,
        hash:
          typeof file.hash === "string" && file.hash.trim()
            ? file.hash
            : hashContent(file.content),
      };
    })
    .filter((entry) => isCustomRulesContentPath(entry.path))
    .sort((left, right) => left.path.localeCompare(right.path));

  return JSON.stringify(entries);
};

const parseState = (raw: unknown): CustomRulesAckState | null => {
  if (!raw || typeof raw !== "object") return null;
  const data = raw as Record<string, unknown>;
  if (typeof data.effectiveHash !== "string" || !data.effectiveHash.trim()) {
    return null;
  }

  const acknowledgedHash =
    typeof data.acknowledgedHash === "string" && data.acknowledgedHash.trim()
      ? data.acknowledgedHash
      : data.effectiveHash;

  const pendingHash =
    typeof data.pendingHash === "string" && data.pendingHash.trim()
      ? data.pendingHash
      : undefined;

  const pendingReason =
    data.pendingReason === "customRules"
      ? (data.pendingReason as CustomRulesAckPendingReason)
      : undefined;

  return {
    effectiveHash: data.effectiveHash,
    acknowledgedHash,
    pendingHash,
    pendingReason,
    updatedAt:
      typeof data.updatedAt === "number" && Number.isFinite(data.updatedAt)
        ? data.updatedAt
        : Date.now(),
    customRulesHash:
      typeof data.customRulesHash === "string"
        ? data.customRulesHash
        : undefined,
  };
};

const readJson = (session: VfsSession, path: string): unknown | null => {
  const file = session.readFile(path) ?? session.readFile(`current/${path}`);
  if (!file || file.contentType !== "application/json") {
    return null;
  }
  try {
    return JSON.parse(file.content) as unknown;
  } catch {
    return null;
  }
};

const writeState = (session: VfsSession, state: CustomRulesAckState): void => {
  session.writeFile(
    CUSTOM_RULES_ACK_STATE_PATH,
    JSON.stringify(state),
    "application/json",
  );
};

export const buildCustomRulesAckSignature = (
  session: VfsSession,
): CustomRulesAckSignatureDigest => {
  const fileSet = normalizeCustomRulesFileSet(session.snapshot());
  const customRulesHash = hashContent(fileSet);

  return {
    effectiveHash: customRulesHash,
    customRulesHash,
  };
};

export const getCustomRulesAckState = (
  session: VfsSession,
): CustomRulesAckState | null => {
  const raw = readJson(session, CUSTOM_RULES_ACK_STATE_PATH);
  return parseState(raw);
};

export const syncCustomRulesAckState = (
  session: VfsSession,
): CustomRulesAckState => {
  const digest = buildCustomRulesAckSignature(session);
  const previous = getCustomRulesAckState(session);
  const now = Date.now();

  if (!previous) {
    const created: CustomRulesAckState = {
      effectiveHash: digest.effectiveHash,
      acknowledgedHash: digest.effectiveHash,
      updatedAt: now,
      customRulesHash: digest.customRulesHash,
    };
    writeState(session, created);
    return created;
  }

  if (!previous.customRulesHash) {
    const migrated: CustomRulesAckState = {
      effectiveHash: digest.effectiveHash,
      acknowledgedHash: digest.effectiveHash,
      updatedAt: now,
      customRulesHash: digest.customRulesHash,
    };
    writeState(session, migrated);
    return migrated;
  }

  const acknowledgedHash =
    typeof previous.acknowledgedHash === "string" &&
    previous.acknowledgedHash.trim()
      ? previous.acknowledgedHash
      : previous.effectiveHash;

  const next: CustomRulesAckState = {
    effectiveHash: digest.effectiveHash,
    acknowledgedHash,
    updatedAt: now,
    customRulesHash: digest.customRulesHash,
  };

  const hasCustomRulesChange =
    previous.customRulesHash !== digest.customRulesHash;
  if (hasCustomRulesChange) {
    next.pendingHash = digest.effectiveHash;
    next.pendingReason = "customRules";
  } else {
    const shouldPreservePending =
      previous.pendingReason === "customRules" &&
      previous.pendingHash === digest.effectiveHash &&
      acknowledgedHash !== digest.effectiveHash;

    if (shouldPreservePending) {
      next.pendingHash = previous.pendingHash;
      next.pendingReason = "customRules";
    }
  }

  writeState(session, next);
  return next;
};

const readCurrentGameTime = (session: VfsSession): string => {
  const raw = readJson(session, "world/global.json") as Record<
    string,
    unknown
  > | null;
  const value = raw?.time;
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }
  return "Unknown Time";
};

const appendRetconTimelineEvent = (
  session: VfsSession,
  summary: string,
  pendingHash: string,
  pendingReason?: CustomRulesAckPendingReason,
): string => {
  const eventId = `timeline:retcon_${Date.now()}`;
  const gameTime = readCurrentGameTime(session);
  const trimmedSummary = summary.trim();
  const reasonText = pendingReason || "customRules";

  const event = {
    id: eventId,
    knownBy: ["char:player"],
    name: "Continuity Shift",
    gameTime,
    category: "world_event",
    visible: {
      description: trimmedSummary,
      causedBy: "Custom rules continuity adjustment",
    },
    hidden: {
      trueDescription: `Custom rules retcon acknowledged. hash=${pendingHash}, reason=${reasonText}.`,
      trueCausedBy: "system:custom_rules",
      consequences: [`ack:${pendingHash}`, `reason:${reasonText}`],
    },
  };

  session.writeFile(
    `world/timeline/${eventId}.json`,
    JSON.stringify(event),
    "application/json",
  );

  session.writeFile(
    `world/characters/char:player/views/timeline/${eventId}.json`,
    JSON.stringify({
      entityId: eventId,
      unlocked: true,
      unlockReason: `retcon_ack:${pendingHash}`,
    }),
    "application/json",
  );

  return eventId;
};

export type ApplyRetconAckResult =
  | {
      ok: true;
      applied: false;
      state: CustomRulesAckState | null;
    }
  | {
      ok: true;
      applied: true;
      state: CustomRulesAckState;
      eventId: string;
    }
  | {
      ok: false;
      code: "INVALID_DATA";
      message: string;
    };

export const applyCustomRulesRetconAck = (
  session: VfsSession,
  retconAck?: RetconAckPayload,
): ApplyRetconAckResult => {
  const state = getCustomRulesAckState(session);
  if (!state?.pendingHash) {
    return { ok: true, applied: false, state };
  }

  if (!retconAck) {
    return {
      ok: false,
      code: "INVALID_DATA",
      message:
        `[ERROR: RETCON_ACK_REQUIRED] Custom rules changed and require acknowledgement. ` +
        `Include retconAck: { hash: "${state.pendingHash}", summary: "..." } in commit_turn.`,
    };
  }

  if (normalizeText(retconAck.hash) !== state.pendingHash) {
    return {
      ok: false,
      code: "INVALID_DATA",
      message: `[ERROR: RETCON_ACK_HASH_MISMATCH] Expected retconAck.hash="${state.pendingHash}", got "${retconAck.hash}".`,
    };
  }

  if (!normalizeText(retconAck.summary)) {
    return {
      ok: false,
      code: "INVALID_DATA",
      message:
        "[ERROR: RETCON_ACK_SUMMARY_REQUIRED] retconAck.summary must be a non-empty string.",
    };
  }

  const eventId = appendRetconTimelineEvent(
    session,
    retconAck.summary,
    state.pendingHash,
    state.pendingReason,
  );

  const nextState: CustomRulesAckState = {
    ...state,
    effectiveHash: state.pendingHash,
    acknowledgedHash: state.pendingHash,
    pendingHash: undefined,
    pendingReason: undefined,
    updatedAt: Date.now(),
  };
  writeState(session, nextState);

  return {
    ok: true,
    applied: true,
    state: nextState,
    eventId,
  };
};
