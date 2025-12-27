/**
 * ============================================================================
 * Skills Registry - 技能注册表 (v2.0)
 * ============================================================================
 *
 * 支持动态加载的技能注册表
 *
 * 核心变化：
 * 1. 技能内容懒加载，不在初始化时生成
 * 2. 支持按需加载/卸载
 * 3. 生成 manifest 让 AI 知道有哪些可用技能
 */

import type {
  Skill,
  SkillCategory,
  SkillContext,
  ISkillRegistry,
  SkillManifestEntry,
  LoadedSkillData,
} from "./types";

// ============================================================================
// Skill Registry Implementation
// ============================================================================

class SkillRegistry implements ISkillRegistry {
  /** Registered skill definitions */
  private skills = new Map<string, Skill>();

  /** Loaded skill content cache */
  private loadedSkills = new Map<string, LoadedSkillData>();

  /** Current context */
  private currentContext: SkillContext | null = null;

  /** Current session ID for tracking */
  private sessionId: string | null = null;

  // --------------------------------------------------------------------------
  // Session Management
  // --------------------------------------------------------------------------

  /**
   * Set current session ID.
   * Clears loaded skills cache if session changes.
   */
  setSession(sessionId: string): void {
    if (this.sessionId !== sessionId) {
      this.loadedSkills.clear();
      this.currentContext = null;
      this.sessionId = sessionId;
    }
  }

  /**
   * Get current session ID
   */
  getSessionId(): string | null {
    return this.sessionId;
  }

  /**
   * Get list of currently loaded skill IDs
   */
  getLoadedSkillIds(): string[] {
    return Array.from(this.loadedSkills.keys());
  }

  /**
   * Get total estimated tokens of loaded skills
   */
  getLoadedTokenCount(): number {
    let total = 0;
    for (const data of this.loadedSkills.values()) {
      total += data.tokens || 0;
    }
    return total;
  }

  // --------------------------------------------------------------------------
  // Registration
  // --------------------------------------------------------------------------

  register(skill: Skill): void {
    if (this.skills.has(skill.id)) {
      console.warn(`[SkillRegistry] Overwriting skill: ${skill.id}`);
    }
    this.skills.set(skill.id, skill);
  }

  registerAll(skills: Skill[]): void {
    skills.forEach((skill) => this.register(skill));
  }

  // --------------------------------------------------------------------------
  // Query
  // --------------------------------------------------------------------------

  get(id: string): Skill | undefined {
    return this.skills.get(id);
  }

  getAll(): Skill[] {
    return Array.from(this.skills.values());
  }

  getByCategory(category: SkillCategory): Skill[] {
    return this.getAll().filter((s) => s.category === category);
  }

  // --------------------------------------------------------------------------
  // Loading Management
  // --------------------------------------------------------------------------

  loadSkill(id: string, ctx: SkillContext): string {
    const skill = this.skills.get(id);
    if (!skill) {
      console.warn(`[SkillRegistry] Skill not found: ${id}`);
      return "";
    }

    // 如果已加载且上下文未变，返回缓存
    const cached = this.loadedSkills.get(id);
    if (cached && this.currentContext === ctx) {
      return cached.content;
    }

    // 检查依赖
    if (skill.dependencies) {
      for (const depId of skill.dependencies) {
        if (!this.isLoaded(depId)) {
          this.loadSkill(depId, ctx);
        }
      }
    }

    // 检查互斥
    if (skill.mutualExclusive) {
      for (const exId of skill.mutualExclusive) {
        if (this.isLoaded(exId)) {
          this.unloadSkill(exId);
        }
      }
    }

    // 生成内容
    const content = skill.getContent(ctx);

    // 缓存
    this.loadedSkills.set(id, {
      id,
      content,
      loadedAt: Date.now(),
      tokens: skill.estimatedTokens,
    });

    this.currentContext = ctx;

    return content;
  }

  loadSkills(ids: string[], ctx: SkillContext): Map<string, string> {
    const result = new Map<string, string>();
    for (const id of ids) {
      result.set(id, this.loadSkill(id, ctx));
    }
    return result;
  }

  unloadSkill(id: string): void {
    this.loadedSkills.delete(id);
  }

  getLoadedContent(id: string): string | undefined {
    return this.loadedSkills.get(id)?.content;
  }

  isLoaded(id: string): boolean {
    return this.loadedSkills.has(id);
  }

  // --------------------------------------------------------------------------
  // Auto Loading
  // --------------------------------------------------------------------------

  autoLoad(ctx: SkillContext): string[] {
    const loadedIds: string[] = [];

    // 按优先级排序
    const sortedSkills = this.getAll().sort((a, b) => b.priority - a.priority);

    for (const skill of sortedSkills) {
      if (skill.loadMode === "disabled") {
        continue;
      }

      let shouldLoad = false;

      if (skill.loadMode === "always") {
        shouldLoad = true;
      } else if (skill.loadMode === "auto" && skill.shouldAutoLoad) {
        shouldLoad = skill.shouldAutoLoad(ctx);
      }
      // loadMode === "lazy" 的技能不自动加载

      if (shouldLoad) {
        this.loadSkill(skill.id, ctx);
        loadedIds.push(skill.id);
      }
    }

    return loadedIds;
  }

  // --------------------------------------------------------------------------
  // Manifest
  // --------------------------------------------------------------------------

  getManifestEntries(): SkillManifestEntry[] {
    return this.getAll()
      .filter((s) => s.loadMode !== "disabled")
      .sort((a, b) => b.priority - a.priority)
      .map((skill) => ({
        id: skill.id,
        name: skill.name,
        description: skill.description,
        whenToLoad: skill.whenToLoad,
        category: skill.category,
        loadMode: skill.loadMode,
        isLoaded: this.isLoaded(skill.id),
        estimatedTokens: skill.estimatedTokens,
      }));
  }

  buildManifest(): string {
    const entries = this.getManifestEntries();

    // 分组显示
    const alwaysLoaded = entries.filter((e) => e.loadMode === "always");
    const autoLoaded = entries.filter(
      (e) => e.loadMode === "auto" && e.isLoaded,
    );
    const lazyAvailable = entries.filter(
      (e) => e.loadMode === "lazy" && !e.isLoaded,
    );
    const lazyLoaded = entries.filter(
      (e) => e.loadMode === "lazy" && e.isLoaded,
    );

    const formatEntry = (e: SkillManifestEntry) => {
      const status = e.isLoaded ? "✓" : "○";
      const tokens = e.estimatedTokens ? ` (~${e.estimatedTokens} tokens)` : "";
      return `  ${status} [${e.id}] ${e.name}${tokens}\n     ${e.description}${e.whenToLoad ? `\n     → Load when: ${e.whenToLoad}` : ""}`;
    };

    const parts: string[] = ["<skill_manifest>"];

    if (alwaysLoaded.length > 0) {
      parts.push('  <core_skills hint="Always active">');
      parts.push(alwaysLoaded.map(formatEntry).join("\n"));
      parts.push("  </core_skills>");
    }

    if (autoLoaded.length > 0) {
      parts.push(
        '  <auto_loaded hint="Automatically loaded based on context">',
      );
      parts.push(autoLoaded.map(formatEntry).join("\n"));
      parts.push("  </auto_loaded>");
    }

    if (lazyLoaded.length > 0) {
      parts.push('  <on_demand_loaded hint="Loaded by request">');
      parts.push(lazyLoaded.map(formatEntry).join("\n"));
      parts.push("  </on_demand_loaded>");
    }

    if (lazyAvailable.length > 0) {
      parts.push('  <available_skills hint="Use load_skill to activate">');
      parts.push(lazyAvailable.map(formatEntry).join("\n"));
      parts.push("  </available_skills>");
    }

    parts.push("");
    parts.push("  <activate_skill_instruction>");
    parts.push("    To load additional skills, use the activate_skill tool:");
    parts.push('    activate_skill({ skillIds: ["<skill_id>", ...] })');
    parts.push(
      '    Example: activate_skill({ skillIds: ["combat", "mystery"] })',
    );
    parts.push("  </activate_skill_instruction>");
    parts.push("</skill_manifest>");

    return parts.join("\n");
  }

  // --------------------------------------------------------------------------
  // Composition
  // --------------------------------------------------------------------------

  compose(): string {
    // 按优先级排序已加载的技能
    const loadedEntries = Array.from(this.loadedSkills.entries())
      .map(([id, data]) => ({ id, data, skill: this.skills.get(id)! }))
      .filter((e) => e.skill)
      .sort((a, b) => (b.skill.priority || 0) - (a.skill.priority || 0));

    const parts: string[] = [];

    for (const entry of loadedEntries) {
      if (entry.data.content && entry.data.content.trim()) {
        parts.push(entry.data.content);
      }
    }

    return parts.join("\n\n");
  }

  reset(): void {
    this.loadedSkills.clear();
    this.currentContext = null;
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let registryInstance: SkillRegistry | null = null;

/**
 * 获取全局技能注册表实例
 */
export function getSkillRegistry(): SkillRegistry {
  if (!registryInstance) {
    registryInstance = new SkillRegistry();
  }
  return registryInstance;
}

/**
 * 重置注册表（用于测试或重新初始化）
 */
export function resetSkillRegistry(): void {
  if (registryInstance) {
    registryInstance.reset();
  }
  registryInstance = null;
}

// ============================================================================
// Exports
// ============================================================================

export { SkillRegistry };
