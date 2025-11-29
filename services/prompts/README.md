# Prompt Services

This directory contains the modularized prompt generation logic for the AI Game Master.

## Structure

- **`common.ts`**: Shared constants, types, and core rules (Role, World Consistency, Cultural Adaptation).
- **`storyOutline.ts`**: Prompts for generating the initial story outline (Phases 1-5).
- **`turn.ts`**: Prompts for the main game loop (Turn generation, Context construction, Summary).
- **`veoScript.ts`**: Prompts for generating video scripts for VEO.
- **`sceneImage.ts`**: Prompts for generating scene images, including style mappings.
- **`translation.ts`**: Prompts for text translation.
- **`index.ts`**: Main entry point, exporting all modules.

## Key Features

- **Dual-Layer Reality**: All prompts support "Visible" vs "Hidden" layers for deep storytelling.
- **Cultural Adaptation**: Dynamic instructions based on language (English/Chinese).
- **Strict/Creative Modes**: Support for restricted (faithful) or creative (randomized) generation.
- **Modular Design**: Easy to maintain and extend specific prompt types without affecting others.

## Usage

Import from the directory root:

```typescript
import {
  getCoreSystemInstruction,
  getOutlinePrompt,
  getVeoScriptPrompt,
} from "./services/prompts";
```
