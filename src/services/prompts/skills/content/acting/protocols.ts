/**
 * ============================================================================
 * Skill Content: Protocols (操作协议)
 * ============================================================================
 *
 * MIGRATED TO ATOMS
 * Reference: src/services/prompts/atoms/core/protocols.ts
 */

import type { SkillContext } from "../../types";
import {
  protocols,
  messageProtocolAtom,
  errorRecoveryAtom,
  toolMandateAtom,
  entityDisciplineAtom,
  terminologyAtom,
} from "../../../atoms/core/protocols";

/**
 * 获取消息解析协议
 */
export function getMessageProtocolContent(_ctx: SkillContext): string {
  return messageProtocolAtom();
}

/**
 * 获取错误恢复协议
 */
export function getErrorRecoveryContent(_ctx: SkillContext): string {
  return errorRecoveryAtom();
}

/**
 * 获取工具使用协议
 */
export function getToolProtocolContent(_ctx: SkillContext): string {
  return toolMandateAtom();
}

/**
 * 获取实体管理协议
 */
export function getEntityProtocolContent(_ctx: SkillContext): string {
  return entityDisciplineAtom();
}

/**
 * 获取术语消歧协议
 */
export function getTerminologyContent(_ctx: SkillContext): string {
  return terminologyAtom();
}

/**
 * 组合所有协议
 */
export function getProtocolsContent(ctx: SkillContext): string {
  return protocols({ isLiteMode: ctx.isLiteMode });
}

/**
 * 精简版协议
 * (protocols atom handles lite mode internally)
 */
export function getProtocolsLiteContent(ctx: SkillContext): string {
  return protocols({ isLiteMode: true });
}
