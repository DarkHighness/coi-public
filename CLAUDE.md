# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Chronicles of Infinity** is an AI-powered choose-your-own-adventure game (AI DND) built with React 19 and Vite. It uses LLMs as an intelligent Game Master to generate dynamic, immersive stories that adapt to player choices.

## Development Commands

```bash
# Development
pnpm dev           # Start dev server at http://localhost:3000

# Build
pnpm build         # Production build

# Testing
pnpm vitest        # Run tests
pnpm vitest run    # Run tests once
pnpm vitest src/services/zodCompiler.test.ts  # Run single test file

# Code Quality
pnpm prettier --check .   # Check formatting
pnpm prettier --write .   # Fix formatting
```

## Architecture

### Core Layers

```
src/
├── App.tsx              # Main entry, context providers hierarchy
├── types.ts             # Central type definitions (GameState, entities)
├── contexts/            # Global state providers
│   ├── GameEngineContext.tsx   # Game state & actions
│   ├── RAGContext.tsx          # RAG (retrieval) system
│   ├── SettingsContext.tsx     # AI/user settings
│   └── TutorialContext.tsx     # Tutorial system
├── hooks/               # Custom React hooks
│   ├── useGameEngine.ts        # Main game loop logic
│   ├── useGameAction.ts        # Action handling
│   ├── useGamePersistence.ts   # Save/load
│   └── useRAG.ts               # RAG integration
├── services/            # Backend-like services
│   ├── ai/                     # AI provider abstraction
│   ├── providers/              # LLM providers (Gemini, OpenAI, Claude, OpenRouter)
│   ├── prompts/                # Prompt engineering modules
│   ├── rag/                    # RAG service with PGlite
│   ├── zodSchemas.ts           # Zod schemas for AI response validation
│   ├── zodCompiler.ts          # Converts Zod to JSON Schema for AI
│   ├── gameDatabase.ts         # IndexedDB persistence
│   └── tools.ts                # AI tool definitions
└── components/          # React UI components
```

### AI Provider System

The app supports multiple LLM providers through a unified interface:
- `src/services/providers/geminiProvider.ts` - Google Gemini
- `src/services/providers/openaiProvider.ts` - OpenAI
- `src/services/providers/claudeProvider.ts` - Anthropic Claude
- `src/services/providers/openRouterProvider.ts` - OpenRouter (multi-model)

### Prompt System

Prompts are modularized in `src/services/prompts/`:
- `common.ts` - Core rules, constants, role definitions
- `storyOutline.ts` - Initial story generation (5 phases)
- `turn.ts` - Main game loop prompts
- `sceneImage.ts` - Image generation prompts
- `skills/` - Skills-based prompt architecture

### Game State & Persistence

- Game state types defined in `src/types.ts`
- Zod schemas in `src/services/zodSchemas.ts` validate AI responses
- `zodCompiler.ts` converts Zod schemas to JSON Schema for provider APIs
- Persistence via IndexedDB in `src/services/gameDatabase.ts`

### RAG (Retrieval-Augmented Generation)

Located in `src/services/rag/`:
- `database.ts` - PGlite (PostgreSQL in WASM) for vector storage
- `service.ts` - RAG service API
- `worker.ts` - Web Worker for background processing
- `embeddingProvider.ts` - Embedding generation

## Path Alias

Use `@/` to import from `src/`:
```typescript
import { GameState } from "@/types";
import { useGameEngineContext } from "@/contexts/GameEngineContext";
```

## Key Patterns

### Context Provider Hierarchy

```tsx
<ToastProvider>
  <RAGProvider>
    <GameEngineProvider>
      <TutorialProvider>
        <AppContent />
      </TutorialProvider>
    </GameEngineProvider>
  </RAGProvider>
</ToastProvider>
```

### Versioned Timestamps

Entities use `VersionedTimestamp` for fork-aware ordering:
```typescript
interface VersionedTimestamp {
  forkId: number;
  turnNumber: number;
  timestamp: number;
}
```

### Build Info Generation

Build scripts auto-generate `utils/constants/buildInfo.ts` with git hash and timestamp. Supports CI/CD env vars (CF_PAGES_COMMIT_SHA, GITHUB_SHA, etc.).

## Internationalization

- Uses i18next with browser language detection
- Locales in `src/locales/en/` and `src/locales/zh/`
- Language-aware prompt generation for cultural adaptation

## Deployment

- **GitHub Pages**: Push to `main` triggers `.github/workflows/deploy.yml`
- **Cloudflare Pages**: Connect repo, uses `pnpm build`

## COOP/COEP Headers

Dev server requires special headers for SharedArrayBuffer (PGlite):
```
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```
