/**
 * ============================================================================
 * Skills Module - Main Exports (Simplified v3.0)
 * ============================================================================
 *
 * This module has been simplified. The old SkillRegistry system is removed.
 * System prompts are now built by directly composing atoms.
 */

// Types
export type { PromptContext } from "./builder";

// Builder - Main exports
export {
  buildSkillContext,
  buildCoreSystemInstructionWithSkills,
} from "./builder";
