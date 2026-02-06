import React, { useState, useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useOptionalRuntimeContext } from "../../runtime/context";
import type { DocumentType } from "../../services/rag";
import type {
  DocumentsTabProps,
  SearchResultDisplay,
  IndexStats,
} from "./types";
import { DocumentTypeFilter } from "./DocumentTypeFilter";

export const DocumentsTab: React.FC<DocumentsTabProps> = ({
  gameState,
  aiSettings,
}) => {
  const { t } = useTranslation();
  const runtimeContext = useOptionalRuntimeContext();
  const [allDocuments, setAllDocuments] = useState<SearchResultDisplay[]>([]);
  const [recentDocs, setRecentDocs] = useState<SearchResultDisplay[]>([]);
  const [documentsPage, setDocumentsPage] = useState(1);
  const [documentsPerPage] = useState(20);
  const [documentsFilterType, setDocumentsFilterType] = useState<
    DocumentType | "all"
  >("all");
  const [editingDocument, setEditingDocument] =
    useState<SearchResultDisplay | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadDocuments = useCallback(async () => {
    if (!runtimeContext) return;

    try {
      const docs = await runtimeContext.actions.rag.getRecentDocuments(
        1000,
        documentsFilterType === "all" ? undefined : [documentsFilterType],
      );
      setAllDocuments(
        docs.map((doc) => ({
          entityId: doc.entityId,
          type: doc.type,
          content: doc.content,
          score: 1.0,
          metadata: {
            forkId: doc.forkId,
            turnNumber: doc.turnNumber,
            importance: doc.importance,
            createdAt: doc.createdAt,
            version: doc.version,
          },
        })),
      );
    } catch (err) {
      console.error("[DocumentsTab] Failed to load documents:", err);
      setError(t("ragDebugger.searchFailed", "Failed to load documents"));
    }
  }, [runtimeContext, documentsFilterType, t]);

  // Apply client-side pagination
  useEffect(() => {
    const startIndex = (documentsPage - 1) * documentsPerPage;
    const endIndex = startIndex + documentsPerPage;
    setRecentDocs(allDocuments.slice(startIndex, endIndex));
  }, [allDocuments, documentsPage, documentsPerPage]);

  // Load documents when tab is active
  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  const handleUpdateDocument = useCallback(
    async (
      doc: SearchResultDisplay,
      newContent: string,
      newImportance: number,
    ) => {
      if (!runtimeContext || !gameState) return;

      try {
        const service = runtimeContext.actions.rag.getService?.();
        if (!service) return;

        await service.addDocuments([
          {
            entityId: doc.entityId,
            type: doc.type as any,
            content: newContent,
            saveId: runtimeContext.state.rag.currentSaveId || "unknown",
            forkId: (doc.metadata?.forkId as number) || gameState.forkId,
            turnNumber:
              (doc.metadata?.turnNumber as number) || gameState.turnNumber,
            importance: newImportance,
          },
        ]);
        setEditingDocument(null);
        loadDocuments();
      } catch (err) {
        console.error("[DocumentsTab] Failed to update document:", err);
        setError(t("ragDebugger.updateFailed", "Failed to update document"));
      }
    },
    [runtimeContext, gameState, loadDocuments, t],
  );

  const handleDeleteDocument = useCallback(
    async (entityId: string) => {
      if (
        !confirm(
          t(
            "ragDebugger.confirmDelete",
            "Are you sure you want to delete this document?",
          ),
        )
      )
        return;

      if (!runtimeContext) return;

      try {
        const service = runtimeContext.actions.rag.getService?.();
        if (!service) return;

        await service.deleteDocuments({ entityIds: [entityId] });
        loadDocuments();
      } catch (err) {
        console.error("[DocumentsTab] Failed to delete document:", err);
        setError(t("ragDebugger.deleteFailed", "Failed to delete document"));
      }
    },
    [runtimeContext, loadDocuments, t],
  );

  return (
    <div className="flex-1 overflow-y-auto p-4 flex flex-col">
      {error && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Toolbar */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2">
          <DocumentTypeFilter
            value={documentsFilterType}
            onChange={(type) => {
              setDocumentsFilterType(type);
              setDocumentsPage(1);
            }}
          />
          <button
            onClick={loadDocuments}
            className="p-1.5 text-theme-muted hover:text-theme-primary transition-colors"
            title={t("ragDebugger.refresh", "Refresh")}
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </button>
        </div>

        {/* Pagination Controls */}
        <div className="flex items-center gap-2 text-sm">
          <button
            onClick={() => setDocumentsPage((p) => Math.max(1, p - 1))}
            disabled={documentsPage === 1}
            className="px-2 py-1 border border-theme-border rounded hover:bg-theme-surface-highlight disabled:opacity-50"
          >
            &lt;
          </button>
          <span className="text-theme-text">
            {t("ragDebugger.page", "Page")} {documentsPage}
          </span>
          <button
            onClick={() => setDocumentsPage((p) => p + 1)}
            disabled={recentDocs.length < documentsPerPage}
            className="px-2 py-1 border border-theme-border rounded hover:bg-theme-surface-highlight disabled:opacity-50"
          >
            &gt;
          </button>
        </div>
      </div>

      {/* Documents Table */}
      <div className="flex-1 overflow-auto border border-theme-border rounded-lg">
        <table className="w-full text-left text-sm border-collapse">
          <thead className="bg-theme-surface-highlight/50 sticky top-0 z-10">
            <tr>
              <th className="p-3 border-b border-theme-border font-medium text-theme-muted uppercase text-xs tracking-wider">
                {t("ragDebugger.columns.type")}
              </th>
              <th className="p-3 border-b border-theme-border font-medium text-theme-muted uppercase text-xs tracking-wider">
                {t("ragDebugger.columns.entityId")}
              </th>
              <th className="p-3 border-b border-theme-border font-medium text-theme-muted uppercase text-xs tracking-wider w-1/2">
                {t("ragDebugger.columns.content")}
              </th>
              <th className="p-3 border-b border-theme-border font-medium text-theme-muted uppercase text-xs tracking-wider">
                {t("ragDebugger.columns.version")}
              </th>
              <th className="p-3 border-b border-theme-border font-medium text-theme-muted uppercase text-xs tracking-wider text-right">
                {t("ragDebugger.columns.actions")}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-theme-border/50">
            {recentDocs.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-theme-muted">
                  {t("ragDebugger.noDocsFound", "No documents found")}
                </td>
              </tr>
            ) : (
              recentDocs.map((doc, idx) => (
                <tr
                  key={`${doc.entityId}-${idx}`}
                  className="hover:bg-theme-surface-highlight/30 transition-colors group"
                >
                  <td className="p-3 align-top">
                    <span className="px-2 py-0.5 bg-theme-primary/10 text-theme-primary text-xs rounded-full uppercase font-bold border border-theme-primary/20">
                      {doc.type}
                    </span>
                  </td>
                  <td className="p-3 align-top font-mono text-xs text-theme-text/80">
                    {doc.entityId}
                    <div className="text-[10px] text-theme-muted mt-1">
                      {t("ragDebugger.labels.fork")}{" "}
                      {doc.metadata?.forkId as number}
                    </div>
                  </td>
                  <td className="p-3 align-top">
                    <div
                      className="line-clamp-2 text-theme-text/90 text-xs font-mono"
                      title={doc.content}
                    >
                      {doc.content}
                    </div>
                  </td>
                  <td className="p-3 align-top text-xs text-theme-muted">
                    v{(doc.metadata?.version as number) || 1}
                  </td>
                  <td className="p-3 align-top text-right">
                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => setEditingDocument(doc)}
                        className="p-1 text-theme-primary hover:bg-theme-primary/10 rounded"
                        title={t("common.edit", "Edit")}
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                          />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDeleteDocument(doc.entityId)}
                        className="p-1 text-red-400 hover:bg-red-400/10 rounded"
                        title={t("common.delete", "Delete")}
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Edit Modal */}
      {editingDocument && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-theme-surface border border-theme-border rounded-xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-theme-border flex justify-between items-center">
              <h3 className="text-lg font-bold text-theme-text">
                {t("ragDebugger.editDocument", "Edit Document")}
              </h3>
              <button
                onClick={() => setEditingDocument(null)}
                className="text-theme-muted hover:text-theme-text"
              >
                ✕
              </button>
            </div>
            <div className="p-4 flex-1 overflow-y-auto space-y-4">
              <div>
                <label className="block text-xs font-bold text-theme-muted uppercase mb-1">
                  {t("ragDebugger.columns.content")}
                </label>
                <textarea
                  className="w-full h-64 bg-theme-bg border border-theme-border rounded p-3 text-sm font-mono focus:border-theme-primary focus:outline-none"
                  defaultValue={editingDocument.content}
                  id="edit-doc-content"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-theme-muted uppercase mb-1">
                  {t("ragDebugger.columns.importanceScale")}
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="1"
                  className="w-full bg-theme-bg border border-theme-border rounded p-2 text-sm focus:border-theme-primary focus:outline-none"
                  defaultValue={
                    (editingDocument.metadata?.importance as number) || 0.5
                  }
                  id="edit-doc-importance"
                />
              </div>
            </div>
            <div className="p-4 border-t border-theme-border flex justify-end gap-2">
              <button
                onClick={() => setEditingDocument(null)}
                className="px-4 py-2 border border-theme-border rounded hover:bg-theme-surface-highlight transition-colors"
              >
                {t("common.cancel", "Cancel")}
              </button>
              <button
                onClick={() => {
                  const content = (
                    document.getElementById(
                      "edit-doc-content",
                    ) as HTMLTextAreaElement
                  ).value;
                  const importance = parseFloat(
                    (
                      document.getElementById(
                        "edit-doc-importance",
                      ) as HTMLInputElement
                    ).value,
                  );
                  handleUpdateDocument(editingDocument, content, importance);
                }}
                className="px-4 py-2 bg-theme-primary text-theme-bg rounded font-bold hover:bg-theme-primary-hover transition-colors"
              >
                {t("common.save", "Save")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
