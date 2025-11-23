# How to Add a New Story Theme

This guide outlines the steps to add a new story theme to the application.

## 1. Define the Theme Key
Choose a unique key for the theme (e.g., `minecraft`, `harry_potter`).

## 2. Update `utils/constants/themes.ts`
Add the new theme configuration to the `THEMES` object.

```typescript
export const THEMES: Record<string, StoryThemeConfig> = {
  // ... existing themes
  [theme_key]: {
    defaultEnvTheme: "fantasy", // Choose an appropriate visual theme (see ENV_THEMES)
    icon: "🐉", // Choose an appropriate emoji
    categories: ["fantasy", "game"], // Add relevant categories
    restricted: true, // Set to true if it requires specific world-building constraints (e.g., Isekai)
  },
};
```

## 3. Update Translations
You must add translations for both English (`en.ts`) and Chinese (`zh.ts`) in `utils/translations/themes/`.

### English (`utils/translations/themes/en.ts`)
```typescript
export const themes = {
  // ...
  [theme_key]: {
    name: "Theme Name",
    narrativeStyle: "Description of the writing style...",
    backgroundTemplate: "Template for the story background...",
    example: "An example paragraph...",
  },
};
```

### Chinese (`utils/translations/themes/zh.ts`)
```typescript
export const themes = {
  // ...
  [theme_key]: {
    name: "主题名称", // For Isekai themes, use format "《Theme Name》"
    narrativeStyle: "写作风格描述...",
    backgroundTemplate: "背景模板...",
    example: "示例段落...",
  },
};
```

## Special Rules for Isekai/Fanfic Themes
1.  **Restricted Mode**: Set `restricted: true` in `themes.ts`.
2.  **Naming Convention**: In Chinese translation, the name should be wrapped in `《》` (e.g., `《魔兽世界》`).
3.  **Writing Instructions**: The `narrativeStyle` and `backgroundTemplate` must explicitly instruct the model to adhere to the source material's worldview, chronology, and lore, forbidding free invention.

## Example: World of Warcraft
**themes.ts**:
```typescript
wow: { defaultEnvTheme: "fantasy", icon: "⚔️", categories: ["game"], restricted: true },
```

**zh.ts**:
```typescript
wow: {
  name: "《魔兽世界》",
  narrativeStyle: "史诗、奇幻。严格遵循艾泽拉斯世界观...",
  // ...
}
```
