import { GameState, AISettings } from "../../types";
import type { DocumentType } from "../../services/rag";

export interface RAGDebuggerProps {
  isOpen: boolean;
  onClose: () => void;
  themeFont: string;
  gameState?: GameState;
  aiSettings?: AISettings;
}

export interface SearchResultDisplay {
  entityId: string;
  type: string;
  content: string;
  score: number;
  metadata?: Record<string, unknown>;
}

export interface IndexStats {
  documentCount: number;
  modelId: string;
  provider: string;
  isInitialized: boolean;
  currentSaveId: string | null;
  storageDocuments: number;
  memoryDocuments: number;
}

export interface SearchTabProps {
  gameState?: GameState;
  aiSettings?: AISettings;
}

export interface StatisticsTabProps {
  gameState?: GameState;
  aiSettings?: AISettings;
}

export interface DocumentsTabProps {
  gameState?: GameState;
  aiSettings?: AISettings;
}
