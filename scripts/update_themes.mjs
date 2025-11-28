import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ZH_THEMES_PATH = path.join(__dirname, "../src/locales/zh/themes.json");
const BATCH_DIR = path.join(__dirname, "theme_batches");

async function updateThemes() {
  try {
    // Read existing themes
    const existingThemesRaw = fs.readFileSync(ZH_THEMES_PATH, "utf-8");
    // Remove potential markdown code blocks if present (legacy issue)
    const cleanExisting = existingThemesRaw.replace(/```json\n?|```/g, "");
    const themes = JSON.parse(cleanExisting);

    // Read all batch files
    const batchFiles = fs
      .readdirSync(BATCH_DIR)
      .filter((file) => file.endsWith("_zh.json"));

    console.log(`Found ${batchFiles.length} batch files.`);

    let updateCount = 0;

    for (const file of batchFiles) {
      const batchPath = path.join(BATCH_DIR, file);
      const batchContent = fs.readFileSync(batchPath, "utf-8");
      const batchThemes = JSON.parse(batchContent);

      for (const [key, value] of Object.entries(batchThemes)) {
        if (themes[key]) {
          console.log(`Updating theme: ${key}`);
          themes[key] = value;
          updateCount++;
        } else {
          console.log(`Adding new theme: ${key}`);
          themes[key] = value;
          updateCount++;
        }
      }
    }

    // Write back to file
    fs.writeFileSync(ZH_THEMES_PATH, JSON.stringify(themes, null, 2), "utf-8");
    console.log(
      `Successfully updated ${updateCount} themes in ${ZH_THEMES_PATH}`,
    );
  } catch (error) {
    console.error("Error updating themes:", error);
  }
}

updateThemes();
