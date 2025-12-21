import {
  GameState,
  GameStateSnapshot,
  ImageGenerationContext,
  Relationship,
  Location as GameLocation,
} from "../../types";

// --- Scene Image Prompt ---

import { getThemeStyle, getLoadedThemes } from "../themeRegistry";
import { formatImageStyleRules } from "./rulesInjector";

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
 * 从 GameState/Snapshot 中提取图像生成所需的上下文
 * 不再自动检测场景中的 NPC，而是提供所有已知 NPC 的查找表
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
  (stateSnapshot.relationships || []).forEach((r: Relationship) => {
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
  const currentLoc = stateSnapshot.locations?.find(
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
 * 从 AI 生成的 prompt 中提取提到的 NPC 名字
 * 通过与已知 NPC 列表匹配来识别
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
 * 获取基于故事主题（theme）的视觉风格参考
 * 优先使用 theme（来自 GameState.theme，即 themes.json 的键）
 * 其次使用 storyTitle 进行 IP 名称匹配
 */
const getThemeStyleReference = (
  theme?: string,
  storyTitle?: string,
): string | null => {
  // 1. 优先：直接使用 theme 键匹配
  if (theme) {
    const themeKey = theme.toLowerCase().replace(/\s+/g, "_");
    const style = getThemeStyle(themeKey);
    if (style) {
      return style;
    }
  }

  // 2. 备用：使用 storyTitle 在已知主题中匹配
  if (storyTitle) {
    const searchText = storyTitle.toLowerCase();
    const loadedThemes = getLoadedThemes();

    // 精确匹配优先
    for (const key of loadedThemes) {
      if (searchText.includes(key.replace(/_/g, " "))) {
        return getThemeStyle(key) || null;
      }
    }

    // 尝试部分匹配关键词
    const keywords = searchText.split(/\s+/);
    for (const keyword of keywords) {
      if (keyword.length < 3) continue; // 跳过短词
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
 * 生成场景图片提示词
 *
 * 重要变更：不再自动检测场景中的 NPC
 * AI 在生成 imagePrompt 时已经根据叙事上下文决定了哪些角色应该出现在画面中
 * 我们只需要提供游戏状态上下文来增强 AI 生成的 prompt
 *
 * @param prompt AI 生成的场景描述（已包含角色信息）
 * @param gameState 游戏状态（提供世界、位置、主角等上下文）
 * @param snapshot 可选的状态快照（用于历史回放）
 */
export const getSceneImagePrompt = (
  prompt: string,
  gameState?: GameState,
  snapshot?: GameStateSnapshot,
): string => {
  // Enhanced XML-based prompt with maximum detail
  // XML structure helps AI models parse complex, multi-faceted scene descriptions

  if (!gameState) {
    // Fallback: Wrap basic prompt in minimal structure
    return `<scene>
  <description>${prompt}</description>
  <quality>masterpiece, best quality, 8k, ultra detailed, cinematic composition, photorealistic</quality>
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

  // Extract NPCs mentioned in the AI's prompt and enrich with game state data
  const mentionedNPCs = extractMentionedNPCs(prompt, knownNPCs);

  // === QUALITY TAGS (Front for emphasis in some models) ===
  const qualityPrefix = `(Masterpiece, Best Quality, 8K Resolution, Ultra-Detailed, Cinematic Lighting, Ray Tracing, Global Illumination, Unreal Engine 5 Render, Photorealistic, Professional Photography, High Fidelity, Hyperrealistic Textures)`;

  // === STYLE REFERENCE ===
  const themeStyleRef = getThemeStyleReference(theme, storyTitle);
  const styleBlock = themeStyleRef
    ? `\n<style_reference>\n${themeStyleRef}\n</style_reference>\n`
    : "";

  // === BUILD COMPREHENSIVE XML CONTEXT ===
  let xmlPrompt = `${qualityPrefix}\n\n<visual_context>\n`;

  // Story Background and Narrative Context
  if (storyTitle || worldSetting || theme) {
    xmlPrompt += `  <story_background>\n`;
    if (storyTitle) {
      xmlPrompt += `    <title>${storyTitle}</title>\n`;
    }
    if (theme) {
      xmlPrompt += `    <theme>${theme}</theme>\n`;
    }
    if (worldSetting) {
      xmlPrompt += `    <world_setting>\n      ${worldSetting}\n    </world_setting>\n`;
    }

    // ALWAYS include IP fidelity requirements - let the image model determine if applicable
    xmlPrompt += `    <ip_fidelity_requirements>\n`;
    xmlPrompt += `      If this story is based on an established intellectual property (IP), game, novel, film, or other known work:\n`;
    xmlPrompt += `      You MUST adhere to the original IP's visual identity:\n`;
    xmlPrompt += `      - **Art Style**: Match the visual style of original illustrations, concept art, or film/game adaptations\n`;
    xmlPrompt += `      - **Composition**: Use framing and shot composition consistent with the source material's cinematography or illustration style\n`;
    xmlPrompt += `      - **Color Palette**: Replicate the characteristic color schemes and grading of the original work\n`;
    xmlPrompt += `      - **Iconic Elements**: Include signature visual motifs, symbols, or design elements from the IP (e.g., lightsabers for Star Wars, One Ring for LOTR, etc.)\n`;
    xmlPrompt += `      - **Character Design**: Maintain consistency with established character appearances and costume designs from the source material\n`;
    xmlPrompt += `      - **World Design**: Architecture, environments, and props must match the IP's established aesthetic and lore\n`;
    xmlPrompt += `      - **Tone**: Capture the visual mood and atmosphere that defines the original property\n`;
    xmlPrompt += `      - **References**: Draw from official artwork, film stills, game screenshots, or published illustrations\n`;
    xmlPrompt += `      DO NOT deviate from the established visual language if this is a known IP. Fans expect authenticity.\n`;
    xmlPrompt += `      If this is NOT based on a known IP, you may use creative freedom while maintaining thematic consistency.\n`;
    xmlPrompt += `    </ip_fidelity_requirements>\n`;

    xmlPrompt += `    <narrative_context>Visual style should reinforce the story's themes and world-building, maintaining consistency with established lore and atmosphere</narrative_context>\n`;
    xmlPrompt += `  </story_background>\n`;
  }

  // Time and Lighting
  if (time) {
    xmlPrompt += `  <temporal_context>\n`;
    xmlPrompt += `    <time>${time}</time>\n`;

    // Detailed lighting based on time
    const timeLower = time.toLowerCase();
    let lightingDetails = "";
    if (timeLower.match(/night|midnight|晚|夜/)) {
      lightingDetails = `Moonlight casting silver highlights, deep indigo and black shadows, stars visible in sky, artificial light sources (torches, lanterns, magical glows, neon signs) providing warm or colored accents, cold blue color temperature, high contrast between light and shadow, mysterious atmosphere, specular highlights on wet surfaces`;
    } else if (timeLower.match(/dawn|sunrise|晨|黎明/)) {
      lightingDetails = `Soft diffused morning light, golden hour warmth beginning to spread, pastel pink and orange sky, long gentle shadows, dew glistening on surfaces, cool-to-warm color transition, ethereal and peaceful atmosphere, rim lighting on characters, volumetric morning mist`;
    } else if (timeLower.match(/dusk|sunset|黄昏|傍晚/)) {
      lightingDetails = `Dramatic golden hour lighting, vibrant orange and purple sky, long dramatic shadows, warm backlight creating silhouettes, rich color saturation, lens flare potential, romantic or melancholic atmosphere, strong rim lighting, subsurface scattering on skin`;
    } else {
      lightingDetails = `Balanced natural daylight, clear visibility, soft ambient shadows, realistic color rendering, even illumination, bright and open atmosphere, sharp shadows, high dynamic range`;
    }
    xmlPrompt += `    <lighting>\n      ${lightingDetails}\n    </lighting>\n`;
    xmlPrompt += `  </temporal_context>\n`;
  }

  // Weather and Atmospheric Effects
  if (weather && weather !== "none") {
    xmlPrompt += `  <weather_effects>\n`;
    const weatherDetails: Record<string, string> = {
      rain: "Rain falling, wet surfaces with high reflectivity, water droplets on skin/clothing, puddles reflecting environment, misty atmosphere, cool color palette, dramatic contrast, screen space reflections",
      snow: "Snow falling, accumulation on surfaces, cold breath visible, frost and ice details with subsurface scattering, muted white and blue tones, soft diffused light, peaceful yet cold atmosphere",
      fog: "Dense volumetric fog obscuring background, limited visibility, mysterious atmosphere, soft focus on distant objects, diffused light, muted colors, ethereal quality, light shafts piercing through fog",
      embers:
        "Glowing embers floating in air, warm orange light sources, fire glow, ash particles, heat haze distortion, warm color temperature, magical or destructive atmosphere",
      flicker:
        "Unstable lighting, flickering shadows, dramatic light changes, supernatural or electrical atmosphere, high contrast, tension and unease, strobe effects",
      sunny:
        "Bright sunlight, clear sky, strong shadows, vibrant colors, warm atmosphere, lens flare, high visibility, cheerful or harsh depending on intensity, caustic reflections",
    };
    xmlPrompt += `    ${weatherDetails[weather] || weather}\n`;
    xmlPrompt += `  </weather_effects>\n`;
  }

  // Location and Environment - now with rich details
  if (currentLocation || currentLocationName) {
    xmlPrompt += `  <environment>\n`;

    if (currentLocation) {
      // Full location details from Location object
      xmlPrompt += `    <location>\n`;
      xmlPrompt += `      <name>${currentLocation.name || currentLocationName}</name>\n`;
      if (currentLocation.visible?.environment) {
        xmlPrompt += `      <type>${currentLocation.visible.environment}</type>\n`;
      }
      if (currentLocation.visible?.description) {
        xmlPrompt += `      <description>${currentLocation.visible.description}</description>\n`;
      }
      if (currentLocation.visible?.atmosphere) {
        xmlPrompt += `      <atmosphere>${currentLocation.visible.atmosphere}</atmosphere>\n`;
      }
      xmlPrompt += `    </location>\n`;

      // Sensory Details for immersion
      const sensory = currentLocation.visible?.sensory;
      if (sensory) {
        xmlPrompt += `    <sensory_details>\n`;
        if (sensory.smell) {
          xmlPrompt += `      <smell>${sensory.smell}</smell>\n`;
        }
        if (sensory.sound) {
          xmlPrompt += `      <sound>${sensory.sound}</sound>\n`;
        }
        if (sensory.lighting) {
          xmlPrompt += `      <lighting>${sensory.lighting}</lighting>\n`;
        }
        if (sensory.temperature) {
          xmlPrompt += `      <temperature>${sensory.temperature}</temperature>\n`;
        }
        xmlPrompt += `    </sensory_details>\n`;
      }

      // Known Features - visual landmarks and points of interest
      const knownFeatures = currentLocation.visible?.knownFeatures;
      if (knownFeatures && knownFeatures.length > 0) {
        xmlPrompt += `    <notable_features>\n`;
        knownFeatures.forEach((feature: string) => {
          xmlPrompt += `      <feature>${feature}</feature>\n`;
        });
        xmlPrompt += `    </notable_features>\n`;
      }

      // Interactable Objects - props and elements in the scene
      const interactables = currentLocation.visible?.interactables;
      if (interactables && interactables.length > 0) {
        xmlPrompt += `    <interactables>\n`;
        interactables.forEach((item: string) => {
          xmlPrompt += `      <object>${item}</object>\n`;
        });
        xmlPrompt += `    </interactables>\n`;
      }

      // Resources - environmental resources visible in the scene
      const resources = currentLocation.visible?.resources;
      if (resources && resources.length > 0) {
        xmlPrompt += `    <visible_resources>\n`;
        resources.forEach((resource: string) => {
          xmlPrompt += `      <resource>${resource}</resource>\n`;
        });
        xmlPrompt += `    </visible_resources>\n`;
      }

      // Writer's notes for consistency
      if (currentLocation.notes) {
        xmlPrompt += `    <writer_notes>${currentLocation.notes}</writer_notes>\n`;
      }
    } else {
      // Fallback to just the location name
      xmlPrompt += `    <location>${currentLocationName} (Unknown Environment)</location>\n`;
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
      xmlPrompt += `    <atmosphere>${moodDetails[mood] || mood}</atmosphere>\n`;
    }
    xmlPrompt += `    <environmental_details>\n`;
    xmlPrompt += `      Detailed background elements, textural variety (stone, wood, metal, fabric), environmental storytelling through props and setting, atmospheric perspective with depth, foreground/midground/background separation\n`;
    xmlPrompt += `    </environmental_details>\n`;
    xmlPrompt += `  </environment>\n`;
  }

  // Protagonist Details (Enhanced)
  if (character) {
    xmlPrompt += `  <protagonist>\n`;
    xmlPrompt += `    <identity>\n`;
    xmlPrompt += `      <name>${character.name || "Unknown"}</name>\n`;
    xmlPrompt += `      <race>${character.race || "Human"}</race>\n`;
    xmlPrompt += `      <profession>${character.profession || "Adventurer"}</profession>\n`;
    xmlPrompt += `    </identity>\n`;
    xmlPrompt += `    <physical_description>\n`;
    xmlPrompt += `      ${character.appearance || "A figure defined by their presence and gear"}\n`;
    xmlPrompt += `    </physical_description>\n`;
    xmlPrompt += `    <current_state>\n`;
    xmlPrompt += `      <status>${character.status || "Normal"}</status>\n`;
    xmlPrompt += `      <emotional_state>Convey emotion through body language, facial expression, and posture</emotional_state>\n`;
    xmlPrompt += `    </current_state>\n`;
    xmlPrompt += `    <visual_priority>\n`;
    xmlPrompt += `      Main focus of composition, positioned using rule of thirds, detailed facial features and expressions, realistic anatomy and proportions, high detail on clothing/armor/equipment, skin texture and imperfections visible, dynamic pose suggesting action or emotion\n`;
    xmlPrompt += `    </visual_priority>\n`;
    xmlPrompt += `  </protagonist>\n`;
  }

  // NPCs mentioned in the AI's prompt - enriched with game state appearance data
  // This replaces the old automatic NPC detection based on location
  if (mentionedNPCs.length > 0) {
    xmlPrompt += `  <npcs_in_scene>\n`;
    xmlPrompt += `    <note>These NPCs were mentioned in the scene description. Use their appearance data to render them accurately.</note>\n`;
    mentionedNPCs.slice(0, 4).forEach((npc, index) => {
      xmlPrompt += `    <npc priority="${index === 0 ? "high" : "medium"}">\n`;
      xmlPrompt += `      <name>${npc.name}</name>\n`;
      if (npc.description) {
        xmlPrompt += `      <description>${npc.description}</description>\n`;
      }
      if (npc.appearance) {
        xmlPrompt += `      <appearance>${npc.appearance}</appearance>\n`;
      }
      if (npc.status) {
        xmlPrompt += `      <status>${npc.status}</status>\n`;
      }
      xmlPrompt += `      <rendering>Position relative to protagonist as described in scene, body language and expression matching narrative context, physical details consistent with appearance data</rendering>\n`;
      xmlPrompt += `    </npc>\n`;
    });
    xmlPrompt += `  </npcs_in_scene>\n`;
  }

  xmlPrompt += `</visual_context>\n`;

  // === SCENE COMPOSITION DIRECTIVES ===
  xmlPrompt += `\n<composition_directives>\n`;
  xmlPrompt += `  <camera>\n`;
  xmlPrompt += `    <angle>Third-person cinematic angle, dynamic perspective, appropriate depth of field with bokeh on background</angle>\n`;
  xmlPrompt += `    <framing>Rule of thirds composition, balanced negative space, leading lines drawing eye to subject, frame within frame if applicable</framing>\n`;
  xmlPrompt += `    <focus>Sharp focus on main subject (protagonist), soft focus on background for depth, selective focus emphasizing emotion or action</focus>\n`;
  xmlPrompt += `  </camera>\n`;
  xmlPrompt += `  <visual_elements>\n`;
  xmlPrompt += `    <texture_details>\n`;
  xmlPrompt += `      High fidelity surface details: visible skin pores, fabric weave patterns, metal scratches and patina, wood grain, leather creases, realistic material properties (roughness, metallicity, specular)\n`;
  xmlPrompt += `    </texture_details>\n`;
  xmlPrompt += `    <lighting_and_reflections>\n`;
  xmlPrompt += `      Cinematic lighting setup, volumetric fog/lighting, screen space reflections, specular highlights on wet or shiny surfaces, caustics for water/glass, rim lighting to separate subjects from background, high dynamic range (HDR)\n`;
  xmlPrompt += `    </lighting_and_reflections>\n`;
  xmlPrompt += `    <color_grading>Cinematic color grading appropriate to mood and theme, color contrast for visual interest, color harmony, saturated where appropriate, desaturated for mood where needed</color_grading>\n`;
  xmlPrompt += `    <details>Environmental particles (dust, mist, magic, snow, rain), atmospheric effects, motion blur on moving elements, depth haze, realistic shadows with soft penumbra</details>\n`;
  xmlPrompt += `  </visual_elements>\n`;
  xmlPrompt += `</composition_directives>\n`;

  // === RENDERING INSTRUCTIONS ===
  xmlPrompt += `\n<rendering_instructions>\n`;
  xmlPrompt += `  <character_rendering>\n`;
  xmlPrompt += `    Realistic human anatomy and proportions, detailed facial features with micro-expressions, skin with visible texture (pores, imperfections, subsurface scattering), realistic hair with individual strands visible, believable clothing physics and draping, armor/equipment with wear and weathering, sweat or moisture where contextually appropriate\n`;
  xmlPrompt += `  </character_rendering>\n`;
  xmlPrompt += `  <realism_level>\n`;
  xmlPrompt += `    Photorealistic rendering quality, physically based materials (PBR), accurate light behavior (ray tracing), realistic shadows and reflections, proper perspective and foreshortening, anatomically correct poses, believable weight and mass\n`;
  xmlPrompt += `  </realism_level>\n`;
  xmlPrompt += `  <artistic_direction>\n`;
  xmlPrompt += `    Capture emotional intensity through visual storytelling, emphasize tension or intimacy through composition and framing, use lighting to guide viewer attention, create atmosphere that supports narrative, don't shy away from depicting scene's true nature (beauty, violence, intimacy, horror as contextually appropriate), aesthetic appeal and visual impact prioritized\n`;
  xmlPrompt += `  </artistic_direction>\n`;
  xmlPrompt += `</rendering_instructions>\n`;

  // === CORE SCENE DESCRIPTION (from AI) ===
  xmlPrompt += `\n<scene_description>\n`;
  xmlPrompt += `  ${prompt}\n`;
  xmlPrompt += `</scene_description>\n`;

  // === TECHNICAL SPECIFICATIONS ===
  xmlPrompt += `\n<technical_specs>\n`;
  xmlPrompt += `  masterpiece, best quality, 8k uhd, ultra detailed, highly detailed, professional photography, award winning composition, sharp focus, crystal clear, photorealistic, ray tracing, path tracing, lumen reflections, global illumination, subsurface scattering, ambient occlusion, physically based rendering, depth of field, bokeh, cinematic color grading, film grain (subtle), lens flare (if appropriate), chromatic aberration (minimal), vignette (subtle), ISO 100, f/1.8, high shutter speed\n`;
  xmlPrompt += `</technical_specs>`;

  // === CUSTOM IMAGE STYLE RULES ===
  const customImageRules = formatImageStyleRules(gameState.customRules);
  if (customImageRules) {
    xmlPrompt += `\n<custom_style_requirements>\n${customImageRules}\n</custom_style_requirements>`;
  }

  return styleBlock + xmlPrompt;
};

/**
 * Create a standardized ImageGenerationContext from GameState and Snapshot
 * @deprecated 推荐直接使用 getSceneImagePrompt(prompt, gameState, snapshot)，它已经内部提取上下文
 *
 * 注意：此函数不再自动检测活跃 NPC。AI 在生成 imagePrompt 时已经决定了哪些角色应该出现在画面中。
 * activeNPCs 字段始终返回空数组。
 */
export const createImageGenerationContext = (
  gameState: GameState,
  snapshot?: GameStateSnapshot,
): ImageGenerationContext => {
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

  // Resolve location details (case-insensitive)
  const currentLoc = stateSnapshot.locations?.find(
    (l: GameLocation) =>
      l.name?.toLowerCase() === stateSnapshot.currentLocation?.toLowerCase(),
  );
  const locationStr = currentLoc
    ? `${currentLoc.name} (${currentLoc.visible?.environment || "Unknown"}) - ${currentLoc.visible?.description || ""}`
    : `${stateSnapshot.currentLocation} (Unknown Environment)`;

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
    location: locationStr,
    character: {
      name: stateSnapshot.character?.name || "Unknown",
      race: stateSnapshot.character?.race || "Unknown",
      profession: stateSnapshot.character?.profession || "",
      appearance: stateSnapshot.character?.appearance || "Not described",
      status: stateSnapshot.character?.status || "Normal",
    },
    // AI 在 imagePrompt 中已决定哪些角色出现在场景中，不再自动检测 NPC
    activeNPCs: [],
    weather,
    season: "Unknown",
    mood,
  };
};
