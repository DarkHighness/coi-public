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

## Theme Skills Policy

- Turn/Outline prompts include an optional theme-skill selection protocol: use `vfs_read_chars({ path: "current/skills/index.json" })` first, then selectively `vfs_read_chars({ path: "current/skills/theme/<genre>/SKILL.md" })` for `0~2` entries when needed.
- Theme archetype skills (e.g. `face-slapping-reversal`, `tragic-angst`, `healing-redemption`) are optional enhancement layers for pacing/conflict/tone.
- Theme skills are soft guidance only (no hard blocking gate).
- This differs from command/preset runtime constraints, which can still enforce strict read-before-write behavior in their own flows.

## Usage

Import from the directory root:

```typescript
import {
  buildCoreSystemInstructionWithSkills,
  getOutlineSystemInstruction,
  getVeoScriptPrompt,
} from "./services/prompts";
```
