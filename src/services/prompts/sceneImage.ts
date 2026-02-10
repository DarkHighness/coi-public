import {
  GameState,
  GameStateSnapshot,
  NPC,
  Location as GameLocation,
} from "../../types";

// --- Scene Image Prompt ---

import { getThemeStyle, getLoadedThemes } from "../themeRegistry";
import { formatImageStyleRules } from "./rulesInjector";
import {
  imageQualityPrefix,
  imageTechnicalSpecs,
  compositionDirectives,
  renderingInstructions,
  ipFidelityRequirements,
  lightingContext,
  weatherEffects,
} from "./atoms/image";
import { defineAtom, runPromptWithTrace } from "./trace/runtime";

/**
 * NPC info extracted from AI prompt or game state
 */
interface NPCInfo {
  name: string;
  description?: string;
  appearance?: string;
  status?: string;
  notes?: string; // Writer's consistency notes
}

/**
 * Extracted context from game state for image generation
 */
interface ExtractedContext {
  theme?: string;
  storyTitle?: string;
  worldSetting: string;
  time?: string;
  currentLocation?: GameLocation;
  currentLocationName?: string;
  character: {
    name: string;
    race: string;
    profession: string;
    appearance: string;
    status: string;
  };
  weather: string;
  mood: string;
  /** All known NPCs from game state (for reference lookup) */
  knownNPCs: Map<string, NPCInfo>;
}

/**
 * Extract context required for image generation from GameState/Snapshot
 * Instead of automatically detecting NPCs in the scene, provide a lookup table of all known NPCs
 */
const extractContextFromGameState = (
  gameState: GameState,
  snapshot?: GameStateSnapshot,
): ExtractedContext => {
  const stateSnapshot = snapshot || gameState;
  const worldSetting = gameState.outline?.worldSetting;

  let worldSettingStr = "";
  if (worldSetting) {
    worldSettingStr = `
      Description: ${worldSetting.visible?.description || ""}
      Rules: ${worldSetting.visible?.rules || ""}
      Hidden Rules: ${worldSetting.hidden?.hiddenRules || ""}
      Hidden Secrets: ${worldSetting.hidden?.secrets || ""}
    `;
  }

  // Build a map of all known NPCs for reference lookup
  // The AI's imagePrompt will specify which NPCs appear in the scene
  const knownNPCs = new Map<string, NPCInfo>();
  (stateSnapshot.npcs || []).forEach((r: NPC) => {
    const name = r.visible?.name || "";
    if (name) {
      knownNPCs.set(name.toLowerCase(), {
        name: r.visible.name,
        description: `${r.visible?.description || ""} [True Nature: ${r.hidden?.realPersonality || "Unknown"}]`,
        appearance: r.visible?.appearance || "",
        status: `${r.visible?.status || ""} (Actual: ${r.hidden?.status || "Normal"})`,
        notes: r.notes || "", // Writer's notes for consistency
      });
    }
  });

  // Resolve location details (case-insensitive) - now with full details
  const currentLoc =
    stateSnapshot.locations?.find(
      (l: GameLocation) =>
        String(l.id).toLowerCase() ===
        String(stateSnapshot.currentLocation).toLowerCase(),
    ) ||
    stateSnapshot.locations?.find(
      (l: GameLocation) =>
        l.name?.toLowerCase() === stateSnapshot.currentLocation?.toLowerCase(),
    );

  // Resolve atmosphere details
  const atmosphere = gameState.atmosphere || {
    envTheme: "fantasy",
    ambience: "quiet",
  };
  const weather = atmosphere.weather || "Clear";
  const mood = atmosphere.ambience || "Neutral";

  return {
    theme: gameState.theme,
    storyTitle: gameState.outline?.title,
    worldSetting: worldSettingStr,
    time: stateSnapshot.time,
    currentLocation: currentLoc,
    currentLocationName: stateSnapshot.currentLocation,
    character: {
      name: stateSnapshot.character?.name || "Unknown",
      race: stateSnapshot.character?.race || "Unknown",
      profession: stateSnapshot.character?.profession || "",
      appearance: stateSnapshot.character?.appearance || "Not described",
      status: stateSnapshot.character?.status || "Normal",
    },
    weather,
    mood,
    knownNPCs,
  };
};

/**
 * Extract mentioned NPC names from the AI-generated prompt
 * Identify by matching with the known NPC list
 */
const extractMentionedNPCs = (
  prompt: string,
  knownNPCs: Map<string, NPCInfo>,
): NPCInfo[] => {
  const mentioned: NPCInfo[] = [];
  const promptLower = prompt.toLowerCase();

  for (const [nameLower, npcInfo] of knownNPCs) {
    // Check if the NPC name appears in the prompt
    if (promptLower.includes(nameLower)) {
      mentioned.push(npcInfo);
    }
  }

  return mentioned;
};

/**
 * Get visual style reference based on story theme
 * Prioritize using theme (from GameState.theme, i.e., keys in themes.json)
 * Secondly, use storyTitle for IP name matching
 */
const getThemeStyleReference = (
  theme?: string,
  storyTitle?: string,
): string | null => {
  // 1. Priority: Direct match using theme key
  if (theme) {
    const themeKey = theme.toLowerCase().replace(/\s+/g, "_");
    const style = getThemeStyle(themeKey);
    if (style) {
      return style;
    }
  }

  // 2. Fallback: Match using storyTitle in known themes
  if (storyTitle) {
    const searchText = storyTitle.toLowerCase();
    const loadedThemes = getLoadedThemes();

    // Exact match first
    for (const key of loadedThemes) {
      if (searchText.includes(key.replace(/_/g, " "))) {
        return getThemeStyle(key) || null;
      }
    }

    // Try partial keyword matching
    const keywords = searchText.split(/\s+/);
    for (const keyword of keywords) {
      if (keyword.length < 3) continue; // Skip short words
      for (const key of loadedThemes) {
        if (key.includes(keyword)) {
          return getThemeStyle(key) || null;
        }
      }
    }
  }

  return null;
};

/**
 * Generate scene image prompt
 *
 * Important Change: No longer automatically detects NPCs in the scene
 * The AI has already decided which characters should appear in the frame when generating imagePrompt based on narrative context
 * We only need to provide game state context to enhance the AI-generated prompt
 *
 * @param prompt Scene description generated by AI (already includes character information)
 * @param gameState Game state (provides world, location, protagonist context, etc.)
 * @param snapshot Optional state snapshot (for history replay)
 */
type SceneImagePromptInput = {
  prompt: string;
  gameState?: GameState;
  snapshot?: GameStateSnapshot;
};

const sceneImagePromptAtom = defineAtom(
  {
    atomId: "atoms/media/sceneImage#getSceneImagePrompt",
    source: "prompts/sceneImage.ts",
    exportName: "sceneImagePromptAtom",
  },
  ({ prompt, gameState, snapshot }: SceneImagePromptInput, trace) => {
    if (!gameState) {
      return `<scene>
  <description>${prompt}</description>
  <quality>${trace.record(imageQualityPrefix)}</quality>
</scene>`;
    }

    const context = extractContextFromGameState(gameState, snapshot);
    const {
      theme,
      time,
      currentLocation,
      currentLocationName,
      character,
      knownNPCs,
      worldSetting,
      storyTitle,
      weather,
      mood,
    } = context;

    const mentionedNPCs = extractMentionedNPCs(prompt, knownNPCs);

    const themeStyleRef = getThemeStyleReference(theme, storyTitle);
    const styleBlock = themeStyleRef
      ? `
<style_reference>
${themeStyleRef}
</style_reference>
`
      : "";

    let xmlPrompt = `${trace.record(imageQualityPrefix)}

<visual_context>
`;

    if (storyTitle || worldSetting || theme) {
      xmlPrompt += `  <story_background>
`;
      if (storyTitle) {
        xmlPrompt += `    <title>${storyTitle}</title>
`;
      }
      if (theme) {
        xmlPrompt += `    <theme>${theme}</theme>
`;
      }
      if (worldSetting) {
        xmlPrompt += `    <world_setting>
      ${worldSetting}
    </world_setting>
`;
      }

      xmlPrompt += `    ${trace.record(ipFidelityRequirements)}
`;

      xmlPrompt += `    <narrative_context>Visual style should reinforce the story's themes and world-building, maintaining consistency with established lore and atmosphere</narrative_context>
`;
      xmlPrompt += `  </story_background>
`;
    }

    if (time) {
      xmlPrompt += `  ${trace.record(lightingContext, { time })}
`;
    }

    if (weather && weather !== "none") {
      xmlPrompt += `  ${trace.record(weatherEffects, { weather })}
`;
    }

    if (currentLocation || currentLocationName) {
      xmlPrompt += `  <environment>
`;

      if (currentLocation) {
        xmlPrompt += `    <location>
`;
        xmlPrompt += `      <name>${currentLocation.name || currentLocationName}</name>
`;
        if (currentLocation.visible?.environment) {
          xmlPrompt += `      <type>${currentLocation.visible.environment}</type>
`;
        }
        if (currentLocation.visible?.description) {
          xmlPrompt += `      <description>${currentLocation.visible.description}</description>
`;
        }
        if (currentLocation.visible?.atmosphere) {
          xmlPrompt += `      <atmosphere>${currentLocation.visible.atmosphere}</atmosphere>
`;
        }
        xmlPrompt += `    </location>
`;

        const sensory = currentLocation.visible?.sensory;
        if (sensory) {
          xmlPrompt += `    <sensory_details>
`;
          if (sensory.smell) {
            xmlPrompt += `      <smell>${sensory.smell}</smell>
`;
          }
          if (sensory.sound) {
            xmlPrompt += `      <sound>${sensory.sound}</sound>
`;
          }
          if (sensory.lighting) {
            xmlPrompt += `      <lighting>${sensory.lighting}</lighting>
`;
          }
          if (sensory.temperature) {
            xmlPrompt += `      <temperature>${sensory.temperature}</temperature>
`;
          }
          xmlPrompt += `    </sensory_details>
`;
        }

        const knownFeatures = currentLocation.visible?.knownFeatures;
        if (knownFeatures && knownFeatures.length > 0) {
          xmlPrompt += `    <notable_features>
`;
          knownFeatures.forEach((feature: string) => {
            xmlPrompt += `      <feature>${feature}</feature>
`;
          });
          xmlPrompt += `    </notable_features>
`;
        }

        const interactables = currentLocation.visible?.interactables;
        if (interactables && interactables.length > 0) {
          xmlPrompt += `    <interactables>
`;
          interactables.forEach((item: string) => {
            xmlPrompt += `      <object>${item}</object>
`;
          });
          xmlPrompt += `    </interactables>
`;
        }

        const resources = currentLocation.visible?.resources;
        if (resources && resources.length > 0) {
          xmlPrompt += `    <visible_resources>
`;
          resources.forEach((resource: string) => {
            xmlPrompt += `      <resource>${resource}</resource>
`;
          });
          xmlPrompt += `    </visible_resources>
`;
        }

        if (currentLocation.notes) {
          xmlPrompt += `    <writer_notes>${currentLocation.notes}</writer_notes>
`;
        }
      } else {
        xmlPrompt += `    <location>${currentLocationName} (Unknown Environment)</location>
`;
      }

      if (mood) {
        const moodDetails: Record<string, string> = {
          quiet:
            "Serene and still environment, minimal movement, peaceful atmosphere, soft ambient sounds implied",
          mystical:
            "Magical energy visible in air, glowing particles, ethereal lighting, otherworldly atmosphere, fantastical elements",
          horror:
            "Oppressive and threatening atmosphere, ominous shadows, disturbing details, sense of dread, unsettling elements",
          combat:
            "Dynamic and chaotic environment, action debris, impact effects, tense atmosphere, dramatic motion blur",
          tavern:
            "Warm interior lighting, wooden textures, smoke or steam, crowded or cozy atmosphere, social setting details",
          city: "Urban environment, architectural details, crowds or emptiness, ambient city lighting, modern or fantasy elements",
        };
        xmlPrompt += `    <atmosphere>${moodDetails[mood] || mood}</atmosphere>
`;
      }
      xmlPrompt += `    <environmental_details>
`;
      xmlPrompt += `      Detailed background elements, textural variety (stone, wood, metal, fabric), environmental storytelling through props and setting, atmospheric perspective with depth, foreground/midground/background separation
`;
      xmlPrompt += `    </environmental_details>
`;
      xmlPrompt += `  </environment>
`;
    }

    if (character) {
      xmlPrompt += `  <protagonist>
`;
      xmlPrompt += `    <identity>
`;
      xmlPrompt += `      <name>${character.name || "Unknown"}</name>
`;
      xmlPrompt += `      <race>${character.race || "Human"}</race>
`;
      xmlPrompt += `      <profession>${character.profession || "Adventurer"}</profession>
`;
      xmlPrompt += `    </identity>
`;
      xmlPrompt += `    <physical_description>
`;
      xmlPrompt += `      ${character.appearance || "A figure defined by their presence and gear"}
`;
      xmlPrompt += `    </physical_description>
`;
      xmlPrompt += `    <current_state>
`;
      xmlPrompt += `      <status>${character.status || "Normal"}</status>
`;
      xmlPrompt += `      <emotional_state>Convey emotion through body language, facial expression, and posture</emotional_state>
`;
      xmlPrompt += `    </current_state>
`;
      xmlPrompt += `    <visual_priority>
`;
      xmlPrompt += `      Main focus of composition, positioned using rule of thirds, detailed facial features and expressions, realistic anatomy and proportions, high detail on clothing/armor/equipment, skin texture and imperfections visible, dynamic pose suggesting action or emotion
`;
      xmlPrompt += `    </visual_priority>
`;
      xmlPrompt += `  </protagonist>
`;
    }

    if (mentionedNPCs.length > 0) {
      xmlPrompt += `  <npcs_in_scene>
`;
      xmlPrompt += `    <note>These NPCs were mentioned in the scene description. Use their appearance data to render them accurately.</note>
`;
      mentionedNPCs.slice(0, 4).forEach((npc, index) => {
        xmlPrompt += `    <npc priority="${index === 0 ? "high" : "medium"}">
`;
        xmlPrompt += `      <name>${npc.name}</name>
`;
        if (npc.description) {
          xmlPrompt += `      <description>${npc.description}</description>
`;
        }
        if (npc.appearance) {
          xmlPrompt += `      <appearance>${npc.appearance}</appearance>
`;
        }
        if (npc.status) {
          xmlPrompt += `      <status>${npc.status}</status>
`;
        }
        xmlPrompt += `      <rendering>Position relative to protagonist as described in scene, body language and expression matching narrative context, physical details consistent with appearance data</rendering>
`;
        xmlPrompt += `    </npc>
`;
      });
      xmlPrompt += `  </npcs_in_scene>
`;
    }

    xmlPrompt += `</visual_context>
`;

    xmlPrompt += `
${trace.record(compositionDirectives)}
`;

    xmlPrompt += `
${trace.record(renderingInstructions)}
`;

    xmlPrompt += `
<scene_description>
`;
    xmlPrompt += `  ${prompt}
`;
    xmlPrompt += `</scene_description>
`;

    xmlPrompt += `
${trace.record(imageTechnicalSpecs)}`;

    const customImageRules = formatImageStyleRules(gameState.customRules);
    if (customImageRules) {
      xmlPrompt += `
<custom_style_requirements>
${customImageRules}
</custom_style_requirements>`;
    }

    return styleBlock + xmlPrompt;
  },
);

/**
 * Generate scene image prompt
 *
 * Important Change: No longer automatically detects NPCs in the scene
 * The AI has already decided which characters should appear in the frame when generating imagePrompt based on narrative context
 * We only need to provide game state context to enhance the AI-generated prompt
 *
 * @param prompt Scene description generated by AI (already includes character information)
 * @param gameState Game state (provides world, location, protagonist context, etc.)
 * @param snapshot Optional state snapshot (for history replay)
 */
export const getSceneImagePrompt = (
  prompt: string,
  gameState?: GameState,
  snapshot?: GameStateSnapshot,
): string => {
  return runPromptWithTrace("media.sceneImage", () =>
    sceneImagePromptAtom({ prompt, gameState, snapshot }),
  );
};
