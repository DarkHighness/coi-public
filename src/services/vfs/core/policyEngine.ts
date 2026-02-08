import { vfsElevationTokenManager } from "./elevation";
import { vfsPathRegistry } from "./pathRegistry";
import type {
  VfsReadPolicyDecision,
  VfsWriteContext,
  VfsWriteOperation,
  VfsWritePolicyDecision,
} from "./types";

const buildWriteDecision = (
  input: Omit<VfsWritePolicyDecision, "classification"> & {
    path: string;
    context: VfsWriteContext;
  },
): VfsWritePolicyDecision => {
  const classification = vfsPathRegistry.classify(input.path, {
    activeForkId: input.context.activeForkId,
  });
  return {
    allowed: input.allowed,
    code: input.code,
    reason: input.reason,
    classification,
  };
};

const buildReadDecision = (
  path: string,
  context?: VfsWriteContext,
): VfsReadPolicyDecision => {
  const classification = vfsPathRegistry.classify(path, {
    activeForkId: context?.activeForkId,
  });
  return {
    allowed: true,
    code: "OK",
    reason: "Read access allowed.",
    classification,
  };
};

const resolveRequestedOperation = (
  context: VfsWriteContext,
): VfsWriteOperation => context.operation ?? "write";

export class VfsPolicyEngine {
  public canRead(path: string, context?: VfsWriteContext): VfsReadPolicyDecision {
    return buildReadDecision(path, context);
  }

  public canWrite(path: string, context: VfsWriteContext): VfsWritePolicyDecision {
    const classification = vfsPathRegistry.classify(path, {
      activeForkId: context.activeForkId,
    });

    if (classification.permissionClass === "immutable_readonly") {
      return {
        allowed: false,
        code: "IMMUTABLE_READONLY",
        reason: "Path is permanently read-only (immutable zone: skills/refs).",
        classification,
      };
    }

    if (context.actor === "system") {
      return {
        allowed: true,
        code: "OK",
        reason: "System actor bypasses mutable path restrictions.",
        classification,
      };
    }

    const requestedOperation = resolveRequestedOperation(context);
    if (!classification.allowedWriteOps.includes(requestedOperation)) {
      return {
        allowed: false,
        code: "FINISH_GUARD_REQUIRED",
        reason: `Operation '${requestedOperation}' is not allowed for this resource template. Allowed operations: ${classification.allowedWriteOps.join(", ")}.`,
        classification,
      };
    }

    if (classification.permissionClass === "finish_guarded") {
      if (context.allowFinishGuardedWrite === true) {
        return {
          allowed: true,
          code: "OK",
          reason: "Finish-guarded write allowed by finish protocol.",
          classification,
        };
      }

      return {
        allowed: false,
        code: "FINISH_GUARD_REQUIRED",
        reason:
          "Path is finish-guarded. Use finish protocol tooling to write this path.",
        classification,
      };
    }

    if (classification.permissionClass === "default_editable") {
      if (context.actor === "user_editor") {
        if (
          vfsElevationTokenManager.isValidEditorSessionToken(
            context.editorSessionToken,
          )
        ) {
          return {
            allowed: true,
            code: "OK",
            reason: "Editor session confirmed and writable.",
            classification,
          };
        }

        return {
          allowed: false,
          code: "EDITOR_CONFIRM_REQUIRED",
          reason: "StateEditor write requires per-open confirmation token.",
          classification,
        };
      }

      return {
        allowed: true,
        code: "OK",
        reason: "Default editable path is writable in current mode.",
        classification,
      };
    }

    if (classification.permissionClass === "elevated_editable") {
      if (context.actor === "user_editor") {
        if (
          vfsElevationTokenManager.isValidEditorSessionToken(
            context.editorSessionToken,
          )
        ) {
          return {
            allowed: true,
            code: "OK",
            reason: "Editor session token allows elevated write.",
            classification,
          };
        }

        return {
          allowed: false,
          code: "EDITOR_CONFIRM_REQUIRED",
          reason:
            "StateEditor requires confirmation token before elevated write.",
          classification,
        };
      }

      if (context.elevationGranted === true) {
        return {
          allowed: true,
          code: "OK",
          reason: "Elevated write already granted for this request batch.",
          classification,
        };
      }

      if (context.mode !== "god" && context.mode !== "sudo") {
        return {
          allowed: false,
          code: "ELEVATION_REQUIRED",
          reason:
            "Elevated path requires /god or /sudo mode with one-time user-confirmed token.",
          classification,
        };
      }

      if (!vfsElevationTokenManager.consumeAiElevationToken(context.elevationToken)) {
        return {
          allowed: false,
          code: "ELEVATION_REQUIRED",
          reason:
            "Missing or invalid elevation token. Ask user to confirm this elevated write.",
          classification,
        };
      }

      context.elevationGranted = true;
      context.elevationToken = null;

      return {
        allowed: true,
        code: "OK",
        reason: "Elevated token accepted for this write request.",
        classification,
      };
    }

    return buildWriteDecision({
      path,
      context,
      allowed: false,
      code: "IMMUTABLE_READONLY",
      reason: "Unhandled permission class.",
    });
  }
}

export const vfsPolicyEngine = new VfsPolicyEngine();
