/**
 * ============================================================================
 * Atom Types - Atomic Type Definitions
 * ============================================================================
 *
 * Atom is the smallest indivisible prompt fragment.
 * Each Atom is a function that receives a custom input type and returns a rendered prompt string.
 *
 * Design Principles:
 * 1. Each Atom defines its own input type, no unified Context.
 * 2. Logic Separation: Logically incoherent content is split into independent Atoms.
 * 3. Composable: Multiple Atoms can be combined into a larger prompt.
 */

/**
 * Atom - Smallest indivisible prompt fragment
 *
 * @template TInput - Atom input type, custom for each atom
 * @param input - Parameters required to render this atom
 * @returns Rendered prompt string
 *
 * @example
 * // Define a simple Atom
 * type GreetingInput = { name: string; language: string };
 * const greeting: Atom<GreetingInput> = ({ name, language }) =>
 *   language === 'zh' ? `你好，${name}！` : `Hello, ${name}!`;
 *
 * @example
 * // Atom without parameters
 * const dualLayerReality: Atom<void> = () => `
 * <dual_layer_reality>
 * Every entity has TWO layers: Visible and Hidden.
 * </dual_layer_reality>`;
 */
export type Atom<TInput = void> = (input: TInput) => string;

// ============================================================================
// Skill Output Types - For VFS skill multi-file generation
// ============================================================================

/**
 * Before/After example for skills
 */
export interface SkillExample {
  /** Scenario description */
  scenario?: string;
  /** Optional context envelope for this example */
  context?: string[];
  /** Optional constraints that should remain true in this scenario */
  constraints?: string[];
  /** Optional pitfalls to avoid when adapting this example */
  pitfalls?: string[];
  /** Wrong approach */
  wrong: string;
  /** Right approach */
  right: string;
}

/**
 * SkillOutput - Structured output of Skill
 *
 * Used for VFS skill generator, producing multiple files:
 * - SKILL.md (main content)
 * - CHECKLIST.md (optional)
 * - EXAMPLES.md (optional)
 */
export interface SkillOutput {
  /** Main content - for SKILL.md */
  main: string;

  /** Quick Start - 60s workflow (optional, embedded in SKILL.md) */
  quickStart?: string;

  /** Checklist - for CHECKLIST.md (optional) */
  checklist?: string[];

  /** Before/After examples - for EXAMPLES.md (optional) */
  examples?: SkillExample[];

  /** References - for references/*.md (optional) */
  references?: Record<string, string>;
}

/**
 * SkillAtom - Skill Atom returning structured output
 *
 * @template TInput - Atom input type
 * @returns SkillOutput structured content
 *
 * @example
 * const gmKnowledgeSkill: SkillAtom<void> = () => ({
 *   main: `# GM Knowledge Model\n...`,
 *   checklist: ['Player has definitive proof?', 'Revelation is complete?'],
 *   examples: [{ wrong: 'Unlock on suspicion', right: 'Unlock on proof' }]
 * });
 */
export type SkillAtom<TInput = void> = (input: TInput) => SkillOutput;

/**
 * AtomDefinition - Atom metadata definition (for registration and documentation)
 *
 * @template TInput - Atom input type
 */
export interface AtomDefinition<TInput = void> {
  /** Unique identifier, e.g., 'dual_layer_reality', 'render_npc_visible' */
  id: string;

  /** Human readable name */
  name: string;

  /** Usage description */
  description: string;

  /** Atom function */
  atom: Atom<TInput>;

  /** Estimated tokens (for budget calculation) */
  estimatedTokens?: number;

  /** IDs of other dependent atoms (for auto-loading) */
  dependencies?: string[];

  /** Tags, for classification and search */
  tags?: string[];
}

// ============================================================================
// Re-export common types from main types file for convenience
// ============================================================================

export type {
  NPC,
  Location,
  InventoryItem,
  Quest,
  Faction,
  KnowledgeEntry as Knowledge,
  TimelineEvent,
  Condition,
  CausalChain,
  CharacterStatus as Character,
  GameState,
} from "../../../types";
