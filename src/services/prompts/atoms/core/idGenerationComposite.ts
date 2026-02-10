/**
 * ============================================================================
 * ID Generation Composite Atom
 * ============================================================================
 *
 * Combines ID-related atoms into a single composite:
 * - idUsageAtom
 * - idGenerationAtom
 * - minimalEntityAtom
 */

import {
  idUsageAtom,
  idGenerationAtom,
  minimalEntityAtom,
} from "./idAndEntityPolicy";

/**
 * ID Generation composite - includes ID usage rules, generation rules, and minimal entity principle
 */
export function idGenerationComposite(): string {
  return `
${idUsageAtom()}
${idGenerationAtom()}
${minimalEntityAtom()}
`;
}
