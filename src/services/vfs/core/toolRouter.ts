import type { ZodToolDefinition } from "../../providers/types";
import {
  registerToolHandler,
  type ToolHandler,
} from "../../tools/toolHandlerRegistry";
import { vfsToolCapabilityRegistry } from "./toolCapabilityRegistry";

export class VfsToolRouter {
  public register<T extends ZodToolDefinition>(tool: T, handler: ToolHandler): void {
    const capability = vfsToolCapabilityRegistry.get(tool.name);
    if (!capability) {
      throw new Error(
        `Missing VFS tool capability registration for handler: ${tool.name}`,
      );
    }

    registerToolHandler(tool, handler);
  }
}

export const vfsToolRouter = new VfsToolRouter();
