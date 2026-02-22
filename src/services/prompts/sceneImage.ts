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
  title?: string;
  age?: string;
  gender?: string;
  race?: string;
  profession?: string;
  description?: string;
  appearance?: string;
  status?: string;
  voice?: string;
  mannerism?: string;
  mood?: string;
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
    title: string;
    age: string;
    gender: string;
    race: string;
    profession: string;
    background: string;
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
        title: r.visible?.title || "",
        age: r.visible?.age || "",
        gender: r.visible?.gender || "",
        race: r.visible?.race || "",
        profession: r.visible?.profession || "",
        description: `${r.visible?.description || ""} [True Nature: ${r.hidden?.realPersonality || "Unknown"}]`,
        appearance: r.visible?.appearance || "",
        status: `${r.visible?.status || ""} (Actual: ${r.hidden?.status || "Normal"})`,
        voice: r.visible?.voice || "",
        mannerism: r.visible?.mannerism || "",
        mood: r.visible?.mood || "",
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
      title: stateSnapshot.character?.title || "Unknown",
      age: stateSnapshot.character?.age || "Unknown",
      gender: stateSnapshot.character?.gender || "Unknown",
      race: stateSnapshot.character?.race || "Unknown",
      profession: stateSnapshot.character?.profession || "",
      background: stateSnapshot.character?.background || "",
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
      return `${prompt}\n\n${trace.record(imageQualityPrefix)}`;
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

    const parts: string[] = [];

    // 1. Scene description FIRST — this is the most important part
    parts.push(prompt);

    // 2. Setting context (concise)
    const settingParts: string[] = [];
    if (currentLocation) {
      const locName = currentLocation.name || currentLocationName;
      const locDesc = currentLocation.visible?.description;
      const locAtmo = currentLocation.visible?.atmosphere;
      settingParts.push(
        `Setting: ${locName}${locDesc ? ` — ${locDesc}` : ""}${locAtmo ? `. ${locAtmo}` : ""}`,
      );

      const sensory = currentLocation.visible?.sensory;
      if (sensory) {
        const sensoryDetails = [
          sensory.lighting && `lighting: ${sensory.lighting}`,
          sensory.smell && `smell of ${sensory.smell}`,
          sensory.temperature && `${sensory.temperature} air`,
        ]
          .filter(Boolean)
          .join(", ");
        if (sensoryDetails) {
          settingParts.push(`Sensory: ${sensoryDetails}.`);
        }
      }
    } else if (currentLocationName) {
      settingParts.push(`Setting: ${currentLocationName}.`);
    }
    if (settingParts.length > 0) {
      parts.push(settingParts.join(" "));
    }

    // 3. Lighting & weather (natural language from atoms)
    if (time) {
      const lighting = trace.record(lightingContext, { time });
      if (lighting) parts.push(lighting);
    }
    if (weather && weather !== "none") {
      const weatherDesc = trace.record(weatherEffects, { weather });
      if (weatherDesc) parts.push(weatherDesc);
    }

    // 4. Protagonist — CANONICAL identity anchor (critical for cross-turn consistency)
    if (character) {
      const identityParts = [
        character.name,
        character.race !== "Unknown" && character.race,
        character.gender !== "Unknown" && character.gender,
        character.age !== "Unknown" && `age ${character.age}`,
        character.profession && character.profession,
      ]
        .filter(Boolean)
        .join(", ");
      const appearance = character.appearance ? ` ${character.appearance}` : "";
      const status =
        character.status && character.status !== "Normal"
          ? ` Current condition: ${character.status.toLowerCase()}, visually reflected in posture and expression without altering base identity.`
          : "";
      parts.push(
        `[PROTAGONIST — maintain exact appearance across all images] ${identityParts}.${appearance}${status}`,
      );
    }

    // 5. NPCs in scene — canonical identity anchored, max 4
    if (mentionedNPCs.length > 0) {
      const npcDescs = mentionedNPCs.slice(0, 4).map((npc) => {
        const identity = [
          npc.name,
          npc.race,
          npc.gender,
          npc.age && `age ${npc.age}`,
          npc.profession,
        ]
          .filter(Boolean)
          .join(", ");
        const appearance = npc.appearance ? ` — ${npc.appearance}` : "";
        const moodDetail =
          npc.mood && npc.mood !== "Neutral"
            ? `, appearing ${npc.mood.toLowerCase()}`
            : "";
        return `${identity}${appearance}${moodDetail}`;
      });
      parts.push(
        `[NPCs — maintain consistent appearance matching descriptions] ${npcDescs.join(". ")}.`,
      );
    }

    // 6. Mood / atmosphere — rich cinematic descriptions
    if (mood) {
      const moodDescriptions: Record<string, string> = {
        quiet:
          "Serene and contemplative atmosphere, still air with soft ambient sounds implied through visual calm, gentle color palette with muted tones",
        mystical:
          "Magical energy permeating the air with visible ethereal particles, otherworldly glow from unseen sources, iridescent light refractions, dreamlike quality with slightly surreal color saturation",
        horror:
          "Oppressive, claustrophobic atmosphere with deep shadows encroaching from the edges, desaturated sickly color palette, unsettling asymmetry in composition, implied threat lurking just beyond the frame",
        combat:
          "Dynamic action scene with kinetic energy, slight motion blur on fast-moving elements, dramatic low-angle perspective, dust and debris in the air, intense contrast between highlight and shadow, adrenaline-charged atmosphere",
        tavern:
          "Warm interior bathed in golden candlelight and fireplace glow, rich wood grain textures, polished metal tankards, hazy atmosphere from hearth smoke, cozy intimate framing",
        city: "Urban environment with detailed architecture and layered depth, ambient street lighting mixing warm and cool tones, crowd and activity implied through environmental details, atmospheric perspective showing distant structures",
      };
      const moodText = moodDescriptions[mood] || mood;
      parts.push(`Atmosphere and mood: ${moodText}.`);
    }

    // 7. Composition & rendering guidance (concise)
    parts.push(trace.record(compositionDirectives));
    parts.push(trace.record(renderingInstructions));

    // 8. Quality & technical
    parts.push(trace.record(imageQualityPrefix));
    parts.push(trace.record(imageTechnicalSpecs));

    // 9. IP fidelity (if applicable)
    if (storyTitle || theme) {
      parts.push(trace.record(ipFidelityRequirements));
    }

    // 10. Style reference (theme-specific)
    if (themeStyleRef) {
      parts.push(`Style reference: ${themeStyleRef}`);
    }

    // 11. Custom style rules
    const customImageRules = formatImageStyleRules(gameState.customRules);
    if (customImageRules) {
      parts.push(customImageRules.trim());
    }

    return parts.filter((p) => p.trim()).join("\n\n");
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
