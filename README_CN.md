<div align="center">
<img width="1200" height="475" alt="Banner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />

# Chronicles of Infinity (无限编年史)

**由 AI 驱动的无限流文字冒险游戏 (AI 酒馆)**

[English](README.md) | [中文](README_CN.md)

</div>

## 📖 简介

**Chronicles of Infinity** 是一个由先进的大语言模型（LLM）驱动的下一代互动小说引擎。它扮演着一位智能的“游戏主持人”（Game Master），能够根据你的每一个选择，动态生成独一无二、连贯且沉浸感十足的故事。

与传统的预设剧本文字冒险游戏不同，Chronicles of Infinity 提供真正的自由。世界会随你的行动而演变，角色会记住你的所作所为，故事的走向完全取决于你的意志——或是你的失败。

## ✨ 核心特性

-   **♾️ 无限叙事**: 没有两次完全相同的游戏体验。AI 会根据你的决策生成独特的剧情、转折和结局。
-   **🌍 动态世界生成**: 探索多种题材，包括奇幻、科幻、赛博朋克、恐怖、武侠等。世界观、设定和规则均由 AI 实时构建并保持一致性。
-   **🧠 深度 RPG 系统**:
    -   **角色追踪**: 种族、职业、外貌以及状态效果（受伤、精神状态等）。
    -   **物品与经济**: 发现、购买和使用物品，它们会对故事产生实际影响。
    -   **人际关系**: NPC 会记住与你的互动。建立友谊、敌对关系或浪漫情缘。
    -   **任务系统**: 追踪主线任务、支线任务以及隐藏的谜团。
    -   **知识系统**: 积累关于世界、历史、魔法或科技系统的知识。
-   **🎨 视觉沉浸**:
    -   **AI 图像生成**: 自动为新地点生成“上帝视角”全景图，为关键剧情生成“第一人称”场景图。
    -   **电影级描述**: 高质量、富含感官细节的叙事描写。
-   **⚙️ 高级状态管理**: 游戏会追踪时间、天气以及你行为的因果后果（例如：如果你打破了一扇门，它就会保持损坏状态）。

## 🛠️ 技术栈

-   **前端**: [React 19](https://react.dev/), [Vite](https://vitejs.dev/)
-   **样式**: [TailwindCSS v4](https://tailwindcss.com/)
-   **AI 集成**:
    -   [Google Gemini](https://deepmind.google/technologies/gemini/) (通过 `@google/genai`)
    -   OpenAI / OpenRouter (通过 `openai` SDK)
-   **国际化**: [i18next](https://www.i18next.com/)
-   **语言**: TypeScript

## 🚀 快速开始

### 前置要求

-   **Node.js** (推荐最新的 LTS 版本)
-   **npm** 或 **pnpm** 或 **yarn**
-   **Google Gemini** 或 **OpenAI/OpenRouter** 的 API Key

### 安装步骤

1.  **克隆仓库**
    ```bash
    git clone https://github.com/yourusername/chronicles-of-infinity.git
    cd chronicles-of-infinity
    ```

2.  **安装依赖**
    ```bash
    npm install
    ```

3.  **配置环境变量**
    在项目根目录创建一个 `.env.local` 文件，并添加你的 API Key：

    ```env
    # 配置示例
    VITE_GEMINI_API_KEY=your_gemini_api_key_here
    # 或者
    VITE_OPENAI_API_KEY=your_openai_api_key_here
    ```

4.  **启动开发服务器**
    ```bash
    npm run dev
    ```

5.  **开始游戏**
    在浏览器中访问 `http://localhost:5173` 即可开始你的冒险。

## 🚀 部署 (Deployment)

本项目已配置为同时支持 **GitHub Pages** 和 **Cloudflare Pages**。

### GitHub Pages
1.  将代码推送到 `main` 分支。
2.  GitHub Action 将自动构建并将站点部署到 `https://<your-username>.github.io/coi/`。
3.  请确保在仓库的 Pages 设置中选择 "GitHub Actions" 作为源。

### Cloudflare Pages
1.  将你的 GitHub 仓库连接到 Cloudflare Pages。
2.  使用默认构建设置 (`npm run build`)。
3.  站点将被部署到你的 Cloudflare Pages URL (例如 `https://<project-name>.pages.dev/`)。

## 🎮 玩法说明

1.  **选择题材**: 选择一个你喜欢的流派（如：奇幻、赛博朋克）。
2.  **创建角色**: AI 会根据题材生成角色，你也可以进行自定义。
3.  **做出选择**: 阅读剧情并从可用行动中选择，或者输入你自己的自定义行动。
4.  **生存与发展**: 在推进故事的过程中，管理好你的生命值、物品栏和人际关系。

## 🤝 贡献

欢迎提交 Pull Request 来改进这个项目！

## 📄 许可证

本项目采用 MIT 许可证。
