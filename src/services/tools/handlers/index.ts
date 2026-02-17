/**
 * V2 Tool Handler Entry
 *
 * Dispatches VFS tools through the centralized vfsToolDispatcher.
 */

import { vfsToolDispatcher } from "../../vfs/tools";
import type { ToolContext } from "../toolHandlerRegistry";

export function hasHandler(name: string): boolean {
  return vfsToolDispatcher.has(name);
}

export function dispatchToolCall(
  name: string,
  args: JsonObject,
  context: ToolContext,
): unknown | Promise<unknown> {
  return vfsToolDispatcher.dispatch(name, args, context);
}

export async function dispatchToolCallAsync(
  name: string,
  args: JsonObject,
  context: ToolContext,
): Promise<unknown> {
  return vfsToolDispatcher.dispatchAsync(name, args, context);
}

export type { ToolContext };
