/**
 * ============================================================================
 * Compiled Tool Registry - Pre-compiled Tools for All Providers
 * ============================================================================
 *
 * 在应用启动时将所有工具定义预编译到各 Provider 的原生格式，
 * 运行时直接使用已编译的工具，消除每次调用的编译开销。
 *
 * 支持的 Provider:
 * - Gemini (Google GenAI SDK)
 * - OpenAI (OpenAI SDK / Compatible endpoints)
 * - OpenRouter (OpenAI format with OpenRouter specifics)
 * - Claude (Anthropic SDK / Compatible endpoints via OpenAI)
 */

import type { ZodTypeAny } from "zod";
import type { ProviderProtocol } from "../../types";
import {
  createGeminiTool,
  createOpenAITool,
  createOpenRouterTool,
  createClaudeCompatibleTool,
  createGeminiCompatibleTool,
  type GeminiToolDefinition,
  type OpenAIToolDefinition,
  type OpenRouterToolDefinition,
} from "../zodCompiler";

// 导入所有工具定义
import { ALL_DEFINED_TOOLS } from "../tools";

// =============================================================================
// Types
// =============================================================================

/**
 * 已编译的工具集合（各 Provider 格式）
 */
interface CompiledTool {
  gemini: GeminiToolDefinition;
  openai: OpenAIToolDefinition;
  openrouter: OpenRouterToolDefinition;
  claude: OpenAIToolDefinition; // Claude via OpenAI 使用 OpenAI 格式
  geminiCompat: OpenAIToolDefinition; // Gemini via OpenAI 使用特殊格式
}

/**
 * 工具编译结果
 */
interface CompilationResult {
  success: boolean;
  toolCount: number;
  failedTools: string[];
  duration: number;
}

// =============================================================================
// Compiled Tool Registry
// =============================================================================

class CompiledToolRegistry {
  /** 已编译的工具映射 */
  private tools: Map<string, CompiledTool> = new Map();

  /** 是否已初始化 */
  private initialized = false;

  /** 初始化时间 */
  private initTime: number = 0;

  /**
   * 初始化 - 应用启动时调用
   *
   * 编译所有工具定义到各 Provider 格式
   */
  async initialize(): Promise<CompilationResult> {
    if (this.initialized) {
      return {
        success: true,
        toolCount: this.tools.size,
        failedTools: [],
        duration: 0,
      };
    }

    const startTime = performance.now();
    const failedTools: string[] = [];

    console.log("[ToolRegistry] Compiling tools for all providers...");

    for (const tool of ALL_DEFINED_TOOLS) {
      try {
        this.compileTool(tool.name, tool.description, tool.parameters);
      } catch (error) {
        console.error(
          `[ToolRegistry] Failed to compile tool: ${tool.name}`,
          error,
        );
        failedTools.push(tool.name);
      }
    }

    const duration = performance.now() - startTime;
    this.initialized = true;
    this.initTime = Date.now();

    console.log(
      `[ToolRegistry] Compiled ${this.tools.size} tools in ${duration.toFixed(1)}ms`,
    );

    if (failedTools.length > 0) {
      console.warn(
        `[ToolRegistry] Failed to compile ${failedTools.length} tools:`,
        failedTools,
      );
    }

    return {
      success: failedTools.length === 0,
      toolCount: this.tools.size,
      failedTools,
      duration,
    };
  }

  /**
   * 编译单个工具到所有 Provider 格式
   */
  private compileTool(
    name: string,
    description: string,
    parameters: ZodTypeAny,
  ): void {
    this.tools.set(name, {
      gemini: createGeminiTool(name, description, parameters),
      openai: createOpenAITool(name, description, parameters),
      openrouter: createOpenRouterTool(name, description, parameters),
      claude: createClaudeCompatibleTool(name, description, parameters),
      geminiCompat: createGeminiCompatibleTool(name, description, parameters),
    });
  }

  /**
   * 获取指定 Provider 的多个工具
   *
   * @param protocol Provider 协议
   * @param toolNames 工具名称列表
   * @param options 可选配置
   * @returns 已编译的工具数组
   */
  getTools(
    protocol: ProviderProtocol,
    toolNames: string[],
    options?: {
      /** 是否使用 Gemini 兼容模式 (通过 OpenAI 调用 Gemini) */
      geminiCompatibility?: boolean;
      /** 是否使用 Claude 兼容模式 (通过 OpenAI 调用 Claude) */
      claudeCompatibility?: boolean;
    },
  ): unknown[] {
    this.ensureInitialized();

    const result: unknown[] = [];

    for (const name of toolNames) {
      const compiled = this.tools.get(name);
      if (!compiled) {
        console.warn(`[ToolRegistry] Tool not found: ${name}`);
        continue;
      }

      // 根据 protocol 和 compatibility 选择正确的格式
      if (protocol === "openai" || protocol === "openrouter") {
        if (options?.geminiCompatibility) {
          result.push(compiled.geminiCompat);
        } else if (options?.claudeCompatibility) {
          result.push(compiled.claude);
        } else {
          result.push(
            protocol === "openai" ? compiled.openai : compiled.openrouter,
          );
        }
      } else if (protocol === "gemini") {
        result.push(compiled.gemini);
      } else if (protocol === "claude") {
        result.push(compiled.claude);
      }
    }

    return result;
  }

  /**
   * 获取单个工具
   *
   * @param protocol Provider 协议
   * @param toolName 工具名称
   * @param options 可选配置
   * @returns 已编译的工具，如果不存在则返回 undefined
   */
  getTool(
    protocol: ProviderProtocol,
    toolName: string,
    options?: {
      geminiCompatibility?: boolean;
      claudeCompatibility?: boolean;
    },
  ): unknown | undefined {
    const tools = this.getTools(protocol, [toolName], options);
    return tools.length > 0 ? tools[0] : undefined;
  }

  /**
   * 检查是否已初始化
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * 获取所有已编译的工具名称
   */
  getToolNames(): string[] {
    return Array.from(this.tools.keys());
  }

  /**
   * 获取工具数量
   */
  getToolCount(): number {
    return this.tools.size;
  }

  /**
   * 获取初始化统计信息
   */
  getStats(): {
    initialized: boolean;
    toolCount: number;
    initTime: number;
  } {
    return {
      initialized: this.initialized,
      toolCount: this.tools.size,
      initTime: this.initTime,
    };
  }

  /**
   * 确保已初始化
   */
  private ensureInitialized(): void {
    if (!this.initialized) {
      console.warn(
        "[ToolRegistry] Registry not initialized. Call initialize() first.",
      );
      // 同步初始化（阻塞）
      this.initializeSync();
    }
  }

  /**
   * 同步初始化（用于懒加载场景）
   */
  private initializeSync(): void {
    if (this.initialized) return;

    const startTime = performance.now();

    for (const tool of ALL_DEFINED_TOOLS) {
      try {
        this.compileTool(tool.name, tool.description, tool.parameters);
      } catch (error) {
        console.error(
          `[ToolRegistry] Failed to compile tool: ${tool.name}`,
          error,
        );
      }
    }

    this.initialized = true;
    this.initTime = Date.now();

    console.log(
      `[ToolRegistry] Sync initialized ${this.tools.size} tools in ${(performance.now() - startTime).toFixed(1)}ms`,
    );
  }
}

// =============================================================================
// Singleton Export
// =============================================================================

/**
 * 全局工具注册表实例
 *
 * 使用方式:
 * ```typescript
 * import { toolRegistry } from './compiledRegistry';
 *
 * // 应用启动时初始化
 * await toolRegistry.initialize();
 *
 * // 获取 Gemini 格式的工具
 * const geminiTools = toolRegistry.getTools('gemini', ['search_tool', 'finish_turn']);
 *
 * // 获取 OpenAI 格式的工具（Gemini 兼容模式）
 * const openaiTools = toolRegistry.getTools('openai', ['search_tool'], {
 *   geminiCompatibility: true,
 * });
 * ```
 */
export const toolRegistry = new CompiledToolRegistry();

// 导出类型
export type { CompiledTool, CompilationResult };
