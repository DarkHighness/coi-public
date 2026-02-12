# Skills 结构说明（SkillOutput / Multi-file Skills）

本项目将“技能（skills）/协议（protocol）/参考资料（refs）”以 **VFS 只读文件** 的形式提供给 agentic loops：  
工具侧使用 `current/skills/**` 访问（canonical 为 `shared/system/skills/**`）。

本文面向维护者，说明技能内容在代码中的定义方式，以及 `SkillOutput` 如何映射为多文件产物。

---

## 1) 技能内容的两种产出形态

### 1.1 Legacy：单文件（string）
当一个 skill 的内容生成器返回 **string** 时：
- 只生成 `SKILL.md`
- generator 会为 `SKILL.md` 自动添加 YAML frontmatter（见下文）

### 1.2 Multi-file：多文件（SkillOutput）
当内容生成器返回 **SkillOutput** 时：
- 生成 `SKILL.md`（始终）
- 可选生成 `CHECKLIST.md` / `EXAMPLES.md` / `references/*.md`

> Source of truth：
> - `src/services/prompts/atoms/types.ts`（`SkillOutput` / `SkillAtom` 类型定义）
> - `src/services/vfs/globalSkills/generator.ts`（多文件映射与 frontmatter 生成逻辑）

---

## 2) SkillOutput 字段与文件产物映射

`SkillOutput` 字段定义（见 `src/services/prompts/atoms/types.ts`）：
- `main`：必填，主内容
- `quickStart?`：可选，60 秒快速流程
- `checklist?`：可选，清单项数组
- `examples?`：可选，Before/After 示例数组
- `references?`：可选，额外引用文档（文件名 -> 内容）

generator 映射规则（见 `src/services/vfs/globalSkills/generator.ts`）：
- `main` → `skills/<path>/SKILL.md` 的主体内容（会进行 XML→Markdown 的兼容转换）
- `quickStart` → 嵌入 `SKILL.md` 的 `## Quick Start (60 seconds)` 小节（不生成独立文件）
- `checklist` → `skills/<path>/CHECKLIST.md`
- `examples` → `skills/<path>/EXAMPLES.md`
- `references` → `skills/<path>/references/<refName>.md`

---

## 3) SKILL.md frontmatter（Skill Version）

每个生成的 `SKILL.md` 顶部会包含 YAML frontmatter（见 `src/services/vfs/globalSkills/generator.ts` 的 `buildFrontmatter()`），字段包括：
- `name`：skill 的稳定 ID（kebab-case）
- `version`：技能版本号（当前由 generator 固定写入，例如 `1.0.0`）
- `description`：简述
- `tags` / `domain` / `priority`：用于索引与分类

`CHECKLIST.md` / `EXAMPLES.md` / `references/*.md` 默认不带 frontmatter（它们作为辅助文档被 `SKILL.md` 引用/配套使用）。

---

## 4) 新增/修改 Skill 的推荐流程

1. 在 `src/services/vfs/globalSkills/generator.ts` 中新增或修改 `SkillMapping`
2. 选择内容生成方式：
   - 简单场景：返回 string（单文件）
   - 协议类/需要配套文档：返回 `SkillOutput`（多文件）
3. 本地验证：
   - `pnpm skills:atoms:check`
   - `pnpm test:stable`（可选：`pnpm test:cov:stable`）

