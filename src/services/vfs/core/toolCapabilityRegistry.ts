import { vfsToolRegistry } from "../tools/registry";
import type { VfsToolCapability } from "./types";

const toLegacyCapability = (toolName: string): VfsToolCapability => {
  const capability = vfsToolRegistry.getCapability(toolName as any);
  return {
    toolName,
    summary: capability.summary,
    readOnly: capability.readOnly,
    mayWriteClasses: [...capability.mayWriteClasses],
    needsElevationFor: [...capability.needsElevationFor],
    immutableZones: [...capability.immutableZones],
    toolsets: [...capability.toolsets],
    isFinishTool: capability.isFinishTool,
  };
};

export class VfsToolCapabilityRegistry {
  private readonly byName = new Map<string, VfsToolCapability>();

  constructor() {
    for (const entry of vfsToolRegistry.listCatalog()) {
      this.byName.set(entry.name, toLegacyCapability(entry.name));
    }
  }

  public get(toolName: string): VfsToolCapability | undefined {
    return this.byName.get(toolName);
  }

  public list(): VfsToolCapability[] {
    return Array.from(this.byName.values());
  }

  public listForToolset(
    toolset: "turn" | "playerRate" | "cleanup" | "summary" | "outline",
  ): VfsToolCapability[] {
    return this.list().filter((capability) =>
      capability.toolsets.includes(toolset),
    );
  }

  public listToolNamesForToolset(
    toolset: "turn" | "playerRate" | "cleanup" | "summary" | "outline",
  ): string[] {
    return this.listForToolset(toolset).map((capability) => capability.toolName);
  }

  public describeForPrompt(toolName: string): string {
    if (!vfsToolRegistry.has(toolName)) {
      return `- \`${toolName}\`: capability metadata missing.`;
    }
    return vfsToolRegistry.describeForPrompt(toolName as any);
  }
}

export const vfsToolCapabilityRegistry = new VfsToolCapabilityRegistry();
