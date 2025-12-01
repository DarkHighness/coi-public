import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import type { RAGDebuggerProps } from "./types";
import { SearchTab } from "./SearchTab";
import { StatisticsTab } from "./StatisticsTab";
import { DocumentsTab } from "./DocumentsTab";

export const RAGDebugger: React.FC<RAGDebuggerProps> = ({
  isOpen,
  onClose,
  themeFont,
  gameState,
  aiSettings,
}) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<"search" | "stats" | "documents">(
    "search",
  );

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-theme-bg border border-theme-border rounded-xl shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col"
        style={{ fontFamily: themeFont }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-theme-border flex justify-between items-center">
          <h2 className="text-xl font-bold text-theme-text">
            {t("ragDebugger.title", "RAG Debugger")}
          </h2>
          <button
            onClick={onClose}
            className="text-theme-muted hover:text-theme-text transition-colors"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-theme-border">
          <button
            onClick={() => setActiveTab("search")}
            className={`px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === "search"
                ? "border-b-2 border-theme-primary text-theme-primary"
                : "text-theme-muted hover:text-theme-text"
            }`}
          >
            {t("ragDebugger.tabSearch", "Search")}
          </button>
          <button
            onClick={() => setActiveTab("stats")}
            className={`px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === "stats"
                ? "border-b-2 border-theme-primary text-theme-primary"
                : "text-theme-muted hover:text-theme-text"
            }`}
          >
            {t("ragDebugger.tabStatistics", "Statistics")}
          </button>
          <button
            onClick={() => setActiveTab("documents")}
            className={`px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === "documents"
                ? "border-b-2 border-theme-primary text-theme-primary"
                : "text-theme-muted hover:text-theme-text"
            }`}
          >
            {t("ragDebugger.tabDocuments", "Documents")}
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === "search" && (
          <SearchTab gameState={gameState} aiSettings={aiSettings} />
        )}
        {activeTab === "stats" && (
          <StatisticsTab gameState={gameState} aiSettings={aiSettings} />
        )}
        {activeTab === "documents" && (
          <DocumentsTab gameState={gameState} aiSettings={aiSettings} />
        )}
      </div>
    </div>
  );
};
