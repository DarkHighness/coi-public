const fs = require("fs");
const path = require("path");
const ts = require("typescript");

const zhPath = path.join(__dirname, "../utils/translations/themes/zh.ts");
const enPath = path.join(__dirname, "../utils/translations/themes/en.ts");
const zhSettingsPath = path.join(__dirname, "worldSettings_zh.json");
const enSettingsPath = path.join(__dirname, "worldSettings_en.json");

function loadThemes(filePath) {
  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    return null;
  }
  const source = fs.readFileSync(filePath, "utf8");
  // Transpile TS to JS
  const result = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  });

  // Execute the JS to get the object
  const context = { exports: {} };
  try {
    // We wrap in a function to provide a scoped 'exports' object
    const run = new Function("exports", result.outputText);
    run(context.exports);
    return context.exports.themes;
  } catch (e) {
    console.error(`Error parsing ${filePath}:`, e);
    return null;
  }
}

function saveThemes(filePath, themesObj) {
  const interfaceDef = `export const themes: Record<
  string,
  {
    name: string;
    narrativeStyle: string;
    backgroundTemplate: string;
    example: string;
    worldSetting: string;
  }
> = `;

  // Generate the object string
  const jsonString = JSON.stringify(themesObj, null, 2);

  // Combine
  const content = `${interfaceDef}${jsonString};\n`;

  fs.writeFileSync(filePath, content, "utf8");
  console.log(`Successfully updated ${filePath}`);
}

function updateFile(filePath, settingsPath) {
  console.log(`Processing ${filePath}...`);

  const themes = loadThemes(filePath);
  if (!themes) return;

  if (!fs.existsSync(settingsPath)) {
    console.error(`Settings file not found: ${settingsPath}`);
    return;
  }

  const settings = JSON.parse(fs.readFileSync(settingsPath, "utf8"));

  // Merge settings
  let updatedCount = 0;
  for (const [key, worldSetting] of Object.entries(settings)) {
    if (themes[key]) {
      themes[key].worldSetting = worldSetting;
      updatedCount++;
    } else {
      console.warn(`Theme '${key}' found in settings but not in ${filePath}`);
    }
  }

  console.log(`Updated ${updatedCount} themes.`);
  saveThemes(filePath, themes);
}

// Run updates
updateFile(zhPath, zhSettingsPath);
updateFile(enPath, enSettingsPath);
