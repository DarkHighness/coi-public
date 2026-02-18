import React from "react";
import { useTranslation } from "react-i18next";
import { useOptionalRuntimeContext } from "../../runtime/context";
import { deriveGameStateFromVfs } from "../../services/vfs/derivations";
import {
  WORKSPACE_MEMORY_DOC_ORDER,
  getWorkspaceMemoryLogicalPath,
  readWorkspaceMemoryDoc,
  buildWorkspaceMemoryDefault,
  normalizeWorkspaceMemoryDoc,
  type WorkspaceMemoryDocId,
} from "../../services/vfs/memoryTemplates";

interface MemoryWorkspacePanelProps {
  className?: string;
}

const MEMORY_DOCS: Array<{
  id: WorkspaceMemoryDocId;
  path: string;
  editable: boolean;
  scope: "global" | "save";
}> = WORKSPACE_MEMORY_DOC_ORDER.map((id) => ({
  id,
  path: getWorkspaceMemoryLogicalPath(id),
  editable: id !== "IDENTITY",
  scope: id === "PLAN" ? "save" : "global",
}));

type DraftMap = Record<WorkspaceMemoryDocId, string>;

const createDefaultDraftMap = (): DraftMap => ({
  SOUL: buildWorkspaceMemoryDefault("SOUL"),
  USER: buildWorkspaceMemoryDefault("USER"),
  IDENTITY: buildWorkspaceMemoryDefault("IDENTITY"),
  PLAN: buildWorkspaceMemoryDefault("PLAN"),
});

export const MemoryWorkspacePanel: React.FC<MemoryWorkspacePanelProps> = ({
  className,
}) => {
  const { t } = useTranslation();
  const runtimeContext = useOptionalRuntimeContext();
  const vfsSession = runtimeContext?.state.vfsSession;
  const runtimeRevision = runtimeContext?.state.runtimeRevision;
  const currentSlotId = runtimeContext?.state.currentSlotId ?? null;
  const applyVfsDerivedState = runtimeContext?.actions.applyVfsDerivedState;
  const triggerSave = runtimeContext?.actions.triggerSave;
  const [activeDoc, setActiveDoc] =
    React.useState<WorkspaceMemoryDocId>("SOUL");
  const [drafts, setDrafts] = React.useState<DraftMap>(createDefaultDraftMap);
  const [status, setStatus] = React.useState<string>("");

  const hasActiveSave = Boolean(currentSlotId);

  React.useEffect(() => {
    if (!vfsSession) {
      setDrafts(createDefaultDraftMap());
      return;
    }

    setDrafts({
      SOUL: readWorkspaceMemoryDoc(vfsSession, "SOUL"),
      USER: readWorkspaceMemoryDoc(vfsSession, "USER"),
      IDENTITY: readWorkspaceMemoryDoc(vfsSession, "IDENTITY"),
      PLAN: readWorkspaceMemoryDoc(vfsSession, "PLAN"),
    });
  }, [vfsSession, runtimeRevision]);

  const activeConfig = React.useMemo(
    () => MEMORY_DOCS.find((doc) => doc.id === activeDoc) ?? MEMORY_DOCS[0],
    [activeDoc],
  );

  const isDocEditable = (doc: WorkspaceMemoryDocId): boolean => {
    if (doc === "IDENTITY") return false;
    if (doc === "PLAN") return hasActiveSave;
    return true;
  };

  const persistDoc = React.useCallback(
    (doc: WorkspaceMemoryDocId, content: string) => {
      if (!vfsSession) {
        setStatus(
          t("memory.noRuntime", {
            defaultValue:
              "Runtime session unavailable. Open a save to edit memory files.",
          }),
        );
        return;
      }
      if (doc === "PLAN" && !hasActiveSave) {
        setStatus(
          t("memory.planNeedsSave", {
            defaultValue:
              "PLAN.md is save-scoped. Open a save before editing this file.",
          }),
        );
        return;
      }

      const normalized = normalizeWorkspaceMemoryDoc(doc, content);
      vfsSession.writeFile(
        getWorkspaceMemoryLogicalPath(doc),
        normalized,
        "text/markdown",
      );
      setDrafts((prev) => ({ ...prev, [doc]: normalized }));

      const derived = deriveGameStateFromVfs(vfsSession.snapshot());
      applyVfsDerivedState?.(derived, `memory.${doc.toLowerCase()}.persist`);
      triggerSave?.();
      setStatus(
        t("memory.saved", {
          defaultValue: "Saved.",
        }),
      );
    },
    [applyVfsDerivedState, hasActiveSave, t, triggerSave, vfsSession],
  );

  const handleSave = () => {
    if (!isDocEditable(activeDoc)) return;
    persistDoc(activeDoc, drafts[activeDoc] ?? "");
  };

  const handleReset = () => {
    persistDoc(activeDoc, buildWorkspaceMemoryDefault(activeDoc));
    setStatus(
      t("memory.resetDone", {
        defaultValue: "Reset to default.",
      }),
    );
  };

  return (
    <div className={`space-y-4 ${className ?? ""}`}>
      <div>
        <h3 className="text-sm font-bold text-theme-text uppercase tracking-widest">
          {t("memory.title", { defaultValue: "Memory Workspace" })}
        </h3>
        <p className="text-[11px] text-theme-muted mt-1">
          {t("memory.description", {
            defaultValue:
              "SOUL / USER / IDENTITY are global memory docs. PLAN is save-scoped.",
          })}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {MEMORY_DOCS.map((doc) => (
          <button
            key={doc.id}
            onClick={() => setActiveDoc(doc.id)}
            className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider border rounded transition-colors ${
              activeDoc === doc.id
                ? "bg-theme-primary text-theme-bg border-theme-primary"
                : "bg-theme-surface border-theme-border text-theme-text-secondary hover:text-theme-text"
            }`}
          >
            {doc.id}
          </button>
        ))}
      </div>

      <div className="rounded border border-theme-border bg-theme-surface p-3 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-mono text-theme-text">
            {activeConfig.path}
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded bg-theme-bg text-theme-text-secondary uppercase tracking-wide">
            {activeConfig.scope === "save"
              ? t("memory.scopeSave", { defaultValue: "Save" })
              : t("memory.scopeGlobal", { defaultValue: "Global" })}
          </span>
          {!activeConfig.editable && (
            <span className="text-[10px] px-2 py-0.5 rounded bg-theme-bg text-theme-warning uppercase tracking-wide">
              {t("memory.readOnly", { defaultValue: "Read-Only" })}
            </span>
          )}
        </div>

        {activeConfig.id === "PLAN" && !hasActiveSave && (
          <div className="text-[11px] text-theme-warning">
            {t("memory.planNeedsSave", {
              defaultValue:
                "PLAN.md is save-scoped. Open a save before editing this file.",
            })}
          </div>
        )}

        <textarea
          value={drafts[activeConfig.id] ?? ""}
          onChange={(event) =>
            setDrafts((prev) => ({
              ...prev,
              [activeConfig.id]: event.target.value,
            }))
          }
          readOnly={!isDocEditable(activeConfig.id)}
          className="w-full min-h-[300px] p-3 rounded border border-theme-border bg-theme-bg text-theme-text text-xs font-mono resize-y focus:outline-none focus:ring-1 focus:ring-theme-primary disabled:opacity-70"
        />

        <div className="flex items-center gap-2">
          <button
            onClick={handleSave}
            disabled={!isDocEditable(activeConfig.id)}
            className={`px-3 py-1.5 text-xs font-bold border rounded transition-colors ${
              isDocEditable(activeConfig.id)
                ? "bg-theme-surface-highlight border-theme-border text-theme-text hover:bg-theme-primary hover:text-theme-bg"
                : "bg-theme-surface border-theme-border/40 text-theme-muted cursor-not-allowed"
            }`}
          >
            {t("save", { defaultValue: "Save" })}
          </button>
          <button
            onClick={handleReset}
            disabled={activeConfig.id === "PLAN" && !hasActiveSave}
            className={`px-3 py-1.5 text-xs font-bold border rounded transition-colors ${
              activeConfig.id === "PLAN" && !hasActiveSave
                ? "bg-theme-surface border-theme-border/40 text-theme-muted cursor-not-allowed"
                : "bg-theme-surface-highlight border-theme-border text-theme-text hover:bg-theme-primary hover:text-theme-bg"
            }`}
          >
            {t("memory.reset", { defaultValue: "Reset to Default" })}
          </button>
          {status && (
            <span className="text-[11px] text-theme-text-secondary">
              {status}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default MemoryWorkspacePanel;
