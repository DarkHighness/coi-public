/**
 * Outline Loop Initializer
 *
 * Handles initialization of outline agentic loop state.
 */

import type {
  AISettings,
  TokenUsage,
  PartialStoryOutline,
  UnifiedMessage,
} from "../../../../types";
import { BudgetState, createBudgetState } from "../budgetUtils";
import { createUserMessage } from "../../../messageTypes";

// ============================================================================
// Types
// ============================================================================

export interface OutlineLoopState {
  budgetState: BudgetState;
  totalUsage: TokenUsage;
  conversationHistory: UnifiedMessage[];
  partial: PartialStoryOutline;
  currentPhase: number;
}

export interface OutlineResumeState {
  conversationHistory: UnifiedMessage[];
  partial: PartialStoryOutline;
  currentPhase: number;
}

// ============================================================================
// Initialization
// ============================================================================

export function createOutlineLoopState(
  settings: AISettings,
  theme: string,
  language: string,
  customContext?: string,
  seedImageBase64?: string,
  resumeFrom?: OutlineResumeState,
): OutlineLoopState {
  if (resumeFrom) {
    return {
      budgetState: createBudgetState(settings),
      totalUsage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
      conversationHistory: [...resumeFrom.conversationHistory],
      partial: { ...resumeFrom.partial },
      currentPhase: resumeFrom.currentPhase,
    };
  }

  const hasImage = !!seedImageBase64;
  const conversationHistory = buildInitialHistory(
    theme,
    language,
    customContext,
    seedImageBase64,
  );

  return {
    budgetState: createBudgetState(settings),
    totalUsage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
    conversationHistory,
    partial: {},
    currentPhase: hasImage ? 0 : 1,
  };
}

function buildInitialHistory(
  theme: string,
  language: string,
  customContext?: string,
  seedImageBase64?: string,
): UnifiedMessage[] {
  const hasImage = !!seedImageBase64;
  const totalPhases = hasImage ? 10 : 9;
  const phaseRange = hasImage ? "0-9" : "1-9";

  const taskText = `[OUTLINE GENERATION TASK]
Generate a story outline in ${totalPhases} phases (Phases ${phaseRange}).

Theme: ${theme}
Language: ${language}
${customContext ? `Custom Context: ${customContext}` : ""}
${hasImage ? `\n**An image has been provided.** Start with Phase 0 to analyze it.` : ""}

**PROCESS:**
- You will receive one phase instruction at a time
- For each phase, call the provided tool to submit your data
- After submitting, wait for the next phase instruction
`;

  if (hasImage && seedImageBase64) {
    const dataUrlMatch = seedImageBase64.match(/^data:([^;]+);base64,(.+)$/);
    if (dataUrlMatch) {
      return [
        {
          role: "user",
          content: [
            {
              type: "image" as const,
              mimeType: dataUrlMatch[1],
              data: dataUrlMatch[2],
            },
            { type: "text" as const, text: taskText },
          ],
        },
      ];
    }
    return [
      {
        role: "user",
        content: [
          {
            type: "image" as const,
            mimeType: "image/jpeg",
            data: seedImageBase64,
          },
          { type: "text" as const, text: taskText },
        ],
      },
    ];
  }

  return [createUserMessage(taskText)];
}

export function accumulateOutlineUsage(
  state: OutlineLoopState,
  usage: TokenUsage | undefined,
): void {
  if (usage) {
    state.totalUsage.promptTokens += usage.promptTokens || 0;
    state.totalUsage.completionTokens += usage.completionTokens || 0;
    state.totalUsage.totalTokens += usage.totalTokens || 0;
  }
}
