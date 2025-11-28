import type { ProviderProtocol, ProviderInstance } from "../../types";

/**
 * Provider 预设模板定义
 * 包含常用 AI Provider 的默认配置
 */
export interface ProviderTemplate {
  name: string; // 显示名称
  protocol: ProviderProtocol; // 协议类型
  baseUrl: string; // 默认 API 地址
  description?: string; // 简短描述
}

/**
 * Provider 预设模板集合
 * 用于快速创建常用的 AI Provider 实例
 */
export const PROVIDER_TEMPLATES = {
  gemini: {
    name: "Google Gemini",
    protocol: "gemini" as const,
    baseUrl: "https://generativelanguage.googleapis.com",
    description:
      "Google's Gemini AI models with native function calling support",
  },
  openai: {
    name: "OpenAI",
    protocol: "openai" as const,
    baseUrl: "https://api.openai.com/v1",
    description: "OpenAI's GPT models (GPT-4, GPT-3.5, etc.)",
  },
  deepseek: {
    name: "DeepSeek",
    protocol: "openai" as const,
    baseUrl: "https://api.deepseek.com/v1",
    description: "DeepSeek AI models with OpenAI-compatible API",
  },
  openrouter: {
    name: "OpenRouter",
    protocol: "openrouter" as const,
    baseUrl: "https://openrouter.ai/api/v1",
    description:
      "Unified gateway to multiple AI models (GPT-4, Claude, Gemini, etc.)",
  },
  claude: {
    name: "Anthropic Claude",
    protocol: "claude" as const,
    baseUrl: "https://api.anthropic.com/v1",
    description:
      "Anthropic's Claude models with advanced reasoning capabilities",
  },
} as const;

/**
 * Provider 模板键类型
 */
export type ProviderTemplateKey = keyof typeof PROVIDER_TEMPLATES;

/**
 * 从模板创建 Provider 实例
 * @param templateKey - 模板键名
 * @param apiKey - API 密钥
 * @param nextId - 下一个可用的 ID 编号
 * @param customName - 自定义名称（可选，默认使用模板名称）
 * @returns 新的 ProviderInstance 对象
 */
export function createProviderFromTemplate(
  templateKey: ProviderTemplateKey,
  apiKey: string,
  nextId: number,
  customName?: string,
): ProviderInstance {
  const template = PROVIDER_TEMPLATES[templateKey];
  const now = Date.now();

  return {
    id: `provider-${nextId}`,
    name: customName || template.name,
    protocol: template.protocol,
    baseUrl: template.baseUrl,
    apiKey,
    enabled: true,
    createdAt: now,
    lastModified: now,
  };
}

/**
 * 获取所有可用的模板键
 * @returns 模板键数组
 */
export function getTemplateKeys(): ProviderTemplateKey[] {
  return Object.keys(PROVIDER_TEMPLATES) as ProviderTemplateKey[];
}

/**
 * 获取模板信息（不包含敏感信息）
 * @param templateKey - 模板键名
 * @returns 模板信息对象
 */
export function getTemplateInfo(
  templateKey: ProviderTemplateKey,
): ProviderTemplate {
  return PROVIDER_TEMPLATES[templateKey];
}

/**
 * 检查 baseUrl 是否匹配某个已知模板
 * @param baseUrl - 要检查的 baseUrl
 * @returns 匹配的模板键，如果没有匹配则返回 null
 */
export function detectTemplateFromUrl(
  baseUrl: string,
): ProviderTemplateKey | null {
  const normalizedUrl = baseUrl.toLowerCase().trim();

  for (const [key, template] of Object.entries(PROVIDER_TEMPLATES)) {
    if (normalizedUrl.includes(template.baseUrl.toLowerCase())) {
      return key as ProviderTemplateKey;
    }
  }

  return null;
}
