# UI 设计思路（现代视觉小说 / Scroll-First）

本文档记录当前项目的 UI 设计原则与落地方式，用于后续迭代时保持一致性：**信息清晰可读、桌面/移动端适配、与游戏内氛围与主题系统有机结合**，并避免“仪表盘/卡片化”的产品感。

## 核心目标

1. **现代视觉小说（VN）气质**
   - 以叙事阅读为中心：排版、留白、节奏优先于装饰。
   - “卷轴/书页”感来自 **层级与材质暗示**，而不是卡片、阴影、圆角容器。
2. **可读性优先**
   - 字号、行距、段落间距、引用/强调样式一致；对比度足够。
   - 避免过浅的分隔线导致结构不清晰；避免同区域出现“双分隔线”。
3. **主题一致性**
   - 一切颜色/强调/边界都从主题 token 派生（`text-theme-*`, `bg-theme-*`, `border-theme-*`）。
   - 让“主题”决定材质与气质，而不是在组件里硬编码视觉风格。
4. **响应式一致**
   - 桌面：更克制的控件露出（hover/secondary actions）。
   - 移动：更明确的可触达目标与更高的控件可见性（不依赖 hover）。

## 反模式（严格避免）

- **卡片化**：明显的圆角盒子、厚边框、强阴影、强调色描边大面积包裹内容。
- **在“开始/自定义游戏”页面套产品化容器**：把表单与选项做成一组组“卡片”，并叠加强阴影/高圆角，导致页面像仪表盘而不是“开篇页”。
- **重复标题/重复分隔**：同一语义节点出现两个标题或两条线，产生割裂。
- **过度透明**：Modal/编辑器/查看器内容容器使用 `.../10` 这类透明度，导致背景干扰阅读。
- **桌面优先的交互**：重要功能只在 hover 才出现，移动端无法使用。

## 视觉语言与组件落地

### 1) 叙事区（Scroll）

原则：**正文就是页面**。结构来自排版，而不是容器。

- 正文排版：统一使用 `prose`（或等效排版约束），统一段落间距、blockquote、hr、链接样式。
- 段落分隔：用 `hr` / `bg-gradient-to-r ... via-theme-border/...` 的细线，强度适中（建议 `border/25~50`）。
- 角色分区：
  - 讲述者与玩家抉择主要依靠 **对齐、宽度、留白、极淡材质渐变** 区分。
  - 避免气泡/对话卡片。

### 2) 选项与输入（ActionPanel）

原则：**选项是列表**，自定义输入是“第 n+1 个选项”，形成同一阅读流。

- 桌面端：
  - 次要操作（如丢骰子）可在 hover 显示，但必须保证键盘/可聚焦可用。
- 移动端：
  - 关键操作必须常显（不依赖 hover），列表默认展开，保证可操作性。

### 3) 右侧时间轴 / 编年史（Timeline / Chronicle）

原则：时间轴是“旁注/索引”，不是第二套卡片 UI。

- 移除重复 title/premise（避免顶部重复信息）。
- 分隔线强度要足够（避免“看不见的结构”），且避免 item 自带边线 + 容器 `divide-y` 叠加成“双线”。

### 4) 侧边栏（Sidebar）

原则：侧边栏是“目录与注释”，结构用分组与细线，不用卡片。

- Panel 之间：`divide-y` 或 section 级别的细分隔线。
- 内部：优先使用列表、键值对、轻量分隔；减少大块背景。

### 5) Modal / Viewer / Editor

原则：Modal 是“翻页式的单层面板”，内容容器必须**不透明**，保证阅读。

- Overlay 可以半透明/模糊，但内容面板（surface）应为 `bg-theme-bg` 或 `bg-theme-surface`（不使用 `.../10`）。
- Footer/Header 透明可以，但主体阅读区不透明。

### 6) 开始界面 / 自定义游戏（StartScreen / CustomGameModal）

原则：它是“开篇页/扉页”，不是“设置面板”。**单列阅读流优先**，结构来自标题层级、分组与分隔线，而不是一块块卡片。

- 布局：优先单列（移动端与桌面一致），按“主信息 → 可选高级 → 提示/确认”顺序向下滚动。
- 分组：用 section 标题 + `divide-y`/细分隔线表达结构；避免“section 外再包一层 rounded + shadow”的双层容器。
- 表单控件：允许轻量边框与轻度圆角，但避免强阴影、厚边、强对比底色把每个字段做成独立卡片。
- 提示块：更像旁注（轻背景/细边线/小字号），不要做成强调色卡片。

## 设计检查清单（改 UI 前/后）

1. **是否引入卡片感？**（圆角/厚边/阴影/高对比底色包裹内容）
2. **是否重复标题/重复分隔线？**（同一个语义节点出现两次）
3. **分隔线是否可辨识？**（太淡会导致结构丢失）
4. **移动端是否可用？**（关键按钮不依赖 hover；触控命中足够）
5. **是否使用主题 token？**（避免硬编码颜色/透明度）
6. **Modal/Editor/Viewer 内容是否不透明？**

## 相关实现位置（便于定位）

- 叙事排版：`src/components/render/StoryText.tsx`
- 玩家抉择（视觉上不要做成卡片）：`src/components/render/UserActionCard.tsx`
- 选项/输入：`src/components/ActionPanel.tsx`
- 侧边栏：`src/components/Sidebar.tsx`、`src/components/sidebar/*`
- 时间轴：`src/components/StoryTimeline.tsx`、`src/components/StoryTimelineItem.tsx`
- 编年史（Viewer）：`src/components/GameStateViewer.tsx`、`src/components/gameViewer/*`
- 编辑器（Editor）：`src/components/StateEditor.tsx`
- 开始界面 / 自定义游戏：`src/components/StartScreen.tsx`、`src/components/CustomGameModal.tsx`

## 英文简述（for contributors）

We target a **modern visual novel** UI: typography-first, scroll/page feel, theme-token driven. Avoid card-like containers (rounded boxes, heavy borders/shadows). Keep structure readable via subtle but visible dividers, avoid double dividers/repeated headers, and ensure mobile usability without relying on hover. Modal/editor/viewer surfaces should be **opaque** for readability.
