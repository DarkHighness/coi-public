const fs = require("fs");
const path = require("path");

// Paths
const themesTsPath = path.join(__dirname, "../src/utils/constants/themes.ts");
const themesJsonPath = path.join(__dirname, "../src/locales/zh/themes.json");

// Category Order (Priority)
const CATEGORY_PRIORITY = [
  "ancient",
  "modern",
  "fantasy",
  "wuxia",
  "scifi",
  "suspense",
  "game",
  "novel",
  "movie",
  "chinese_short_drama",
];

function getCategoryRank(category) {
  const index = CATEGORY_PRIORITY.indexOf(category);
  return index === -1 ? 999 : index;
}

// Main function
async function sortThemes() {
  try {
    // 1. Read files
    let themesTsContent = fs.readFileSync(themesTsPath, "utf8");
    const themesJsonContent = fs.readFileSync(themesJsonPath, "utf8");
    const themesJson = JSON.parse(themesJsonContent);

    // 2. Extract THEMES object from themes.ts
    const startMarker =
      "export const THEMES: Record<string, StoryThemeConfig> = {";
    const startIndex = themesTsContent.indexOf(startMarker);

    if (startIndex === -1) {
      throw new Error("Could not find THEMES object start");
    }

    const endIndex = themesTsContent.lastIndexOf("};");

    if (endIndex === -1) {
      throw new Error("Could not find THEMES object end");
    }

    const themesBody = themesTsContent.substring(
      startIndex + startMarker.length,
      endIndex,
    );

    // 3. Parse the themes body
    const themeEntries = [];
    let currentKey = null;
    let currentBlock = "";
    let braceCount = 0;
    let inBlock = false;

    const lines = themesBody.split("\n");

    for (const line of lines) {
      const trimmedLine = line.trim();

      if (!inBlock && (trimmedLine.startsWith("//") || trimmedLine === "")) {
        continue;
      }

      const keyMatch = line.match(/^\s*([a-zA-Z0-9_]+):\s*\{/);

      if (!inBlock && keyMatch) {
        currentKey = keyMatch[1];
        inBlock = true;
        currentBlock = line + "\n";
        braceCount = 1;
        continue;
      }

      if (inBlock) {
        currentBlock += line + "\n";
        const openBraces = (line.match(/\{/g) || []).length;
        const closeBraces = (line.match(/\}/g) || []).length;
        braceCount += openBraces - closeBraces;

        if (braceCount === 0) {
          // End of block

          // 3a. Extract and Reorder Categories
          const categoriesMatch = currentBlock.match(
            /categories:\s*\[([\s\S]*?)\]/,
          );
          let categories = [];
          if (categoriesMatch) {
            categories = categoriesMatch[1]
              .split(",")
              .map((c) => c.trim().replace(/['"]/g, ""));

            // Sort categories based on priority
            categories.sort((a, b) => getCategoryRank(a) - getCategoryRank(b));

            // Update the block with sorted categories
            const newCategoriesStr = `categories: [${categories.map((c) => `"${c}"`).join(", ")}]`;
            currentBlock = currentBlock.replace(
              /categories:\s*\[[\s\S]*?\]/,
              newCategoriesStr,
            );
          }

          const name = themesJson[currentKey]?.name || currentKey;
          const isIp = name.startsWith("《");

          // 3b. Update restricted property
          let newContent = currentBlock;
          const restrictedLine = "    restricted: true,\n";
          const hasRestricted = /restricted:\s*true/.test(newContent);

          if (isIp && !hasRestricted) {
            const lines = newContent.split("\n");
            let closingLineIndex = -1;
            for (let i = lines.length - 1; i >= 0; i--) {
              if (lines[i].trim().startsWith("}")) {
                closingLineIndex = i;
                break;
              }
            }

            if (closingLineIndex !== -1) {
              lines.splice(closingLineIndex, 0, "    restricted: true,");
              newContent = lines.join("\n");
            }
          } else if (!isIp && hasRestricted) {
            newContent = newContent.replace(
              /^\s*restricted:\s*true,?\s*$\n?/gm,
              "",
            );
          }

          themeEntries.push({
            key: currentKey,
            content: newContent,
            categories: categories,
            isIp: isIp,
          });

          inBlock = false;
          currentKey = null;
          currentBlock = "";
        }
      }
    }

    // 4. Sort the entries
    themeEntries.sort((a, b) => {
      // 1. Restricted Status: Non-IP (false) first
      if (a.isIp !== b.isIp) {
        return a.isIp ? 1 : -1;
      }

      // 2. Primary Category
      const catA = a.categories[0];
      const catB = b.categories[0];

      const rankA = getCategoryRank(catA);
      const rankB = getCategoryRank(catB);

      if (rankA !== rankB) {
        return rankA - rankB;
      }

      // 3. Chinese Name
      const nameA = themesJson[a.key]?.name || a.key;
      const nameB = themesJson[b.key]?.name || b.key;
      return nameA.localeCompare(nameB, "zh-CN");
    });

    // 5. Reconstruct the file content
    let newThemesBody = "\n";
    for (const entry of themeEntries) {
      newThemesBody += entry.content;
    }

    const newContent =
      themesTsContent.substring(0, startIndex + startMarker.length) +
      newThemesBody +
      themesTsContent.substring(endIndex);

    // 6. Write back
    fs.writeFileSync(themesTsPath, newContent);
    console.log(`Successfully reordered ${themeEntries.length} themes.`);
  } catch (error) {
    console.error("Error sorting themes:", error);
  }
}

sortThemes();
