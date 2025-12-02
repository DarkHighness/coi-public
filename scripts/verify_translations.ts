import fs from "fs";
import path from "path";

const enPath = path.resolve(
  "/Users/twiliness/Desktop/coi/src/locales/en/translation.json",
);
const zhPath = path.resolve(
  "/Users/twiliness/Desktop/coi/src/locales/zh/translation.json",
);

function verifyJson(filePath: string) {
  try {
    const content = fs.readFileSync(filePath, "utf8");
    JSON.parse(content);
    console.log(`✅ ${path.basename(filePath)} is valid JSON.`);
  } catch (error) {
    console.error(
      `❌ ${path.basename(filePath)} is INVALID JSON:`,
      error.message,
    );
    process.exit(1);
  }
}

verifyJson(enPath);
verifyJson(zhPath);
