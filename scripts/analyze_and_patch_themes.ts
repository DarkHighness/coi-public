import * as fs from "fs";
import * as path from "path";

// Simplified types for the script since we don't import them
interface SimplifiedThemeConfig {
  categories?: string[];
  envTheme: string;
  restricted?: boolean;
}

interface ThemeParams {
  physicsHarshness: "low" | "medium" | "high";
  worldIndifference: "low" | "medium" | "high";
  npcAutonomyLevel: "low" | "medium" | "high";
  socialComplexity: "low" | "medium" | "high";
  economicComplexity: "low" | "medium" | "high";
}

// Logic to determine params (Same as before)
function getThemeParams(
  key: string,
  config: SimplifiedThemeConfig,
): ThemeParams {
  const categories = config.categories || [];
  const env = config.envTheme;
  const isRestricted = config.restricted || false;

  let physics: "low" | "medium" | "high" = "medium";
  let indifference: "low" | "medium" | "high" = "medium";
  let social: "low" | "medium" | "high" = "medium";
  let economic: "low" | "medium" | "high" = "medium";
  let autonomy: "low" | "medium" | "high" = "medium";

  // --- Physics Harshness ---
  if (
    categories.includes("fantasy") ||
    categories.includes("wuxia") ||
    categories.includes("game") ||
    categories.includes("scifi") ||
    categories.includes("cultivation") ||
    env === "wuxia" ||
    env === "demonic" ||
    env === "ethereal" ||
    env === "fantasy"
  ) {
    physics = "low";
  }
  if (
    (categories.includes("modern") &&
      !categories.includes("fantasy") &&
      !categories.includes("scifi")) ||
    (categories.includes("historical") && !categories.includes("fantasy")) ||
    categories.includes("war") ||
    categories.includes("survival") ||
    env === "war" ||
    env === "wasteland"
  ) {
    physics = "high";
  }

  // --- World Indifference ---
  if (
    categories.includes("romance") ||
    categories.includes("slice_of_life") ||
    key.includes("sweet") ||
    key.includes("baby") ||
    env === "rose" ||
    env === "nature" ||
    env === "romance"
  ) {
    indifference = "low";
  }
  if (
    categories.includes("horror") ||
    categories.includes("suspense") ||
    categories.includes("war") ||
    categories.includes("intrigue") ||
    categories.includes("demonic") ||
    categories.includes("survival") ||
    env === "horror" ||
    env === "wasteland" ||
    env === "demonic" ||
    env === "intrigue" ||
    env === "cold"
  ) {
    indifference = "high";
  }

  // --- Social Complexity ---
  if (
    categories.includes("intrigue") ||
    categories.includes("court") ||
    categories.includes("royal") ||
    categories.includes("business") ||
    key.includes("ceo") ||
    key.includes("rich") ||
    key.includes("family") ||
    env === "royal" ||
    env === "intrigue" ||
    env === "gold"
  ) {
    social = "high";
  }
  if (
    categories.includes("survival") ||
    categories.includes("action") ||
    env === "wasteland"
  ) {
    social = "low";
  }

  // --- Economic Complexity ---
  if (
    categories.includes("modern") ||
    categories.includes("business") ||
    env === "gold" ||
    env === "city" ||
    env === "cyberpunk"
  ) {
    economic = "high";
  }
  if (
    categories.includes("primitive") ||
    (categories.includes("ancient") && !categories.includes("royal")) ||
    env === "nature" ||
    env === "wasteland"
  ) {
    economic = "low";
  }
  // Ancient generic is usually medium economic

  // --- NPC Autonomy ---
  if (
    categories.includes("intrigue") ||
    categories.includes("war") ||
    categories.includes("horror") ||
    social === "high" ||
    indifference === "high"
  ) {
    autonomy = "high";
  }
  if (categories.includes("romance") && indifference === "low") {
    autonomy = "low";
  }

  return {
    physicsHarshness: physics,
    worldIndifference: indifference,
    socialComplexity: social,
    economicComplexity: economic,
    npcAutonomyLevel: autonomy, // Standardize naming
  };
}

async function run() {
  const themesPath = path.resolve(
    process.cwd(),
    "src/utils/constants/themes.ts",
  );
  console.log(`Reading themes from: ${themesPath}`);

  let fileContent = fs.readFileSync(themesPath, "utf-8");

  // Prepare content for eval
  // WARNING: This is a hack to evaluate TS file as JS
  // It removes imports, exports, and type annotations
  let evalCode = fileContent
    .replace(/import .*?;/g, "") // Remove imports
    .replace(/export type .*?;/g, "") // Remove type aliases
    .replace(/export const/g, "const") // Remove export keywords
    .replace(/: Record<.*?>/g, "") // Remove Record type annotation
    .replace(/as const/g, ""); // Remove as const assertion

  // Create a minimal context for eval if needed, but simple eval might work if no other deps.
  // THEMES depends on CATEGORY_KEYS likely nearby.

  let THEMES: Record<string, SimplifiedThemeConfig>;
  try {
    // Wrap in function to avoid strict mode issues or variable collisions if any
    const getThemes = new Function(evalCode + "\nreturn THEMES;");
    THEMES = getThemes();
    console.log(
      `Successfully evaluated THEMES. Found ${Object.keys(THEMES).length} keys.`,
    );
  } catch (e) {
    console.error("Failed to eval THEMES object:", e);
    // Print a snippet of evalCode to debug
    // console.log("Eval Code Snippet:", evalCode.slice(0, 500));
    return;
  }

  let modifications = 0;

  // Iterate
  for (const [key, config] of Object.entries(THEMES)) {
    // Locate the key in the original fileContent
    // Pattern: start of line, whitespace, key, colon, whitespace, brace
    // e.g. "  wuxia: {"
    const keyPattern = new RegExp(`^\\s+${key}: \\{`, "m");
    const match = fileContent.match(keyPattern);

    if (!match) {
      // Try quoted key
      const quotePattern = new RegExp(`^\\s+["']${key}["']: \\{`, "m");
      const quoteMatch = fileContent.match(quotePattern);
      if (!quoteMatch) {
        console.warn(`Skipping ${key}: not found in source text.`);
        continue;
      }
    }

    // Check for existing themeParams using a simple string check in the next few lines
    const startIdx = match!.index!;
    const endIdxMatch = fileContent.indexOf("},", startIdx); // End of this theme block
    if (endIdxMatch === -1) continue;

    const blockContent = fileContent.slice(startIdx, endIdxMatch);
    if (blockContent.includes("themeParams:")) {
      // console.log(`Skipping ${key}: already has themeParams.`);
      continue;
    }

    // Generate params
    const params = getThemeParams(key, config);
    // Indentation: usually 4 spaces for properties
    const insertStr = `\n    themeParams: {\n      physicsHarshness: "${params.physicsHarshness}",\n      worldIndifference: "${params.worldIndifference}",\n      npcAutonomyLevel: "${params.npcAutonomyLevel}",\n      socialComplexity: "${params.socialComplexity}",\n      economicComplexity: "${params.economicComplexity}",\n    },`;

    // Insert after opening brace
    const bracePos = startIdx + match![0].length - 1; // Position of '{'
    // Actually match[0] is "  key: {", so length-1 is char before '{'? No.
    // "  key: {" length is say 8. Index 0..7. last char is '{'.
    // We want to insert AFTER '{'.

    // Insert position:
    const insertAt = startIdx + match![0].length;

    // Modify fileContent.
    // Since we are modifying a string we are iterating over, indices will shift.
    // We must force re-match every time or apply updates in memory first.
    // Re-matching is safest.

    // WAIT: `match` index is based on `fileContent`. If we modify `fileContent`, we must loop again or track offset.
    // BUT we are inside a loop over `THEMES` entries.
    // Simplest approach: Apply modification, then continue loop.
    // Since keys are unique and we search by key, finding the key again in modified content works.

    // Re-find the match in current fileContent to be safe about indices
    const currentMatch = fileContent.match(keyPattern);
    if (!currentMatch) continue; // Should be there

    const safeInsertAt = currentMatch.index! + currentMatch[0].length;

    fileContent =
      fileContent.slice(0, safeInsertAt) +
      insertStr +
      fileContent.slice(safeInsertAt);
    modifications++;
  }

  console.log(`Updated ${modifications} themes.`);
  fs.writeFileSync(themesPath, fileContent, "utf-8");
}

run().catch(console.error);
