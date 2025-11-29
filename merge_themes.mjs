import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const themesPath = path.join(__dirname, 'src', 'locales', 'zh', 'themes.json');
const batchesDir = path.join(__dirname, 'src', 'locales', 'zh', 'themes_batches');
const mergedPath = path.join(__dirname, 'src', 'locales', 'zh', 'themes_merged.json');
const missingPath = path.join(__dirname, 'src', 'locales', 'zh', 'themes_missing.json');

// Read original themes
const themesContent = fs.readFileSync(themesPath, 'utf-8');
const themes = JSON.parse(themesContent);

// Read batches
const batchFiles = fs.readdirSync(batchesDir).filter(file => file.startsWith('batch_') && file.endsWith('.json'));
let mergedThemes = {};

console.log(`Found ${batchFiles.length} batch files.`);

for (const file of batchFiles) {
    const filePath = path.join(batchesDir, file);
    try {
        const content = fs.readFileSync(filePath, 'utf-8');
        const batch = JSON.parse(content);
        Object.assign(mergedThemes, batch);
        console.log(`Merged ${file} with ${Object.keys(batch).length} themes.`);
    } catch (error) {
        console.error(`Error reading or parsing ${file}:`, error);
    }
}

// Find missing themes
const missingThemes = {};
for (const key in themes) {
    if (!mergedThemes.hasOwnProperty(key)) {
        missingThemes[key] = themes[key];
    }
}

console.log(`Total merged themes: ${Object.keys(mergedThemes).length}`);
console.log(`Total missing themes: ${Object.keys(missingThemes).length}`);

// Write output files
fs.writeFileSync(mergedPath, JSON.stringify(mergedThemes, null, 2), 'utf-8');
console.log(`Wrote merged themes to ${mergedPath}`);

fs.writeFileSync(missingPath, JSON.stringify(missingThemes, null, 2), 'utf-8');
console.log(`Wrote missing themes to ${missingPath}`);
