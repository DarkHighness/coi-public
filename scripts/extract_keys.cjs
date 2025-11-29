const fs = require("fs");
const path = require("path");

const themesPath = path.join(__dirname, "../src/locales/zh/themes.json");
const themes = require(themesPath);
const keys = Object.keys(themes);

fs.writeFileSync(
  path.join(__dirname, "../all_keys.json"),
  JSON.stringify(keys, null, 2),
);
console.log(`Extracted ${keys.length} keys to all_keys.json`);
