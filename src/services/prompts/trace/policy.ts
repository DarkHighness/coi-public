import { getPromptEntryAtoms } from "./graph";
import type {
  PromptAtomGraph,
  PromptTrace,
  PromptTracePolicyResult,
} from "./types";

const REQUIRED_ATOMS: Record<string, string[]> = {
  "turn.system": [
    "atoms/core/hiddenLayerQuality#hiddenLayerQualityPrimer",
    "atoms/core/dualLayerReality#dualLayerReality",
    "atoms/core/depthEnforcement#depthEnforcement",
    "atoms/core/gameSystemDesign#gameSystemDesignPrimer",
    "atoms/core/worldConsistency#worldConsistencyPrimer",
    "atoms/core/livingWorld#livingWorldPrimer",
    "atoms/core/creativeModeVsRestricted#creativeModeVsRestrictedPrimer",
  ],
  "outline.system": [
    "atoms/outline/system#getOutlineSystemInstruction",
  ],
  "outline.phase0": ["atoms/cultural/languageEnforcement#languageEnforcement"],
  "outline.phase1": [
    "atoms/core/gameSystemDesign#gameSystemDesign",
    "atoms/cultural/adaptation#culturalAdaptation",
    "atoms/cultural/languageEnforcement#languageEnforcementPrimer",
    "atoms/narrative/narrativeScaleSelection#narrativeScaleSelection",
  ],
  "outline.phase2.worldFoundation": [
    "atoms/outline/phase2#getOutlinePhase2WorldFoundationPrompt",
  ],
  "outline.phase3.playerActor": ["atoms/entities/characterDesign#characterDesign"],
  "outline.phase4.locations": ["atoms/entities/locationDesign#locationDesign"],
  "outline.phase5.factions": ["atoms/entities/factionDesign#factionDesign"],
  "outline.phase6.npcs": ["atoms/entities/npcDesign#npcDesign"],
  "outline.phase7.questsKnowledge": [
    "atoms/entities/questDesign#questDesign",
    "atoms/entities/knowledgeDesign#knowledgeDesign",
  ],
  "outline.phase8.timelineAtmosphere": [
    "atoms/narrative/temporalPhilosophy#temporalPhilosophy",
    "atoms/entities/timelineDesign#timelineDesign",
  ],
  "outline.phase9.openingNarrative": [
    "atoms/narrative/openingScene#openingScene",
  ],
  "summary.system": [
    "atoms/core/gmKnowledge#gmKnowledge",
    "atoms/core/entityDefinitions#entityDefinitions",
    "atoms/core/styleGuide#styleGuide",
    "atoms/narrative/causality#narrativeCausality",
    "atoms/cultural/languageEnforcement#languageEnforcement",
  ],
  "media.sceneImage": [
    "atoms/image/quality#imageQualityPrefix",
    "atoms/image/quality#imageTechnicalSpecs",
    "atoms/image/composition#compositionDirectives",
    "atoms/image/composition#renderingInstructions",
    "atoms/image/ipFidelity#ipFidelityRequirements",
    "atoms/image/lighting#lightingContext",
    "atoms/image/weather#weatherEffects",
  ],
  "media.veoScript": [
    "atoms/veo/cinematographerRole#cinematographerRole",
    "atoms/veo/perspectiveInstruction#perspectiveInstruction",
    "atoms/veo/visualContinuity#visualContinuityRules",
    "atoms/veo/visualLanguage#veoOutputStructure",
    "atoms/veo/visualLanguage#veoPromptRequirements",
    "atoms/veo/visualLanguage#veoFinalDirective",
    "atoms/veo/shotBreakdown#shotBreakdownTemplate",
    "atoms/veo/shotBreakdown#mandatoryKeywords",
    "atoms/veo/shotBreakdown#avoidList",
  ],
};

export function getRequiredAtomsForPrompt(promptId: string): string[] {
  return REQUIRED_ATOMS[promptId] || [];
}

export function validatePromptTrace(
  promptId: string,
  trace: PromptTrace,
  graph?: PromptAtomGraph,
): PromptTracePolicyResult {
  const required = getRequiredAtomsForPrompt(promptId);

  const runtimeSeen = new Set(trace.atoms.map((atom) => atom.atomId));
  const missingRuntimeAtoms = required.filter((atomId) => !runtimeSeen.has(atomId));

  const errors: string[] = [];
  const warnings: string[] = [];

  if (missingRuntimeAtoms.length > 0) {
    errors.push(
      `Missing required runtime atoms for ${promptId}: ${missingRuntimeAtoms.join(", ")}`,
    );
  }

  let missingStaticAtoms: string[] = [];
  if (graph) {
    const staticEntry = getPromptEntryAtoms(graph, promptId);
    const staticSeen = new Set(
      staticEntry.transitive.length > 0
        ? staticEntry.transitive
        : staticEntry.direct,
    );

    missingStaticAtoms = required.filter((atomId) => !staticSeen.has(atomId));
    if (missingStaticAtoms.length > 0) {
      errors.push(
        `Missing required static atoms for ${promptId}: ${missingStaticAtoms.join(", ")}`,
      );
    }

    for (const runtimeAtomId of runtimeSeen) {
      if (!staticSeen.has(runtimeAtomId)) {
        warnings.push(
          `Runtime atom ${runtimeAtomId} for ${promptId} was not found in static graph reachability.`,
        );
      }
    }
  }

  if (trace.totalChars === 0) {
    warnings.push(`Prompt ${promptId} produced empty output.`);
  }

  const missingRequiredAtoms = [
    ...new Set([...missingRuntimeAtoms, ...missingStaticAtoms]),
  ];

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    missingRequiredAtoms,
    missingRuntimeAtoms,
    missingStaticAtoms,
  };
}
