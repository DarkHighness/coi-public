<div align="center">
<picture>
  <source media="(prefers-color-scheme: dark)" srcset="public/logo_dark_symbol.png">
  <source media="(prefers-color-scheme: light)" srcset="public/logo_light_symbol.png">
  <img alt="Chronicles of Infinity Logo" src="public/logo_dark_symbol.png" width="168" />
</picture>

# Chronicles of Infinity（无限编年史）

**一款治理级 AI 叙事 RPG 平台。**

**面向长线战役的因果一致性、可审计性与题材纪律。**

[English](README.md) | [中文](README_CN.md)

</div>

<a id="document-metadata"></a>

## 文档元信息

- **状态**：Active
- **版本**：2026 Q1
- **读者对象**：产品、叙事设计、工程
- **范围**：平台级能力概览、方法论模型与可信性立场
- **不覆盖**：各运行模块的完整实现规格
- **核心承诺**：可追溯、可解释、可持续的长线互动叙事

<a id="table-of-contents"></a>

## 目录

1. [执行摘要](#executive-summary)
2. [阅读导引](#reader-paths)
3. [为什么它与常见 AI 剧情产品不同](#why-it-feels-different)
4. [范围与非目标](#scope-and-non-goals)
5. [设计目标](#design-objectives)
6. [架构原则总览](#architecture-principles-at-a-glance)
7. [方法论框架](#methodological-framework)
8. [核心特色能力](#distinctive-capabilities)
9. [治理与可信框架](#governance-and-trust-framework)
10. [可信性与可靠性模型](#reliability-and-trust-model)
11. [运行评估标准](#operational-evaluation-criteria)
12. [重点叙事域](#core-narrative-domains)
13. [一局体验循环](#one-session-experience-loop)
14. [证据映射](#evidence-map)
15. [给创作者与扩展者](#for-creators-and-extenders)
16. [术语表](#glossary)
17. [快速开始](#quick-start)
18. [部署与文档](#deployment-and-documentation)
19. [许可证](#license)

<a id="executive-summary"></a>

## 执行摘要

Chronicles of Infinity 是一套面向战役长度互动小说的叙事优先 AI 冒险平台。

它的核心判断很明确：长线叙事质量本质上是系统能力问题。若状态不可持续、视角不可控、连续性在上下文压力下失守，再好的单回合文案也会失真。

本仓库以规范化状态管理（VFS）、Actor-first 推理、Visible/Hidden 双层真相建模与题材治理机制来解决这一问题。

<a id="reader-paths"></a>

## 阅读导引

- 若关注架构意图与可信性：阅读 `设计目标`、`架构原则总览`、`治理与可信框架`。
- 若关注项目差异化：阅读 `为什么它与常见 AI 剧情产品不同`、`核心特色能力`、`重点叙事域`。
- 若关注可核验证据：阅读 `证据映射`。
- 若要快速运行：阅读 `快速开始` 与 `部署与文档`。

<a id="why-it-feels-different"></a>

## 为什么它与常见 AI 剧情产品不同

| 产品支柱            | 系统承诺                                        | 玩家体感结果                           |
| ------------------- | ----------------------------------------------- | -------------------------------------- |
| 世界会记账          | 规范化 VFS 状态作为唯一事实源                   | 每次关键选择都会留下可回看的长期痕迹   |
| 明线叙事 + 暗线推进 | Visible/Hidden 双层事实并行演化                 | 世界可以“后揭示”但不会“硬改写”         |
| 长线连续性控制      | Compact + Query Summary 回退 + Cleanup 协同流程 | 多局推进保持自洽，不容易漂移失忆       |
| 题材即行为契约      | 主题治理约束语气、节奏、风险与后果语法          | 不同题材在机制层真实不同，而非仅换文风 |

<a id="scope-and-non-goals"></a>

## 范围与非目标

### 范围内

- 面向战役长度互动叙事的持续因果管理。
- 基于角色位置的信息可见性与视角控制。
- 跨长局题材约束与后果逻辑保持。
- 面向创作者与维护者的可检查运行面。

### 非目标

- 仅追求单回合新奇感的即时生成。
- 只换词汇不换行为的题材换皮。
- 不可审计的隐式状态变更链路。
- 用完全确定性脚本替代人类作者的长篇创作。

<a id="design-objectives"></a>

## 设计目标

- **连续性优先于单回合高光**：优先保障多回合一致性，而非单回合风格爆发。
- **因果可追溯**：关键叙事结果可回溯到已记录状态迁移。
- **视角保真**：明确区分玩家可知信息与世界内部信息。
- **题材完整性**：在长局中维持主题节奏与后果逻辑，不被同质化吞没。
- **运行可解释**：暴露可检查运行面，支持创作者调试与扩展。

<a id="architecture-principles-at-a-glance"></a>

## 架构原则总览

| 原则           | 主要机制                               | 运行结果                   |
| -------------- | -------------------------------------- | -------------------------- |
| 状态先于文案   | VFS 规范化世界与战役文件               | 世界事实可检查、可持续     |
| 视角先于修辞   | Actor-first 推理模型                   | 响应遵循角色位置与信息边界 |
| 分层先于平铺   | Visible/Hidden 双层真相                | 发现与揭示具备结构合法性   |
| 连续性先于炫技 | Compact + Query Summary 回退 + Cleanup | 长局退化可控而非崩塌       |
| 题材先于通用   | 主题治理契约                           | 节奏与后果语法保持稳定     |
| 分叉先于覆盖   | 分支感知历史记忆                       | 分线因果闭合且可恢复       |
| 可观测先于黑箱 | Schema 契约 + 文件化状态运行面         | 运行行为可审计、可演化     |

<a id="methodological-framework"></a>

## 方法论框架

- **规范化状态基底（VFS）**
  世界与战役数据以规范化文件管理，状态不被当作一次性 Prompt 残留。

- **Actor-First 推理**
  系统从角色位置、社会关系与信息可得性出发推理，减少全知视角扁平化。

- **Visible/Hidden 双层真相**
  玩家层现实与世界层现实分离建模，揭示依靠推进而非回补式改写。

- **连续性维护栈**
  Compact、Query Summary 回退与 Cleanup 协同运行，在长上下文压力下维持一致性。

- **题材治理契约**
  题材不是文风标签，而是对节奏、冲突语法、风险结构与后果形态的约束。

- **分叉感知历史记忆**
  分支可独立演化，同时保持局部因果闭合与历史可恢复性。

<a id="distinctive-capabilities"></a>

## 核心特色能力

- **结构化世界实体**
  角色、势力、地点、任务、知识、时间线与因果链按关联状态对象管理。

- **系统级后果传播**
  结果由持久化世界条件驱动，不依赖表层措辞回调。

- **受控视角披露**
  信息出现受角色可见性与解锁状态约束，保留探索张力。

- **战役级漂移控制**
  连续性稳定是运行时能力，而不是人工补写补丁。

- **长线题材稳定性**
  题材身份可跨长局保持，不塌缩为通用叙事模板。

- **创作者可操作运行面**
  借助 VFS 工具与 Schema 契约，可检查并演化叙事行为。

<a id="governance-and-trust-framework"></a>

## 治理与可信框架

| 治理层     | 核心问题                     | 控制机制                                 | 平台结果                             |
| ---------- | ---------------------------- | ---------------------------------------- | ------------------------------------ |
| 设计治理层 | 叙事规则如何被定义并受约束？ | 主题新增协议、Schema 契约、扩展流程文档  | 题材以“契约”方式运行，而非装饰性标签 |
| 运行治理层 | 战役推进时如何维持一致性？   | Actor-first 推理、双层真相、连续性维护栈 | 叙事推进保持因果稳定与视角稳定       |
| 审计治理层 | 事后如何验证系统行为？       | VFS 状态运行面、分支历史、工具文档       | 关键决策和结果可检查、可解释         |

<a id="reliability-and-trust-model"></a>

## 可信性与可靠性模型

| 可信主张   | 运行锚点                      | 可验证面                     |
| ---------- | ----------------------------- | ---------------------------- |
| 状态可追溯 | 持久化 VFS 世界与战役文件     | 状态产物、历史快照、世界记录 |
| 因果一致性 | 角色记忆 + 已存世界事实       | 结果与状态迁移的一致性核验   |
| 分层完整性 | Visible/Hidden 分层与揭示逻辑 | 暗线推进与后续揭示的自洽性   |
| 受控退化   | Summary 回退与 Cleanup 流程   | 上下文压力下的一致性恢复表现 |
| 治理化扩展 | 主题协议 + Schema + 文档      | 扩展过程中平台契约不被破坏   |

<a id="operational-evaluation-criteria"></a>

## 运行评估标准

在重大版本发布或叙事策略调整前，建议通过以下关口：

| 评估关口   | 核心问题                                 | 通过信号                         |
| ---------- | ---------------------------------------- | -------------------------------- |
| 连续性关口 | 当前状态能否由历史回合无矛盾解释？       | 抽样战役中无未闭合连续性断点     |
| 因果关口   | 关键结果是否由已存状态事实支撑？         | 关键结果路径与状态迁移记录一致   |
| 视角关口   | 玩家可见信息是否落在角色边界内？         | 验证样本中无越权信息泄漏         |
| 题材关口   | 长线节奏与后果语法是否保持题材一致？     | 多分支运行中题材行为不漂移       |
| 恢复关口   | 上下文压力下能否恢复一致性且不抹平风格？ | 恢复后同时保留逻辑闭合与题材身份 |

<a id="core-narrative-domains"></a>

## 重点叙事域

| 类型         | 叙事压力模型                         | 代表题材                       |
| ------------ | ------------------------------------ | ------------------------------ |
| 爽文类       | 位阶不对称、公开冲突、反转经济学     | 龙傲天、战神归来、都市权势反转 |
| 虐文类       | 延迟真相、情感债务、不可逆后果       | 追妻火葬场、替身白月光、遗憾线 |
| 治愈类       | 在现实约束下通过连续选择完成关系修复 | 甜宠治愈、双向救赎、日常成长   |
| 悬疑恐怖类   | 信息差、规则压力、认知风险           | 本格推理、规则怪谈、克系恐惧   |
| 史诗世界观类 | 个体行动置于势力与文明尺度系统内演化 | 西幻史诗、仙侠修真、赛博史诗   |

<a id="one-session-experience-loop"></a>

## 一局体验循环

1. **选题材**
   选择叙事类型与对应压力模型。
2. **建角色**
   定义资源杠杆、限制条件与社会暴露面。
3. **做选择**
   在场景上下文中执行预设动作或自定义意图。
4. **看系统回应**
   世界实体与暗线过程按规范化状态联动更新。
5. **承担后果**
   即时影响与延迟影响共同沉淀。
6. **进入下一局**
   分支历史、题材纪律与因果可读性继续继承。

<a id="evidence-map"></a>

## 证据映射

- **架构与策略**：
  [`docs/vfs-v2-architecture.md`](docs/vfs-v2-architecture.md)，
  [`docs/VFS_TOOLING.md`](docs/VFS_TOOLING.md)
- **Schema 契约**：
  [`docs/SCHEMA_DOCS.md`](docs/SCHEMA_DOCS.md)
- **Prompt 与 Skills 运行面**：
  [`src/services/prompts/README.md`](src/services/prompts/README.md)
- **主题扩展协议**：
  [`docs/how_to_add_story_theme.md`](docs/how_to_add_story_theme.md)
- **主题映射与重写方法**：
  [`docs/plans/THEME_MAPPING_TABLE.md`](docs/plans/THEME_MAPPING_TABLE.md)，
  [`docs/plans/THEME_REWRITE_TASK.md`](docs/plans/THEME_REWRITE_TASK.md)
- **世界观与主角生态方法**：
  [`docs/plans/WORLDBUILDING_METHODOLOGY.md`](docs/plans/WORLDBUILDING_METHODOLOGY.md)，
  [`docs/plans/PROTAGONIST_ECOLOGY.md`](docs/plans/PROTAGONIST_ECOLOGY.md)
- **叙事 UI 标准**：
  [`docs/ui_vn_style.md`](docs/ui_vn_style.md)

<a id="for-creators-and-extenders"></a>

## 给创作者与扩展者

建议按以下顺序开展扩展与治理工作：

1. 先定义题材契约与世界假设。
2. 再将约束编码到 Prompt 模块与技能体系。
3. 用连续性、因果与视角关口验证行为稳定性。
4. 最后完成 Schema 与文档对齐后发布。

主要参考资料：

- [`docs/how_to_add_story_theme.md`](docs/how_to_add_story_theme.md)
- [`src/services/prompts/README.md`](src/services/prompts/README.md)
- [`docs/VFS_TOOLING.md`](docs/VFS_TOOLING.md)
- [`docs/vfs-v2-architecture.md`](docs/vfs-v2-architecture.md)
- [`docs/SCHEMA_DOCS.md`](docs/SCHEMA_DOCS.md)

<a id="glossary"></a>

## 术语表

- **规范化状态（Canonical State）**：用于叙事计算的持久化事实源。
- **Actor-First**：基于角色位置与信息可得性的决策逻辑。
- **Visible 层**：当前对玩家可见的叙事事实层。
- **Hidden 层**：尚未对玩家揭示的世界内部事实层。
- **连续性维护栈（Continuity Stack）**：Compact、Query Summary 回退与 Cleanup 协同流程。
- **题材治理（Theme Governance）**：约束题材特定叙事行为的规则集合。
- **分支历史（Branch History）**：分叉叙事线路的可恢复历史记录。
- **因果可读性（Causal Legibility）**：可由先前状态解释当前结果的能力。

<a id="quick-start"></a>

## 快速开始

1. 安装依赖。
   ```bash
   pnpm install
   ```
2. 在项目根目录创建 `.env.local`，配置任一模型提供商 Key。
   ```env
   VITE_GEMINI_API_KEY=your_gemini_api_key_here
   # 或
   VITE_OPENAI_API_KEY=your_openai_api_key_here
   ```
3. 启动项目。
   ```bash
   pnpm dev
   ```
4. 打开 `http://localhost:5173`。

如果你更偏好 npm，可使用 `npm install` 与 `npm run dev`。

<a id="deployment-and-documentation"></a>

## 部署与文档

- 构建命令：`pnpm build`
- 已支持部署目标：GitHub Pages、Cloudflare Pages
- 文档入口：
  [`docs/how_to_add_story_theme.md`](docs/how_to_add_story_theme.md)，
  [`docs/VFS_TOOLING.md`](docs/VFS_TOOLING.md)，
  [`docs/vfs-v2-architecture.md`](docs/vfs-v2-architecture.md)，
  [`docs/SCHEMA_DOCS.md`](docs/SCHEMA_DOCS.md)，
  [`docs/ui_vn_style.md`](docs/ui_vn_style.md)

<a id="license"></a>

## 许可证

MIT License。
