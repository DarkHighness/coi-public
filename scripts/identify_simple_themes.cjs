const fs = require('fs');
const path = require('path');

const themesPath = path.join(__dirname, '../src/locales/zh/themes.json');
const themes = require(themesPath);
const simpleThemes = [];

for (const [key, value] of Object.entries(themes)) {
    // Check if narrativeStyle contains the structured tag '【'
    if (value.narrativeStyle && !value.narrativeStyle.includes('【')) {
        simpleThemes.push(key);
    }
}

fs.writeFileSync(path.join(__dirname, '../simple_themes.json'), JSON.stringify(simpleThemes, null, 2));
console.log(`Found ${simpleThemes.length} simple themes to expand.`);
