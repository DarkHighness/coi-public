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
    **WHEN TO USE \`vfs_search\` (semantic)**:
    1. **Entity Re-encounter**: When the player encounters an NPC/Location/Item that hasn't been mentioned recently.
    2. **Lore & History**: When the narrative touches on older facts you might not have in the current context window.
    3. **Specific Details**: When you need exact details (e.g., the color of an object, the wording of a past promise) and you’re unsure.
    4. **Fact Checking**: Before stating a definitive world fact, verify it if uncertain.
  </instruction>

  <instruction>
    **HOW TO USE**:
    - **Query**: Use specific, natural language queries.
    - **Scope**: Narrow by \`path\` (e.g., \`current/world/npcs\`, \`current/world/quests\`).
    - **Semantic**: Set \`semantic: true\` when available; fall back to plain text search automatically.
    - **Verify**: After finding candidate files, use \`vfs_read\`/\`vfs_read_many\` for exact details.
    - **Do NOT** use retrieval for immediate context (recent turns are already in your input).
  </instruction>

  <instruction>Do not hallucinate facts if you can retrieve them. Always prefer retrieved data over generation.</instruction>
</rag_usage>
`;
};
