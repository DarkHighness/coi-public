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

import type { Atom } from "../types";
import { defineAtom } from "../../trace/runtime";
import {
  idUsageAtom,
  idGenerationAtom,
  minimalEntityAtom,
} from "./idAndEntityPolicy";

/**
 * ID Generation composite - includes ID usage rules, generation rules, and minimal entity principle
 */
export const idGenerationComposite: Atom<void> = defineAtom(
  {
    atomId: "atoms/core/idGenerationComposite#idGenerationComposite",
    source: "atoms/core/idGenerationComposite.ts",
    exportName: "idGenerationComposite",
  },
  (_input, trace) => `
${trace.record(idUsageAtom)}
${trace.record(idGenerationAtom)}
${trace.record(minimalEntityAtom)}
`,
);
