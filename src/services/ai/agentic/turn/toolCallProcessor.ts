/**
 * Tool Call Processor
 *
 * Handles processing of tool calls in the agentic loop.
 */

import type { GameResponse } from "../../../../types";
import type {
  ToolCallResult,
  ZodToolDefinition,
} from "../../../providers/types";
import type { UnifiedMessage } from "../../../messageTypes";
import type { GameDatabase } from "../../../gameDatabase";
import {
  findTools,
  SearchToolParams,
  ActivateSkillToolParams,
  ALL_DEFINED_TOOLS,
} from "../../../tools";
import { getToolInfo, formatZodError } from "../../../providers/utils";
import {
  dispatchToolCall,
  hasHandler,
  ToolContext,
} from "../../../tools/handlers";
import { getSkillRegistry } from "../../../prompts/skills/registry";
import { registerAllSkills } from "../../../prompts/skills/definitions";
import { createUserMessage } from "../../../messageTypes";
import type { LoopState } from "./loopInitializer";
import type { VfsSession } from "../../../vfs/vfsSession";

// ============================================================================
// Types
// ============================================================================

export interface ToolCallContext {
  loopState: LoopState;
  gameState: any;
  settings: any;
  clearerSearchTool?: boolean;
  /** Conversation history for injecting skill content */
  conversationHistory?: UnifiedMessage[];
  /** Session ID for skill registry */
  sessionId?: string;
  /** VFS session for file-based tools */
  vfsSession?: VfsSession;
}

export interface ProcessedToolCall {
  callId: string;
  name: string;
  args: Record<string, unknown>;
  output: unknown;
  isError: boolean;
  isTerminal: boolean;
  terminalData?: Record<string, unknown>;
}

// ============================================================================
// Search Tool Handler
// ============================================================================

export function handleSearchTool(
  args: SearchToolParams,
  ctx: ToolCallContext,
): { output: unknown; addedTools: string[]; blockedTools: string[] } {
  const { loopState } = ctx;
  const addedTools: string[] = [];
  const blockedTools: string[] = [];

  if (args.queries) {
    for (const q of args.queries) {
      const found = findTools(q.operation, q.entity);
      for (const tool of found) {
        // Block RAG tool if RAG is disabled
        if (tool.name === "rag_search" && !loopState.isRAGEnabled) {
          blockedTools.push(tool.name);
          continue;
        }

        if (!loopState.activeTools.some((t) => t.name === tool.name)) {
          loopState.activeTools.push(tool);
          addedTools.push(tool.name);
        }
      }
    }
  }

  const output = ctx.clearerSearchTool
    ? {
        success: true,
        message: `Loaded ${addedTools.length} tools:\n\n${
          addedTools
            .map((name) => {
              const tool = ALL_DEFINED_TOOLS.find((t) => t.name === name);
              return tool ? getToolInfo(tool as any) : name;
            })
            .join("\n\n") || "None (already active or not found)"
        }`,
        addedTools,
        blockedTools: blockedTools.length > 0 ? blockedTools : undefined,
      }
    : {
        success: true,
        message: `Loaded ${addedTools.length} tools: ${addedTools.join(", ") || "None"}`,
        addedTools,
        blockedTools: blockedTools.length > 0 ? blockedTools : undefined,
      };

  return { output, addedTools, blockedTools };
}

// ============================================================================
// Activate Skill Handler
// ============================================================================

export function handleActivateSkill(
  args: ActivateSkillToolParams,
  ctx: ToolCallContext,
): unknown {
  const { gameState, conversationHistory, sessionId } = ctx;
  const skillIds = args.skillIds || [];

  const loadedSkills: string[] = [];
  const alreadyLoaded: string[] = [];
  const notFound: string[] = [];

  // Ensure skills are registered
  registerAllSkills();
  const registry = getSkillRegistry();

  // Set session if available
  if (sessionId) {
    registry.setSession(sessionId);
  }

  // Build a minimal context for skill loading
  const skillCtx = {
    language: gameState?.language || "en",
    gameState,
  };

  for (const skillId of skillIds) {
    const skill = registry.get(skillId);
    if (!skill) {
      notFound.push(skillId);
      continue;
    }

    if (registry.isLoaded(skillId)) {
      alreadyLoaded.push(skillId);
      continue;
    }

    // Load the skill
    registry.loadSkill(skillId, skillCtx);
    loadedSkills.push(skillId);
  }

  // Build response message
  let responseMsg = "";
  if (loadedSkills.length > 0) {
    responseMsg += `✓ Activated skills: ${loadedSkills.join(", ")}\n`;
    responseMsg += `\nSkill content has been injected into your context. You now have enhanced capabilities for:\n`;
    for (const id of loadedSkills) {
      const skill = registry.get(id);
      if (skill) {
        responseMsg += `- [${id}] ${skill.name}: ${skill.description}\n`;
      }
    }

    // CRITICAL: Compose ONLY the newly loaded skills and inject as a separate message
    // This is separate from the tool response - it's a system message with the actual content
    if (conversationHistory) {
      const newSkillContents: string[] = [];
      for (const id of loadedSkills) {
        const content = registry.getLoadedContent(id);
        if (content) {
          newSkillContents.push(content);
        }
      }
      if (newSkillContents.length > 0) {
        conversationHistory.push(
          createUserMessage(
            `[SYSTEM: ACTIVATED SKILL CONTENT]\n${newSkillContents.join("\n\n")}`,
          ),
        );
      }
    }
  }
  if (alreadyLoaded.length > 0) {
    responseMsg += `\n○ Already active: ${alreadyLoaded.join(", ")}`;
  }
  if (notFound.length > 0) {
    responseMsg += `\n✗ Not found: ${notFound.join(", ")}. Check skill_manifest for available skill IDs.`;
  }

  return responseMsg.trim() || "No changes made.";
}

// ============================================================================
// Generic Tool Execution
// ============================================================================

/**
 * Validate tool arguments against Zod schema
 */
export function validateToolArgs(
  name: string,
  args: Record<string, unknown>,
): { valid: true } | { valid: false; error: unknown } {
  const toolDef = ALL_DEFINED_TOOLS.find((t) => t.name === name);
  if (!toolDef) {
    // No schema to validate against, allow execution
    return { valid: true };
  }

  // Use strict validation to reject extra fields
  const strictSchema = toolDef.parameters.strict();
  const validationResult = strictSchema.safeParse(args);

  if (validationResult.success) {
    return { valid: true };
  }

  // Categorize errors as missing vs extra fields
  const errors = validationResult.error.errors;
  const missingFields = errors
    .filter((e) => e.code === "invalid_type" && e.received === "undefined")
    .map((e) => e.path.join(".") || "(root)");
  const extraFields = errors
    .filter((e) => e.code === "unrecognized_keys")
    .flatMap((e: any) => e.keys || []);
  const otherErrors = errors.filter(
    (e) => e.code !== "invalid_type" && e.code !== "unrecognized_keys",
  );

  let errorMsg = `[VALIDATION_ERROR] Invalid parameters for "${name}".\n\n`;
  if (missingFields.length > 0) {
    errorMsg += `Missing required fields:\n${missingFields.map((f) => `- ${f}`).join("\n")}\n\n`;
  }
  if (extraFields.length > 0) {
    errorMsg += `Unexpected extra fields (not in schema):\n${extraFields.map((f: string) => `- ${f}`).join("\n")}\n\n`;
  }
  if (otherErrors.length > 0) {
    errorMsg += `Other validation errors:\n${otherErrors.map((e) => `- ${e.path.join(".") || "(root)"}: ${e.message}`).join("\n")}\n\n`;
  }
  errorMsg += `Please refer to the schema:\n${getToolInfo(toolDef as any)}`;

  return {
    valid: false,
    error: {
      success: false,
      error: errorMsg,
      code: "INVALID_PARAMS",
    },
  };
}

export function executeGenericTool(
  name: string,
  args: Record<string, unknown>,
  ctx: ToolCallContext,
): unknown {
  const { loopState, gameState, settings } = ctx;

  // Validate arguments before execution
  const validation = validateToolArgs(name, args);
  if (!validation.valid) {
    return (validation as { valid: false; error: unknown }).error;
  }

  if (hasHandler(name)) {
    const toolContext: ToolContext = {
      accumulatedResponse: loopState.accumulatedResponse,
      changedEntities: loopState.changedEntities,
      gameState,
      settings,
      vfsSession: ctx.vfsSession ?? loopState.vfsSession,
    };
    return dispatchToolCall(name, args, toolContext);
  }

  return { success: false, error: `Unknown tool: ${name}` };
}
