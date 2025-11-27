#!/usr/bin/env npx ts-node
/**
 * Interactive Script to Add a New Story Theme
 *
 * This script helps you add a new story theme to the application by:
 * 1. Prompting for theme configuration
 * 2. Updating themes.ts
 * 3. Creating translation entries for both English and Chinese
 *
 * Usage:
 *   npx ts-node scripts/addStoryTheme.ts
 *
 * Prerequisites:
 *   - Node.js 18+
 *   - pnpm install (to have dependencies ready)
 */

import * as fs from "fs";
import * as path from "path";
import * as readline from "readline";

// ============================================================================
// Configuration Constants
// ============================================================================

const ENV_THEME_OPTIONS = [
  "fantasy",
  "scifi",
  "cyberpunk",
  "horror",
  "mystery",
  "romance",
  "royal",
  "wuxia",
  "demonic",
  "ethereal",
  "modern",
  "gold",
  "villain",
  "sepia",
  "rose",
  "war",
  "sunset",
  "cold",
  "violet",
  "nature",
  "artdeco",
  "intrigue",
  "wasteland",
  "patriotic",
  "cyan",
  "silver",
  "obsessive",
  "emerald",
  "danger",
  "glamour",
  "rgb",
  "stone",
  "heartbreak",
  "interstellar",
  "gothic",
  "academy",
  "apocalypse",
] as const;

const AMBIENCE_OPTIONS = [
  "quiet",
  "forest",
  "rain",
  "storm",
  "ocean",
  "city",
  "tavern",
  "combat",
  "horror",
  "mystical",
  "scifi",
  "desert",
  "snow",
  "cave",
  "market",
  "night",
] as const;

const CATEGORY_OPTIONS = [
  "ancient",
  "modern",
  "fantasy",
  "suspense",
  "wuxia",
  "scifi",
  "game",
  "novel",
  "movie",
] as const;

// File paths
const THEMES_FILE = path.resolve(__dirname, "../utils/constants/themes.ts");
const EN_THEMES_FILE = path.resolve(__dirname, "../src/locales/en/themes.json");
const ZH_THEMES_FILE = path.resolve(__dirname, "../src/locales/zh/themes.json");

// ============================================================================
// Types
// ============================================================================

interface ThemeConfig {
  key: string;
  envTheme: string;
  defaultAtmosphere: string;
  icon: string;
  categories: string[];
  restricted: boolean;
}

interface ThemeTranslation {
  name: string;
  narrativeStyle: string;
  backgroundTemplate: string;
  example: string;
  worldSetting: string;
}

// ============================================================================
// Utility Functions
// ============================================================================

function createReadlineInterface(): readline.Interface {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
}

async function prompt(
  rl: readline.Interface,
  question: string
): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim());
    });
  });
}

async function promptWithDefault(
  rl: readline.Interface,
  question: string,
  defaultValue: string
): Promise<string> {
  const answer = await prompt(rl, `${question} [${defaultValue}]: `);
  return answer || defaultValue;
}

async function promptWithOptions(
  rl: readline.Interface,
  question: string,
  options: readonly string[]
): Promise<string> {
  console.log(`\n${question}`);
  console.log("Available options:");
  options.forEach((opt, i) => console.log(`  ${i + 1}. ${opt}`));

  while (true) {
    const answer = await prompt(rl, "Enter option number or name: ");

    // Check if it's a number
    const num = parseInt(answer, 10);
    if (!isNaN(num) && num >= 1 && num <= options.length) {
      return options[num - 1];
    }

    // Check if it's a valid option name
    if (options.includes(answer as (typeof options)[number])) {
      return answer;
    }

    console.log("Invalid option. Please try again.");
  }
}

async function promptMultipleOptions(
  rl: readline.Interface,
  question: string,
  options: readonly string[]
): Promise<string[]> {
  console.log(`\n${question}`);
  console.log("Available options:");
  options.forEach((opt, i) => console.log(`  ${i + 1}. ${opt}`));

  const answer = await prompt(
    rl,
    "Enter option numbers or names (comma-separated): "
  );
  const parts = answer.split(",").map((p) => p.trim());

  const result: string[] = [];
  for (const part of parts) {
    const num = parseInt(part, 10);
    if (!isNaN(num) && num >= 1 && num <= options.length) {
      result.push(options[num - 1]);
    } else if (options.includes(part as (typeof options)[number])) {
      result.push(part);
    } else {
      console.log(`Warning: Ignoring invalid option "${part}"`);
    }
  }

  if (result.length === 0) {
    console.log('No valid categories selected. Using "fantasy" as default.');
    return ["fantasy"];
  }

  return result;
}

async function promptYesNo(
  rl: readline.Interface,
  question: string,
  defaultValue = false
): Promise<boolean> {
  const defaultStr = defaultValue ? "Y/n" : "y/N";
  const answer = await prompt(rl, `${question} [${defaultStr}]: `);

  if (answer === "") return defaultValue;
  return answer.toLowerCase().startsWith("y");
}

async function promptMultiline(
  rl: readline.Interface,
  question: string
): Promise<string> {
  console.log(`\n${question}`);
  console.log('(Enter your text. Type "END" on a new line to finish)');

  const lines: string[] = [];
  while (true) {
    const line = await prompt(rl, "");
    if (line === "END") break;
    lines.push(line);
  }

  return lines.join("\n");
}

// ============================================================================
// File Operations
// ============================================================================

function checkThemeExists(themeKey: string): boolean {
  const content = fs.readFileSync(THEMES_FILE, "utf-8");
  const regex = new RegExp(`^\\s*${themeKey}:\\s*{`, "m");
  return regex.test(content);
}

function updateThemesFile(config: ThemeConfig): void {
  let content = fs.readFileSync(THEMES_FILE, "utf-8");

  // Find the closing of THEMES object (last };)
  const lastBraceIndex = content.lastIndexOf("};");
  if (lastBraceIndex === -1) {
    throw new Error("Could not find THEMES object closing brace");
  }

  // Build the new theme entry
  const categoriesStr = config.categories.map((c) => `"${c}"`).join(", ");
  const restrictedStr = config.restricted ? ",\n    restricted: true" : "";

  const newThemeEntry = `  ${config.key}: {
    envTheme: "${config.envTheme}",
    defaultAtmosphere: "${config.defaultAtmosphere}",
    icon: "${config.icon}",
    categories: [${categoriesStr}]${restrictedStr},
  },
`;

  // Insert before the closing brace
  content =
    content.slice(0, lastBraceIndex) + newThemeEntry + content.slice(lastBraceIndex);

  fs.writeFileSync(THEMES_FILE, content);
  console.log(`✅ Updated ${THEMES_FILE}`);
}

function updateTranslationFile(
  filePath: string,
  themeKey: string,
  translation: ThemeTranslation
): void {
  const content = fs.readFileSync(filePath, "utf-8");
  const json = JSON.parse(content);

  json[themeKey] = translation;

  // Write with proper formatting
  fs.writeFileSync(filePath, JSON.stringify(json, null, 2) + "\n");
  console.log(`✅ Updated ${filePath}`);
}

// ============================================================================
// Main Script
// ============================================================================

async function main(): Promise<void> {
  console.log("╔════════════════════════════════════════════════════════════╗");
  console.log("║          COI Story Theme Generator                         ║");
  console.log("║                                                            ║");
  console.log("║  This script will help you add a new story theme to the    ║");
  console.log("║  application. It will update themes.ts and both English    ║");
  console.log("║  and Chinese translation files.                            ║");
  console.log("╚════════════════════════════════════════════════════════════╝");
  console.log("");

  const rl = createReadlineInterface();

  try {
    // ========================================================================
    // Step 1: Basic Theme Configuration
    // ========================================================================
    console.log("\n📋 STEP 1: Basic Theme Configuration\n");

    // Theme key
    let themeKey: string;
    while (true) {
      themeKey = await prompt(
        rl,
        "Enter theme key (snake_case, e.g., harry_potter): "
      );
      if (!themeKey) {
        console.log("Theme key is required.");
        continue;
      }
      if (!/^[a-z][a-z0-9_]*$/.test(themeKey)) {
        console.log(
          "Theme key must be snake_case (lowercase letters, numbers, underscores)."
        );
        continue;
      }
      if (checkThemeExists(themeKey)) {
        console.log(`Theme "${themeKey}" already exists. Choose a different key.`);
        continue;
      }
      break;
    }

    // Icon
    const icon = await prompt(rl, "Enter theme icon (emoji, e.g., 🐉): ");
    if (!icon) {
      console.log("Warning: No icon provided. Using 📚 as default.");
    }

    // EnvTheme
    const envTheme = await promptWithOptions(
      rl,
      "Select visual theme (envTheme):",
      ENV_THEME_OPTIONS
    );

    // Default atmosphere
    const defaultAtmosphere = await promptWithOptions(
      rl,
      "Select default ambient sound:",
      AMBIENCE_OPTIONS
    );

    // Categories
    const categories = await promptMultipleOptions(
      rl,
      "Select categories:",
      CATEGORY_OPTIONS
    );

    // Restricted
    const restricted = await promptYesNo(
      rl,
      "Is this a licensed IP theme (game, movie, novel)?",
      false
    );

    const config: ThemeConfig = {
      key: themeKey,
      envTheme,
      defaultAtmosphere,
      icon: icon || "📚",
      categories,
      restricted,
    };

    console.log("\n✅ Theme configuration:");
    console.log(JSON.stringify(config, null, 2));

    // ========================================================================
    // Step 2: English Translation
    // ========================================================================
    console.log("\n📋 STEP 2: English Translation\n");

    const enName = await prompt(rl, "Enter English theme name: ");
    console.log(
      "\nEnter the narrative style description (writing guidelines for AI):"
    );
    const enNarrativeStyle = await promptMultiline(rl, "Narrative Style:");

    console.log(
      "\nEnter the background template (story setup with placeholders like [Location]):"
    );
    const enBackgroundTemplate = await promptMultiline(rl, "Background Template:");

    console.log("\nEnter an example paragraph demonstrating the writing style:");
    const enExample = await promptMultiline(rl, "Example:");

    console.log("\nEnter the world setting description:");
    const enWorldSetting = await promptMultiline(rl, "World Setting:");

    const enTranslation: ThemeTranslation = {
      name: enName,
      narrativeStyle: enNarrativeStyle,
      backgroundTemplate: enBackgroundTemplate,
      example: enExample,
      worldSetting: enWorldSetting,
    };

    // ========================================================================
    // Step 3: Chinese Translation
    // ========================================================================
    console.log("\n📋 STEP 3: Chinese Translation (中文翻译)\n");

    let zhName = await prompt(rl, "Enter Chinese theme name (中文名称): ");
    if (restricted && !zhName.startsWith("《")) {
      const wrapName = await promptYesNo(
        rl,
        "This is a licensed IP. Wrap name with《》?",
        true
      );
      if (wrapName) {
        zhName = `《${zhName}》`;
      }
    }

    console.log("\n输入叙事风格描述（AI写作指导）:");
    const zhNarrativeStyle = await promptMultiline(rl, "叙事风格:");

    console.log("\n输入背景模板（故事设定，可使用【地点】等占位符）:");
    const zhBackgroundTemplate = await promptMultiline(rl, "背景模板:");

    console.log("\n输入示例段落（展示写作风格）:");
    const zhExample = await promptMultiline(rl, "示例:");

    console.log("\n输入世界设定描述:");
    const zhWorldSetting = await promptMultiline(rl, "世界设定:");

    const zhTranslation: ThemeTranslation = {
      name: zhName,
      narrativeStyle: zhNarrativeStyle,
      backgroundTemplate: zhBackgroundTemplate,
      example: zhExample,
      worldSetting: zhWorldSetting,
    };

    // ========================================================================
    // Step 4: Confirmation
    // ========================================================================
    console.log("\n📋 STEP 4: Confirmation\n");

    console.log("Theme Configuration:");
    console.log(JSON.stringify(config, null, 2));
    console.log("\nEnglish Translation:");
    console.log(`  Name: ${enTranslation.name}`);
    console.log(`  Narrative Style: ${enTranslation.narrativeStyle.substring(0, 100)}...`);
    console.log("\nChinese Translation:");
    console.log(`  Name: ${zhTranslation.name}`);
    console.log(`  Narrative Style: ${zhTranslation.narrativeStyle.substring(0, 100)}...`);

    const confirm = await promptYesNo(
      rl,
      "\nProceed with adding this theme?",
      true
    );

    if (!confirm) {
      console.log("Aborted.");
      rl.close();
      return;
    }

    // ========================================================================
    // Step 5: Apply Changes
    // ========================================================================
    console.log("\n📋 STEP 5: Applying Changes\n");

    updateThemesFile(config);
    updateTranslationFile(EN_THEMES_FILE, themeKey, enTranslation);
    updateTranslationFile(ZH_THEMES_FILE, themeKey, zhTranslation);

    console.log("\n🎉 Theme added successfully!");
    console.log(`\nYou can now select "${enName}" / "${zhName}" in the theme picker.`);
    console.log("\nDon't forget to:");
    console.log("  1. Run the app to verify the theme works correctly");
    console.log("  2. Commit your changes to git");

    rl.close();
  } catch (error) {
    console.error("\n❌ Error:", error);
    rl.close();
    process.exit(1);
  }
}

main();
