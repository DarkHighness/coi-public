# Prompt Services

This directory contains the modularized prompt generation logic for the AI Game Master.

## Structure

- **`common.ts`**: Shared constants for outline generation (Role, World Consistency, Cultural Adaptation, Language Enforcement).
- **`storyOutline.ts`**: Prompts for generating the initial story outline (Phases 1-10).
- **`turn.ts`**: Prompts for the main game loop (Turn generation, Context construction, Summary).
- **`veoScript.ts`**: Prompts for generating video scripts for VEO.
- **`sceneImage.ts`**: Prompts for generating scene images, including style mappings.
- **`rulesInjector.ts`**: Custom rules injection system.
- **`skills/`**: Skills-based prompt architecture (new system for turn prompts).
- **`index.ts`**: Main entry point, exporting all modules.

## Key Features

- **Dual-Layer Reality**: All prompts support "Visible" vs "Hidden" layers for deep storytelling.
- **Cultural Adaptation**: Dynamic instructions based on language (English/Chinese).
- **Strict/Creative Modes**: Support for restricted (faithful) or creative (randomized) generation.
- **Skills Architecture**: Modular prompt system with lazy-loading and conditional activation.

## Usage

Import from the directory root:

```typescript
import {
  buildCoreSystemInstructionWithSkills,
  getOutlineSystemInstruction,
  getVeoScriptPrompt,
} from "./services/prompts";
```
