/**
 * Core Atom: RAG Usage
 * Content from output_format.ts
 */
import type { Atom } from "../types";

export interface RAGUsageInput {
  ragEnabled: boolean;
}

export const ragUsage: Atom<RAGUsageInput> = ({ ragEnabled }) => {
  if (!ragEnabled) return "";

  return `
<rag_usage>
  <instruction>
    **WHEN TO USE \`rag_search\`**:
    1. **Entity Re-encounter**: When the player encounters an NPC, Location, or Item that hasn't been mentioned recently.
    2. **Lore & History**: When the narrative touches on ancient history, legends, or specific world-building elements.
    3. **Specific Details**: When you need to know the specific color of an object, the exact wording of a past promise.
    4. **Fact Checking**: Before stating a definitive fact about the world, verify it if you are unsure.
  </instruction>

  <instruction>
    **HOW TO USE**:
    - **Query**: Use specific, natural language queries.
    - **Types**: Use the \`types\` filter to narrow down results.
    - **Do NOT** use RAG for immediate context (the last 10 turns are already in your input).
  </instruction>

  <instruction>Do not hallucinate facts if you can retrieve them. Always prefer retrieved data over generation.</instruction>
</rag_usage>
`;
};
