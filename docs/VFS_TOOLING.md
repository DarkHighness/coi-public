# VFS Tooling System Design (File-Only State)

本项目的 AI/GM 运行时采用 **VFS（Virtual File System）文件状态模型**：  
**VFS 是唯一的权威状态来源（single source of truth）**。AI 不能直接“调用领域工具”来改游戏状态，只能通过 `vfs_*` 文件工具 **读/写/搜索** VFS 中的文件来完成所有操作。

> 目标：把“上下文/状态/引用资料”统一成文件，并把“写入范围、原子性、审计/回放”设计成一套可验证、可扩展、低耦合的系统。

---

## 1. 核心理念

### 1.1 文件即状态（State = Files）
- **世界状态**：`world/**`（角色、地点、任务、知识、派系、时间线等）
- **对话状态**：`conversation/**`（按 fork + turn 的回合文件 + 索引）
- **摘要状态**：`summary/**`（用于压缩/摘要回合）
- **引用资料（Refs）**：`refs/**`（用于把“大而固定”的参考内容移出 prompt 上下文）

AI 通过工具在 VFS 中更新文件，UI/引擎再从 VFS 快照 **派生（derive）** 出可渲染的 `GameState`（仅视图模型，非权威）。

相关实现：
- 派生逻辑：`src/services/vfs/derivations.ts`
- VFS Session：`src/services/vfs/vfsSession.ts`

### 1.2 `current/` 虚拟根（Tool-facing alias）
为了让工具调用更直观，工具层暴露一个虚拟根目录：`current/`。

- **工具可见路径**：`current/world/...`, `current/conversation/...`, `current/refs/...`
- **VFS 内部真实路径**：`world/...`, `conversation/...`, `refs/...`

路径转换：
- `toCurrentPath()` / `stripCurrentPath()`：`src/services/vfs/currentAlias.ts`

---

## 2. VFS 文件树布局（Canonical Layout）

下面是常用的 VFS 布局（非穷举，示例）：

```text
world/
  global.json
  world_info.json
  characters/
    char:player/
      profile.json
      skills/
      conditions/
      traits/
      inventory/
      views/
        world_info.json
        quests/*.json
        knowledge/*.json
        timeline/*.json
        locations/*.json
        factions/*.json
        causal_chains/*.json
  quests/*.json
  locations/*.json
  knowledge/*.json
  factions/*.json
  timeline/*.json
  placeholders/*.json

conversation/
  index.json
  fork_tree.json
  turns/
    fork-0/
      turn-0.json
      turn-1.json
      ...

summary/
  state.json

refs/
  atmosphere/
    README.md
    options.md
    envTheme/*.md
    ambience/*.md
    weather/*.md
```

说明：
- `world/**`：权威世界数据（canonical）
- `world/characters/<id>/views/**`：**“玩家视角/解锁状态”**（per-actor view），用于 UI 控制“已知/已解锁”
- `conversation/**`：对话回合存储（支持 fork）
- `refs/**`：只读参考资料，避免把长文本塞进系统提示

---

## 3. VFS Snapshot & 持久化（Turn-scoped snapshots）

### 3.1 为什么要 Snapshot
VFS session 在内存中是一张 `path -> file` 的 map。为了：
- 支持回放/导出/版本化
- 支持 fork 分支
- 支持按回合增量存档

系统会将 session 的文件集打包为 snapshot，并按回合前缀存储：

```
turns/fork-<forkId>/turn-<turnNumber>/<path...>
```

关键实现：
- `createVfsSnapshot()` / `saveVfsSessionSnapshot()` / `restoreVfsSessionFromSnapshot()`：`src/services/vfs/persistence.ts`
- 其中 `buildTurnRoot(forkId, turn)` 负责生成 `turns/fork-x/turn-y`

### 3.2 Snapshot 前缀规则
- 保存时：给 session 内部 `world/...` 等路径加上回合前缀
- 恢复时：从指定回合前缀下剥离出相对路径恢复到 session

这保证了“同一份 session 布局”可以稳定地保存到任意回合根下。

---

## 4. Tool Surface：`vfs_*` 工具集

### 4.1 工具定义与 schema
工具定义集中在：`src/services/tools.ts`  
使用 `defineTool()`（Zod schema）定义参数，并导出 `ALL_DEFINED_TOOLS`。

工具的运行时 allowlist（不同循环可用工具不同）在：
- `src/services/vfsToolsets.ts`（`turn/cleanup/summary` 三套）

### 4.2 工具处理器（Handlers）
工具执行通过 registry 分发：
- 注册/分发：`src/services/tools/toolHandlerRegistry.ts`
- VFS 工具 handlers：`src/services/tools/handlers/vfsHandlers.ts`

handlers 的关键特点：
- **原子性**：写类工具通过 `withAtomicSession()` 在 draft session 上操作，成功后一次性 commit
- **安全限制**：内置“读后写”约束、只读路径约束、对话写入保护等（见下节）

### 4.3 工具清单（按用途）

**读/发现**
- `vfs_ls`：列目录
- `vfs_stat`：查看文件/目录状态
- `vfs_glob`：glob 匹配文件
- `vfs_schema`：返回路径对应的 schema hint（若存在）
- `vfs_read` / `vfs_read_many`：读文件（支持截断）
- `vfs_read_json`：对 JSON 文件做 JSON Pointer 局部读取（紧凑输出）
- `vfs_search`：全文搜索（text/regex/fuzzy，语义可选）
- `vfs_grep`：regex grep
- `vfs_ls_entries` / `vfs_suggest_duplicates`：面向实体的辅助检索（主要用于 cleanup）

**写/修改**
- `vfs_write`：写文件（覆盖/新建）
- `vfs_edit`：JSON Patch（RFC 6902）
- `vfs_merge`：深合并（数组替换，不做删除）
- `vfs_move`：重命名路径
- `vfs_delete`：删除文件
- `vfs_tx`：批量原子事务（write/edit/merge/move/delete/commit_turn）

**回合结束 / 摘要结束**
- `vfs_commit_turn`：唯一允许写 `conversation/**` 的“结束回合”工具（生成 turn 文件 + 更新 index）
- `vfs_finish_summary`：summary loop 的结束工具

---

## 5. 关键安全约束（Guardrails）

### 5.1 “读后写”约束（Read-before-write）
对 **已存在文件** 的 overwrite/edit/merge/delete，要求该文件在本 session 内先被读过（tool-seen）。

实现：`requireToolSeenForExistingFile()` in `src/services/tools/handlers/vfsHandlers.ts`

目的：
- 防止 AI 盲写覆盖关键文件
- 强制“inspect first”，降低幻觉式写入风险

例外：
- 新文件写入不要求已读（因为不存在）
- `skills/**` 等只读路径会由底层 VFS 抛错（见下一节）

### 5.2 只读路径（Read-only）
工具层将 `skills/**` 视为只读（不能被 vfs_write/edit/merge/move/delete 改动）。

实现：`isReadOnlyToolPath()` in `src/services/tools/handlers/vfsHandlers.ts`

目的：
- 把“系统技能/协议”与“游戏状态”隔离，避免被回合写入污染

### 5.3 对话写入保护（Conversation write forbidden）
在 turn agentic loop 中，禁止用通用写工具直接写 `current/conversation/*`。

强制规则：
- 回合必须通过 `vfs_commit_turn` 结束  
  或 `vfs_tx` 且 `commit_turn` 必须为 **最后一个 op**

实现：
- 校验逻辑：`src/services/ai/agentic/turn/agenticLoop.ts`（`CONVERSATION_WRITE_FORBIDDEN`）
- `vfs_tx` 规则：`src/services/tools/handlers/vfsHandlers.ts`（`commit_turn may appear at most once` 且必须 last）

目的：
- 保证回合文件写入格式一致、索引一致
- 避免半写入导致 fork/index 不一致

---

## 6. 回合写入协议（Turn Commit Protocol）

### 6.1 `vfs_commit_turn` 做了什么
`vfs_commit_turn` 会：
1) 读取/确保 `conversation/index.json` 存在
2) 计算当前 fork 下的下一个 `turnNumber`
3) 写入 `conversation/turns/fork-<id>/turn-<n>.json`
4) 更新 `conversation/index.json`（activeTurnId、latestTurnNumberByFork、turnOrderByFork 等）

实现：`registerToolHandler(VFS_COMMIT_TURN_TOOL, ...)` in `src/services/tools/handlers/vfsHandlers.ts`

### 6.2 为什么强制“最后一个工具调用”
turn loop 中会检查：
- finish tool **只能调用一次**
- finish tool **必须是最后一个 tool call**

实现：`src/services/ai/agentic/turn/agenticLoop.ts`

目的：
- 在“世界写入完成后”一次性落盘回合文件
- 让 UI 能以 turn 文件作为稳定边界做派生/渲染

---

## 7. UI/引擎如何消费 VFS（Derived View State）

### 7.1 派生（Derive）不是“再存一份”
VFS 中存的是 canonical data。UI 需要的 `GameState` 是派生产物：
- 读取 `world/global.json` 作为全局信息（主题、时间、当前地点、atmosphere 等）
- 读取 `conversation/index.json + turns/**` 生成 timeline/segments
- 读取 `world/characters/**` 与 `views/**` 生成 UI 展示与“解锁状态”

实现：`src/services/vfs/derivations.ts`

关键点：
- `GameState` 是 **可重建、可替换** 的 view model
- 任何“权威修改”必须回写到 VFS 文件中

---

## 8. Refs：把大参考文本移出上下文（Prompt Bloat Control）

### 8.1 适用场景
当某类“固定且较长”的参考资料（例如枚举说明、风格词库、对照表）：
- 放进 system prompt 会大量占 token
- 但 AI 只在少数情况下需要其中一小段

则应采用 `refs/**` 模式：
- 在 VFS seed 时写入 refs 文件
- prompt 中仅提示“去 refs 查”，不内联长内容
- AI 使用 `vfs_ls/vfs_read/vfs_search` 按需读取

### 8.2 已落地示例：Atmosphere refs
- Seed 实现：`src/services/vfs/refs/atmosphere.ts`
- Seed 入口：`src/services/vfs/seed.ts`（每次 seed session 都会调用）
- 生成文件：
  - `refs/atmosphere/envTheme/<key>.md`
  - `refs/atmosphere/ambience/<key>.md`
  - `refs/atmosphere/weather/<key>.md`

示例用法：
- 列出 ambience：`vfs_ls({ path: "current/refs/atmosphere/ambience" })`
- 读一个条目：`vfs_read({ path: "current/refs/atmosphere/ambience/nightclub.md" })`
- 全局搜关键字：`vfs_search({ path: "current/refs/atmosphere", query: "neon" })`

---

## 9. 扩展指南（如何新增/修改一类 VFS 能力）

### 9.1 如果只是“数据变大”
优先用 `refs/**`：
1) 把大数据放到 `src/resources/*.json` 或其它静态资源
2) 在 `src/services/vfs/refs/<topic>.ts` 写 seed 函数，把资源展开为 md/小文件
3) 在 `src/services/vfs/seed.ts` 的三个入口里调用 seed
4) 在系统提示中加入一行“引用资料在 `current/refs/<topic>`”提示（避免 prompt 内联）

### 9.2 如果要新增一个工具（一般不推荐）
因为系统目标是 “VFS-only 工具面” 稳定、可审计，通常应尽量复用 `vfs_*`。  
如果确实需要新增：
1) 在 `src/services/tools.ts` 用 `defineTool()` 定义 schema
2) 在 `src/services/tools/handlers/*` 注册 handler
3) 加入 `ALL_DEFINED_TOOLS`
4) 在 `src/services/vfsToolsets.ts` 对应 toolset allowlist 加入工具名
5) 更新 prompts 的 tool list / 指令（确保模型知道工具存在）
6) 增加 vitest 覆盖（至少 handler + toolset allowlist）

---

## 10. 设计权衡（Why this architecture）

**优点**
- 可审计：所有状态变更都有“文件差异”
- 可回放：回合快照天然支持 timeline/fork
- 可控：写入范围与协议（commit_turn last）把一致性问题收敛到少数点
- 可扩展：refs 模式能有效控制 prompt token

**代价**
- 需要更强的规范（文件布局、commit 协议）
- schema/枚举变更要同时更新：工具 schema、prompt 文字（若硬编码）、refs seed、i18n

---

## 11. Theme Skills 自主选读机制（无强门禁）

在 `skills/theme/**` 下，系统提供主题类技能（含通用 genre 与 archetype 扩展）。

- 发现入口：先读 `current/skills/index.json`
- 选读方式：AI 按当前回合题材/冲突/节奏需求，自主选读 `0~2` 个 `current/skills/theme/**/SKILL.md`
- 读写边界：`current/skills/**` 仍是只读参考资料，不参与状态写入

### 为什么不做主题强门禁

主题技能用于“风格/机制增强”，不是每回合都必须前置读取：

- 避免误拦截：轻量回合或简单题材不应因未读 theme skill 被阻断
- 保持流畅：减少不必要的机械读取，降低回合摩擦
- 兼容旧逻辑：现有 command/preset 强门禁保持不变，主题层保持软引导

### 推荐读取顺序

1. `current/skills/index.json`（发现相关 skill）
2. `current/skills/theme/<slug>/SKILL.md`（按需选读）
3. 必要时再读 `current/skills/worldbuilding/**` 与 `current/skills/craft/**`

---

## Appendix A：相关文件索引（快速跳转）
- 工具定义：`src/services/tools.ts`
- 工具 toolset allowlist：`src/services/vfsToolsets.ts`
- 工具 handlers：`src/services/tools/handlers/vfsHandlers.ts`
- 工具 registry：`src/services/tools/toolHandlerRegistry.ts`
- turn loop 约束：`src/services/ai/agentic/turn/agenticLoop.ts`
- VFS current alias：`src/services/vfs/currentAlias.ts`
- VFS 派生：`src/services/vfs/derivations.ts`
- VFS 持久化：`src/services/vfs/persistence.ts`
- VFS seeding：`src/services/vfs/seed.ts`
- refs/atmosphere：`src/services/vfs/refs/atmosphere.ts`
