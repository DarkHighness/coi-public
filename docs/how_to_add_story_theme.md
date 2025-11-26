# How to Add a New Story Theme

This guide outlines the steps to add a new story theme to the application.

## File Structure Overview

The theme system is organized into the following files:

```plaintext
utils/constants/
├── themes.ts          # Story themes (genre configurations)
├── envThemes.ts       # UI/Visual themes (colors, CSS variables)
└── backgroundImages.ts # Background images for themes

src/locales/
├── en/themes.json     # English translations
└── zh/themes.json     # Chinese translations
```

## 1. Define the Theme Key

Choose a unique key for the theme (e.g., `minecraft`, `harry_potter`, `resident_evil`).

## 2. Update `utils/constants/themes.ts`

Add the new theme configuration to the `THEMES` object.

```typescript
export const THEMES: Record<string, StoryThemeConfig> = {
  // ... existing themes
  [theme_key]: {
    envTheme: "fantasy", // Choose an appropriate visual theme from envThemes.ts
    defaultAtmosphere: "forest", // Default ambient sound
    icon: "🐉", // Choose an appropriate emoji
    categories: ["fantasy", "game"], // Add relevant categories
    restricted: true, // Set to true for licensed IP themes
  },
};
```

### Available `envTheme` Options

The `envTheme` field references visual themes defined in `utils/constants/envThemes.ts`:

- **Standard**: `fantasy`, `scifi`, `cyberpunk`, `horror`, `mystery`, `romance`, `modern`
- **Eastern**: `wuxia`, `demonic`, `ethereal`, `royal`
- **Specialized**: `war`, `gothic`, `apocalypse`, `interstellar`, `academy`, `nature`, `wasteland`
- **And many more...** (see `envThemes.ts` for full list)

### Available Categories

Categories are defined in the `CATEGORY_KEYS` array:

- `ancient`, `modern`, `fantasy`, `suspense`, `wuxia`, `scifi`, `game`, `novel`, `movie`

## 3. Update Translations

You must add translations for both English and Chinese.

### English (`src/locales/en/themes.json`)

```json
{
  "[theme_key]": {
    "name": "Theme Name",
    "narrativeStyle": "【Core Style】: Description of the writing style...\n【World View】: Description of the world...\n【Culture】: Key cultural elements...\n【Writing Guidelines】: Instructions for the AI...",
    "backgroundTemplate": "【World Background】: Template for the story background...\n【Current Situation】: Starting scenario...",
    "example": "An example paragraph demonstrating the style...",
    "worldSetting": "A detailed description of the world setting..."
  }
}
```

### Chinese (`src/locales/zh/themes.json`)

```json
{
  "[theme_key]": {
    "name": "主题名称",
    "narrativeStyle": "【核心风格】：写作风格描述...\n【世界观】：世界观描述...\n【文化】：文化元素...\n【写作指导】：AI写作指导...",
    "backgroundTemplate": "【世界背景】：背景模板...\n【当前处境】：开场情境...",
    "example": "示例段落...",
    "worldSetting": "世界设定的详细描述..."
  }
}
```

## Special Rules for Licensed IP Themes (Games, Movies, Novels)

1. **Restricted Mode**: Set `restricted: true` in `themes.ts`.
2. **Naming Convention**: In Chinese translation, the name should be wrapped in `《》` (e.g., `《生化危机》`, `《冰与火之歌》`).
3. **Category Assignment**: Add appropriate categories like `game`, `movie`, or `novel`.
4. **Writing Instructions**: The `narrativeStyle` must explicitly instruct the model to:
   - Adhere to the source material's worldview, chronology, and lore
   - Use authentic terminology, names, and locations
   - Forbid free invention that contradicts canon

## Example: Resident Evil

**themes.ts**:

```typescript
resident_evil: {
  envTheme: "apocalypse",
  defaultAtmosphere: "storm",
  icon: "🧬",
  categories: ["suspense", "game", "movie"],
  restricted: true,
},
```

**zh/themes.json**:

```json
"resident_evil": {
  "name": "《生化危机》",
  "narrativeStyle": "【核心风格】：生存恐怖、丧尸病毒、安布雷拉公司、动作冒险。\n【世界观】：安布雷拉公司。T病毒、G病毒。浣熊市爆发。STARS特警队。泰伦。\n...",
  "backgroundTemplate": "【世界背景】：安布雷拉公司表面是制药巨头，暗地里研发生化武器...\n【当前处境】：你是一名STARS队员...",
  "example": "'S.T.A.R.S...'暴君的嘶哑声音从黑暗中传来...",
  "worldSetting": "一个生存恐怖与生化危机并存的世界..."
}
```

## Adding a New Visual Theme (envTheme)

If you need a completely new visual style, add it to `utils/constants/envThemes.ts`:

```typescript
export const ENV_THEMES: Record<string, ThemeConfig> = {
  // ... existing themes
  [new_visual_theme]: {
    vars: {
      "--theme-bg": "#...",
      "--theme-surface": "#...",
      "--theme-surface-highlight": "#...",
      "--theme-border": "#...",
      "--theme-primary": "#...",
      "--theme-primary-hover": "#...",
      "--theme-text": "#...",
      "--theme-muted": "#...",
      ...DEFAULT_STATE_VARS, // Include state colors
    },
    dayVars: {
      // Light mode variants
      ...DEFAULT_DAY_STATE_VARS,
    },
    fontClass: "font-fantasy", // or font-scifi, font-horror, font-cyberpunk, font-sans, font-serif
  },
};
```

## CSS State Variables

All themes automatically include semantic state colors via `DEFAULT_STATE_VARS`:

- `--theme-success` / `--theme-success-muted` (green tones)
- `--theme-warning` / `--theme-warning-muted` (yellow/amber)
- `--theme-error` / `--theme-error-muted` (red tones)
- `--theme-info` / `--theme-info-muted` (blue tones)
- `--theme-unlocked` / `--theme-unlocked-muted` (gold - for revealed content)
- `--theme-secret` / `--theme-secret-muted` (purple - for secret outcomes)
- `--theme-danger` / `--theme-danger-muted` (rose/red - for hidden truths)
