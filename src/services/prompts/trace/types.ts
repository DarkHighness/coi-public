export interface AtomCallTrace {
  id: string;
  atomId: string;
  source: string;
  exportName: string;
  parentId?: string;
  argsHash: string;
  outputChars: number;
  included: boolean;
  startedAt: number;
  endedAt: number;
}

export interface PromptSectionTrace {
  id: string;
  outputChars: number;
  included: boolean;
}

export interface PromptTrace {
  promptId: string;
  startedAt: number;
  endedAt: number;
  totalChars: number;
  atoms: AtomCallTrace[];
  sections: PromptSectionTrace[];
}

export interface PromptTracePolicyResult {
  ok: boolean;
  errors: string[];
  warnings: string[];
  missingRequiredAtoms: string[];
  missingRuntimeAtoms?: string[];
  missingStaticAtoms?: string[];
}

export interface PromptAtomGraphNode {
  atomId: string;
  filePath: string;
  exportName: string;
  directDependencies: string[];
}

export interface PromptEntryGraphNode {
  promptId: string;
  filePath: string;
  exportName: string;
  directAtoms: string[];
  transitiveAtoms: string[];
}

export interface PromptAtomGraph {
  generatedAt: string;
  atomNodes: PromptAtomGraphNode[];
  promptEntries: PromptEntryGraphNode[];
}

