const fs = require("fs");
const path = require("path");

const sourceFile = path.join(__dirname, "../src/locales/zh/themes.json");
const outputDir = path.join(__dirname, "../src/locales/zh/themes_batches_bak");

// Ensure output directory exists
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Read and parse source file
const themes = JSON.parse(fs.readFileSync(sourceFile, "utf8"));
const themeKeys = Object.keys(themes);
const batchSize = 20;

let batchIndex = 1;
for (let i = 0; i < themeKeys.length; i += batchSize) {
  const batchKeys = themeKeys.slice(i, i + batchSize);
  const batchData = {};

  batchKeys.forEach((key) => {
    batchData[key] = themes[key];
  });

  const outputFilePath = path.join(outputDir, `batch_${batchIndex}.json`);
  fs.writeFileSync(outputFilePath, JSON.stringify(batchData, null, 2), "utf8");
  console.log(`Created ${outputFilePath} with ${batchKeys.length} items.`);
  batchIndex++;
}

console.log("Done.");
