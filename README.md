<div align="center">
<img width="1200" height="475" alt="Banner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />

# Chronicles of Infinity

**An Infinite AI-Powered Choose-Your-Own-Adventure Game (AI DND)**

[English](README.md) | [中文](README_CN.md)

</div>

## 📖 Introduction

**Chronicles of Infinity** is a next-generation interactive fiction engine powered by advanced LLMs (Large Language Models). It acts as an intelligent Game Master, generating unique, coherent, and immersive stories that adapt dynamically to your every choice.

Unlike traditional text adventures with pre-written paths, Chronicles of Infinity offers true freedom. The world evolves, characters remember your actions, and the narrative arc bends to your will—or your failures.

## ✨ Key Features

-   **♾️ Infinite Storytelling**: No two playthroughs are the same. The AI generates unique plots, twists, and endings based on your decisions.
-   **🌍 Dynamic World Generation**: Explore diverse genres including Fantasy, Sci-Fi, Cyberpunk, Horror, Wuxia, and more. The world is built on the fly with consistent lore and rules.
-   **🧠 Deep RPG Systems**:
    -   **Character Tracking**: Race, class, appearance, and status effects (injuries, mental state).
    -   **Inventory & Economy**: Find, buy, and use items that impact the story.
    -   **Relationships**: NPCs remember your interactions. Build friendships, rivalries, or romance.
    -   **Quest System**: Track Main Quests, Side Quests, and hidden mysteries.
    -   **Knowledge System**: Accumulate lore about the world, history, and magic/tech systems.
-   **🎨 Visual Immersion**:
    -   **AI Image Generation**: Automatically generates visuals for new locations (Bird's Eye View) and dramatic moments (Player Perspective).
    -   **Cinematic Descriptions**: High-quality, sensory-rich narrative descriptions.
-   **⚙️ Advanced State Management**: The game tracks time, weather, and causal consequences of your actions (e.g., if you break a door, it stays broken).

## 🛠️ Tech Stack

-   **Frontend**: [React 19](https://react.dev/), [Vite](https://vitejs.dev/)
-   **Styling**: [TailwindCSS v4](https://tailwindcss.com/)
-   **AI Integration**:
    -   [Google Gemini](https://deepmind.google/technologies/gemini/) (via `@google/genai`)
    -   OpenAI / OpenRouter (via `openai` SDK)
-   **Internationalization**: [i18next](https://www.i18next.com/)
-   **Language**: TypeScript

## 🚀 Getting Started

### Prerequisites

-   **Node.js** (Latest LTS recommended)
-   **npm** or **pnpm** or **yarn**
-   API Keys for **Google Gemini** or **OpenAI/OpenRouter**

### Installation

1.  **Clone the repository**
    ```bash
    git clone https://github.com/yourusername/chronicles-of-infinity.git
    cd chronicles-of-infinity
    ```

2.  **Install dependencies**
    ```bash
    npm install
    ```

3.  **Configure Environment Variables**
    Create a `.env.local` file in the root directory and add your API keys:

    ```env
    # Example configuration
    VITE_GEMINI_API_KEY=your_gemini_api_key_here
    # or
    VITE_OPENAI_API_KEY=your_openai_api_key_here
    ```

4.  **Run the Development Server**
    ```bash
    npm run dev
    ```

5.  **Open in Browser**
    Visit `http://localhost:5173` to start your adventure.

## 🚀 Deployment

This project is configured to support both **GitHub Pages** and **Cloudflare Pages**.

### GitHub Pages
1.  Push your changes to the `main` branch.
2.  A GitHub Action will automatically build and deploy the site to `https://<your-username>.github.io/coi/`.
3.  Ensure "GitHub Actions" is selected as the source in your repository's Pages settings.

### Cloudflare Pages
1.  Connect your GitHub repository to Cloudflare Pages.
2.  Use the default build settings (`npm run build`).
3.  The site will be deployed to your Cloudflare Pages URL (e.g., `https://<project-name>.pages.dev/`).

## 🎮 How to Play

1.  **Select a Theme**: Choose a genre (e.g., Fantasy, Cyberpunk).
2.  **Create Your Character**: The AI will generate a character based on the theme, or you can customize it.
3.  **Make Choices**: Read the narrative and select from available actions, or type your own custom action.
4.  **Survive & Thrive**: Manage your health, inventory, and relationships as you navigate the story.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License.
