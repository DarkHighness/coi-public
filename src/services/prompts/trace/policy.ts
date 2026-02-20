import { getPromptEntryAtoms } from "./graph";
import type {
  PromptAtomGraph,
  PromptTrace,
  PromptTracePolicyResult,
} from "./types";

const REQUIRED_ATOMS: Record<string, string[]> = {
  "turn.system": [
    "atoms/core/hiddenLayerQuality#hiddenLayerQualityDescription",
    "atoms/core/dualLayerReality#dualLayerReality",
    "atoms/core/depthEnforcement#depthEnforcement",
    "atoms/core/gameSystemDesign#gameSystemDesignDescription",
    "atoms/core/worldConsistency#worldConsistencyDescription",
    "atoms/core/livingWorld#livingWorldDescription",
    "atoms/core/creativeModeVsRestricted#creativeModeVsRestrictedDescription",
  ],
  "outline.system": ["atoms/outline/system#getOutlineSystemInstruction"],
  "outline.image_seed": [
    "atoms/cultural/languageEnforcement#languageEnforcement",
  ],
  "outline.master_plan": [
    "atoms/core/gameSystemDesign#gameSystemDesign",
    "atoms/cultural/adaptation#culturalAdaptation",
    "atoms/cultural/languageEnforcement#languageEnforcementDescription",
    "atoms/narrative/narrativeScaleSelection#narrativeScaleSelection",
  ],
  "outline.world_foundation": [
    "atoms/outline/world_foundation#getOutlineWorldFoundationPrompt",
  ],
  "outline.player_actor": ["atoms/entities/characterDesign#characterDesign"],
  "outline.locations": ["atoms/entities/locationDesign#locationDesign"],
  "outline.factions": ["atoms/entities/factionDesign#factionDesign"],
  "outline.npcs_relationships": ["atoms/entities/npcDesign#npcDesign"],
  "outline.quests": ["atoms/entities/questDesign#questDesign"],
  "outline.knowledge": ["atoms/entities/knowledgeDesign#knowledgeDesign"],
  "outline.timeline": [
    "atoms/narrative/temporalPhilosophy#temporalPhilosophy",
    "atoms/entities/timelineDesign#timelineDesign",
  ],
  "outline.atmosphere": ["atoms/outline/atmosphere#getOutlineAtmospherePrompt"],
  "outline.opening_narrative": ["atoms/narrative/openingScene#openingScene"],
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
  const missingRuntimeAtoms = required.filter(
    (atomId) => !runtimeSeen.has(atomId),
  );

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
