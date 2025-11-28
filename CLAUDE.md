# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Chronicles of Infinity** is an AI-powered interactive fiction engine that generates infinite, dynamic choose-your-own-adventure stories. It uses LLMs (Google Gemini, OpenAI, OpenRouter) as intelligent Game Masters that create unique narratives adapting to player choices in real-time.

- **Stack**: React 19 + Vite + TypeScript
- **Package Manager**: pnpm
- **Languages**: English (en) and Chinese (zh) via i18next

## Development Commands

```bash
# Start development server (port 3000)
pnpm dev

# Build for production
pnpm build

# Preview production build
pnpm preview

# Add a new story theme (interactive)
npx ts-node scripts/addStoryTheme.ts
```

## Architecture

### Data Flow

```
User Input → useGameEngine Hook → aiService.generateAdventureTurn()
    → AI Provider (Gemini/OpenAI/OpenRouter)
    → Agentic Loop (tool calls modify GameState)
    → Zod validation → GameState Update → Render
```

### Key Files

| File                                 | Purpose                                                      |
| ------------------------------------ | ------------------------------------------------------------ |
| `services/aiService.ts` (70KB)       | Unified AI service layer - content generation, agentic loops |
| `services/prompts.ts` (122KB)        | AI prompt templates for story generation                     |
| `services/zodSchemas.ts` (44KB)      | Zod schemas for AI output validation                         |
| `services/tools.ts` (43KB)           | Tool definitions for agentic loops                           |
| `services/gameDatabase.ts`           | Game entity management with unique IDs                       |
| `hooks/useGameEngine.ts` (54KB)      | Main orchestration hook                                      |
| `hooks/useGamePersistence.ts` (21KB) | IndexedDB persistence                                        |
| `types.ts` (25KB)                    | Application-level TypeScript types                           |

### Core Systems

**AI Provider Layer** (`services/providers/`): Unified interface for Gemini, OpenAI, and OpenRouter with message type conversion.

**Game Database**: Manages entities with unique IDs (`inv:N`, `npc:N`, `loc:N`, `quest:N`, `knowledge:N`). Each entity has **visible** (player knows) and **hidden** (GM-only) layers.

**Embedding/RAG System** (`services/embedding/`): Vector database with WebGPU-accelerated similarity search for maintaining narrative consistency.

**Prompt System**: Comprehensive templates for core storytelling, phased outline generation (5 phases), turn-by-turn narrative, and image generation.

**Tool System**: AI-callable tools that modify game state (add items, update NPCs, create quests, etc.) executed in an agentic loop.

### Component Structure

```
components/
├── pages/          # GamePage, InitializingPage
├── layout/         # Desktop/Mobile game layouts
├── feed/           # Story feed components
├── sidebar/        # Inventory, Quests, NPCs, Knowledge, etc.
├── settings/       # Settings tabs (models, credentials, audio)
└── render/         # Content rendering (images, text, items)
```

## Key Patterns

### Dual-Layer Entity System

Every game entity (items, NPCs, locations) has:

- `visible`: What the player knows
- `hidden`: GM-only truth (revealed via `unlocked` flag)

### Schema Validation

- Zod schemas define AI output structure (`zodSchemas.ts`)
- `zodCompiler.ts` converts schemas to provider-specific formats
- Application types in `types.ts` wrap Zod types with system fields

### State Management

GameState contains:

- `nodes`: Story tree (branching narrative)
- Entity arrays: inventory, relationships, locations, quests, knowledge, factions, timeline
- `character`: Player status
- `currentPhase`: "outline" or "game"

### Agentic Loop

1. Send context + tools to AI
2. AI responds with text + tool_calls
3. System executes tools sequentially
4. Results fed back to AI
5. Repeat until no more tool_calls
6. Validate final response with Zod

## Internationalization

- Framework: i18next with React integration
- Resources: `src/locales/{en,zh}/` with `translation.json` and `themes.json`
- Chinese themes get automatic cultural adaptation (aesthetics, names, philosophy)

## Theme System

- **Story Themes** (`utils/constants/themes.ts`): Genre definitions with visual theme, ambience, icon
- **Visual Themes** (`utils/constants/envThemes.ts`): CSS variables for colors, fonts, day/night modes
- **Adding Themes**: Use `scripts/addStoryTheme.ts` or follow `docs/how_to_add_story_theme.md`

## Build & Deployment

- **GitHub Pages**: Auto-deploys on push to `main` via `.github/workflows/deploy.yml`
- **Cloudflare Pages**: Connect via repo integration, output `dist/`
- **Code Splitting**: Vendors, AI providers, hooks, and translations split into separate chunks

## Environment Variables

```bash
# .env.local
VITE_GEMINI_API_KEY=...
VITE_OPENAI_API_KEY=...
VITE_BASE_PATH=/coi-public  # For subdirectory deployment
```
