# How to Add a Story Theme (Manual-First) / 如何新增故事主题（手工流程优先）

> Status / 状态（2026-02-08）
>
> - Official path / 官方路径：**manual update only / 仅手工更新**
> - `scripts/addStoryTheme.ts` has been removed / `scripts/addStoryTheme.ts` 已删除

---

## Purpose & Scope / 目的与范围

**EN**

This document is the canonical guide for adding new story themes in this repository. It focuses on:

- Theme registry updates (`themes.ts`)
- Bilingual theme content updates (`en/themes.json`, `zh/themes.json`)
- Compatibility checks against current runtime schema and UI filtering behavior

This guide does **not** auto-generate theme text in bulk.

**中文**

本文件是本仓库新增故事主题的官方指南，覆盖以下内容：

- 主题注册（`themes.ts`）
- 中英文主题文案（`en/themes.json`、`zh/themes.json`）
- 与当前运行时 schema 及 UI 分类过滤行为的一致性校验

本指南**不**覆盖批量自动生成主题文案。

---

## Original Gap Theme Backlog / 原创缺口主题候选清单

**EN**

The following 15 candidates are proposed to fill underrepresented directions.
Each entry includes key + CN/EN name + hook + suggested `envTheme/ambience` + visible categories.

**中文**

以下 15 个候选用于补足当前主题池相对稀缺方向。每条包含 key、中英文名、核心卖点、建议 `envTheme/ambience` 与可见分类。

| Theme Key                | 中文名       | English Name           | 核心卖点 / Core Hook               | Suggested Atmosphere        | Suggested Categories             |
| ------------------------ | ------------ | ---------------------- | ---------------------------------- | --------------------------- | -------------------------------- |
| `climate_crisis`         | 气候危机     | Climate Crisis         | 灾难治理、政策博弈与生存抉择       | `wasteland` + `storm`       | `modern`, `suspense`             |
| `forensic_pathologist`   | 法医追凶     | Forensic Pathologist   | 法医证据链推动悬疑破案             | `foundation` + `hospital`   | `modern`, `suspense`             |
| `courtroom_thriller`     | 高压法庭     | Courtroom Thriller     | 法庭攻防与证据交叉盘问             | `intrigue` + `courtroom`    | `modern`, `suspense`             |
| `archaeology_expedition` | 文明考古远征 | Archaeology Expedition | 遗迹探索、机关解谜与文明冲突       | `sepia` + `ruins`           | `ancient`, `fantasy`, `suspense` |
| `deep_sea_colony`        | 深海殖民     | Deep Sea Colony        | 封闭生态、资源危机与秩序崩塌       | `abyssal` + `underwater`    | `scifi`, `suspense`              |
| `space_salvage`          | 太空打捞     | Space Salvage          | 轨道打捞合同、零重力风险与黑市交易 | `interstellar` + `space`    | `scifi`, `game`                  |
| `disaster_response`      | 城市应急指挥 | Disaster Response      | 多线救援、资源分配与决策压力       | `war` + `city`              | `modern`, `suspense`             |
| `supply_chain_tycoon`    | 供应链风云   | Supply Chain Tycoon    | 物流网络建设、市场波动与商业谈判   | `modern` + `office`         | `modern`, `game`                 |
| `biotech_startup`        | 生物科技创业 | Biotech Startup        | 技术突破、伦理边界与资本博弈       | `foundation` + `laboratory` | `modern`, `scifi`                |
| `urban_planning`         | 城市更新计划 | Urban Planning         | 基建推进、民生权衡与政策协调       | `modern` + `city`           | `modern`                         |
| `time_loop_forensics`    | 时间循环刑侦 | Time-loop Forensics    | 重复日调查与因果拼图               | `mystery` + `city`          | `modern`, `suspense`, `scifi`    |
| `mythpunk_city`          | 神话赛博都市 | Mythpunk City          | 古神规则与高科技治理并存           | `cyberpunk` + `city`        | `fantasy`, `scifi`               |
| `expedition_logistics`   | 极地后勤线   | Expedition Logistics   | 极端环境运输、队伍协同与补给危机   | `cold` + `mountain`         | `modern`, `suspense`             |
| `frontier_medicine`      | 边境医疗     | Frontier Medicine      | 医疗资源稀缺下的伦理抉择           | `modern` + `village`        | `modern`                         |
| `slow_burn_detective`    | 慢燃侦探档案 | Slow-burn Detective    | 人物关系驱动的长期悬疑线           | `mystery` + `rain`          | `modern`, `suspense`, `novel`    |

---

## Canonical Source of Truth / 以代码为准的字段定义

### 1) Theme registry / 主题注册

- `/Users/twiliness/Desktop/coi/src/utils/constants/themes.ts`
  - `THEMES`: all story theme configs / 所有故事主题配置
  - `CATEGORY_KEYS`: visible category filter keys / 可见分类筛选键

### 2) Type contracts / 类型约束

- `/Users/twiliness/Desktop/coi/src/types.ts`
  - `StoryThemeConfig`
  - `ThemeParams`

### 3) Runtime enum constraints / 运行时枚举约束

- `/Users/twiliness/Desktop/coi/src/services/zodSchemas.ts`
  - `envThemeSchema`
  - `ambienceSchema`

### 4) Theme text resources / 主题文案资源

- `/Users/twiliness/Desktop/coi/src/locales/en/themes.json`
- `/Users/twiliness/Desktop/coi/src/locales/zh/themes.json`

### Field rules that must match runtime / 必须与运行时一致的字段规则

- `defaultAtmosphere` must be an object: `{ envTheme, ambience }`.
- `defaultAtmosphere` 必须是对象：`{ envTheme, ambience }`，不能是字符串。
- `themeParams` is strongly recommended for deterministic world behavior.
- 强烈建议填写 `themeParams`，用于稳定世界行为参数。
- Visible categories should follow `CATEGORY_KEYS`.
- 可见分类应遵循 `CATEGORY_KEYS`。
- `all` is a UI filter only, do not store it in a theme item.
- `all` 仅用于 UI 筛选，不应写入单个主题配置。

---

## Step-by-step Manual Flow / 手工新增完整流程

### Step 0: Pick a unique key / 确定唯一 key

- Format: `snake_case`
- Recommended: lowercase + underscore only
- Use search before adding:

```bash
rg -n "^  your_theme_key: \{" src/utils/constants/themes.ts
```

### Step 1: Add registry entry in `themes.ts` / 在 `themes.ts` 增加主题配置

File:

- `/Users/twiliness/Desktop/coi/src/utils/constants/themes.ts`

Required core fields / 必填核心字段：

- `themeParams`
- `envTheme`
- `defaultAtmosphere` (object)
- `icon`
- `categories`

Optional / 可选：

- `restricted` (for licensed IP only / 仅限授权 IP)

Example (non-IP) / 示例（非 IP）：

```ts
your_theme_key: {
  themeParams: {
    physicsHarshness: "standard",
    worldIndifference: "neutral",
    npcAutonomyLevel: "balanced",
    socialComplexity: "standard",
    economicComplexity: "standard",
  },
  envTheme: "modern",
  defaultAtmosphere: { envTheme: "modern", ambience: "city" },
  icon: "🧭",
  categories: ["modern", "suspense"],
},
```

Example (licensed IP) / 示例（授权 IP）：

```ts
your_ip_theme_key: {
  themeParams: {
    physicsHarshness: "cinematic",
    worldIndifference: "neutral",
    npcAutonomyLevel: "balanced",
    socialComplexity: "standard",
    economicComplexity: "standard",
  },
  envTheme: "scifi",
  defaultAtmosphere: { envTheme: "scifi", ambience: "scifi" },
  icon: "🚀",
  categories: ["scifi", "movie"],
  restricted: true,
},
```

### Step 2: Add English text / 添加英文文案

File:

- `/Users/twiliness/Desktop/coi/src/locales/en/themes.json`

Required keys / 必填键：

- `name`
- `narrativeStyle`
- `backgroundTemplate`
- `example`
- `worldSetting`

Recommended / 推荐：

- `protagonist_preference` (array)

### Step 3: Add Chinese text / 添加中文文案

File:

- `/Users/twiliness/Desktop/coi/src/locales/zh/themes.json`

Use the exact same theme key / 与英文文件保持完全一致的 key。

Recommended / 推荐：

- `protagonist_preference`（数组）

### Step 4: IP-specific handling / IP 主题额外规则

- Set `restricted: true` in `themes.ts`.
- 在 `themes.ts` 设置 `restricted: true`。
- Chinese display name should use `《》`.
- 中文显示名建议使用 `《》` 包裹。
- Keep canonical constraints explicit in style text.
- 在文案中明确遵循原作世界观、术语与时间线约束。

---

## Restricted IP Rules / 受限 IP 规则

**EN**

For licensed/canonical-IP themes, enforce stricter generation boundaries:

- Preserve canon world rules, timeline, and terminology.
- Avoid adding contradictory setting facts.
- Keep major role/faction relationships consistent with source material.

**中文**

对于授权/同人向 IP 主题，必须加强约束：

- 保持原作世界观、时间线、术语一致。
- 禁止生成与原作硬冲突的设定。
- 核心角色与势力关系需与原作一致。

---

## Validation Checklist / 验证清单

### A) Key consistency / key 一致性

```bash
rg -n "^  your_theme_key: \{" src/utils/constants/themes.ts
rg -n '"your_theme_key"\s*:' src/locales/en/themes.json src/locales/zh/themes.json
```

### B) JSON validity / JSON 有效性

```bash
node -e "JSON.parse(require('fs').readFileSync('src/locales/en/themes.json','utf8'));JSON.parse(require('fs').readFileSync('src/locales/zh/themes.json','utf8'));console.log('themes.json valid')"
```

### C) Category visibility / 分类可见性

- Theme picker uses `CATEGORY_KEYS` for visible filters.
- 主题筛选仅认 `CATEGORY_KEYS` 对应分类。

### D) Runtime value validity / 运行时枚举合法性

- `envTheme` must exist in `envThemeSchema`.
- `ambience` must exist in `ambienceSchema`.

### E) Manual UX sanity check / 手工 UI 冒烟验证

- Run app and verify the new theme appears in selector + preview.
- 启动应用确认主题可被搜索、筛选、预览并正常开局。

---

## Common Pitfalls / 常见坑

- Using string `defaultAtmosphere` instead of object.
- 将 `defaultAtmosphere` 误写成字符串。
- Missing `themeParams`, causing unstable style/behavior.
- 缺失 `themeParams`，导致风格/世界行为不稳定。
- Category typo not covered by `CATEGORY_KEYS`.
- 分类拼写错误或使用不可见分类，导致筛选不可见。
- Missing one locale entry (EN or ZH).
- 只加了中/英其中一个文案文件。
- IP theme without `restricted: true`.
- IP 主题遗漏 `restricted: true`。
- Chinese IP display name not wrapped with `《》`.
- 中文 IP 名称未使用 `《》` 包裹。

---

## Copyable Templates / 可复制模板

### 1) `themes.ts` template / `themes.ts` 模板

```ts
your_theme_key: {
  themeParams: {
    physicsHarshness: "standard", // cinematic | standard | realistic
    worldIndifference: "neutral", // benevolent | neutral | hostile
    npcAutonomyLevel: "balanced", // supportive | balanced | independent
    socialComplexity: "standard", // transparent | standard | intricate
    economicComplexity: "standard", // primitive | standard | advanced
  },
  envTheme: "modern",
  defaultAtmosphere: { envTheme: "modern", ambience: "city" },
  icon: "📚",
  categories: ["modern"],
  // restricted: true, // enable for licensed IP only
},
```

### 2) EN `themes.json` template / 英文模板

```json
"your_theme_key": {
  "name": "Your Theme Name",
  "narrativeStyle": "Tone, pacing, world language, and writing constraints.",
  "backgroundTemplate": "In [World], you are [Role] facing [Conflict].",
  "example": "A short paragraph showing voice and pacing.",
  "worldSetting": "3-5 sentences describing social order, power system, and conflicts.",
  "protagonist_preference": ["Role A", "Role B", "Role C"]
}
```

### 3) ZH `themes.json` template / 中文模板

```json
"your_theme_key": {
  "name": "你的主题名",
  "narrativeStyle": "叙事语气、节奏、世界术语与写作约束。",
  "backgroundTemplate": "在[世界]中，你是[身份]，正面临[冲突]。",
  "example": "一段体现该主题口吻与节奏的示例。",
  "worldSetting": "用 3-5 句描述社会结构、力量体系与核心矛盾。",
  "protagonist_preference": ["身份A", "身份B", "身份C"]
}
```

---

## Script Status & Migration / 脚本状态与迁移说明

**EN**

- `scripts/addStoryTheme.ts` has been removed and is no longer part of the official workflow.
- The script was built for older assumptions and may diverge from current runtime structure.
- Official process is now manual-first to guarantee schema correctness.

**中文**

- `scripts/addStoryTheme.ts` 已删除，不再属于官方新增流程。
- 该脚本基于旧字段假设，可能与当前运行时结构产生偏差。
- 目前以手工流程为唯一官方路径，以确保 schema 一致性。

---

## Public API Impact / 公共接口影响

- Runtime public APIs: **no breaking change**
- 运行时公共 API：**无破坏性变更**
- This is a documentation/process alignment update only.
- 本次主要是文档与流程规范对齐。
