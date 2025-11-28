import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

/**
 * 提取故事主题 JSON 并转换为 Markdown 格式
 * 每行格式: 《故事主题》（英文名）
 */

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function extractThemesToMarkdown() {
  // 读取中文和英文主题文件
  const zhThemesPath = path.join(__dirname, "../src/locales/zh/themes.json");
  const enThemesPath = path.join(__dirname, "../src/locales/en/themes.json");

  const zhThemes = JSON.parse(fs.readFileSync(zhThemesPath, "utf-8"));
  const enThemes = JSON.parse(fs.readFileSync(enThemesPath, "utf-8"));

  // 生成 Markdown 内容
  let markdown = "# 故事主题列表 / Story Themes List\n\n";

  // 遍历所有主题
  Object.keys(zhThemes).forEach((themeKey) => {
    const zhName = zhThemes[themeKey].name;
    const enName = enThemes[themeKey]?.name || themeKey;

    if (!zhName.includes("《")) {
      return;
    }

    markdown += `[${themeKey}] ${zhName}（${enName}）\n`;
  });

  // 输出到文件
  const outputPath = path.join(__dirname, "../THEMES.md");
  fs.writeFileSync(outputPath, markdown, "utf-8");

  console.log(`✅ 主题列表已生成: ${outputPath}`);
  console.log(`📊 共提取 ${Object.keys(zhThemes).length} 个主题`);
}

// 执行脚本
extractThemesToMarkdown();
