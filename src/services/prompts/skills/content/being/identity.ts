/**
 * ============================================================================
 * Skill Content: Core Identity (The Being Dimension)
 * ============================================================================
 *
 * MIGRATED TO ATOMS
 * Reference: src/services/prompts/atoms/core/index.ts
 */

import type { SkillContext } from "../../types";
import {
  roleInstruction,
  identityEnforcement,
  type IdentityEnforcementInput,
} from "../../../atoms/core";

export function getRoleInstructionContent(_ctx: SkillContext): string {
  return roleInstruction();
}

export function getIdentityEnforcementContent(ctx: SkillContext): string {
  // Map SkillContext to IdentityEnforcementInput
  const input: IdentityEnforcementInput = {
    protagonist: ctx.protagonist,
    backgroundTemplate: ctx.backgroundTemplate,
  };
  return identityEnforcement(input);
}
