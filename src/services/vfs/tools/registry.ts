import type { ZodToolDefinition } from "../../providers/types";
import { VFS_SEARCH_TOOL_NO_SEMANTIC, VFS_TOOL_CATALOG } from "./catalog";
import type {
  AnyVfsCatalogEntry,
  VfsToolCapabilityV2,
  VfsToolName,
  VfsToolset,
  VfsToolsetId,
} from "./types";

const OUTLINE_PHASES = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] as const;

const NON_OUTLINE_TOOLSETS: Exclude<VfsToolsetId, "outline">[] = [
  "turn",
  "playerRate",
  "cleanup",
  "summary",
];

const byOrder = (a: AnyVfsCatalogEntry, b: AnyVfsCatalogEntry, toolset: VfsToolsetId): number => {
  const aOrder = a.toolsetOrder[toolset] ?? Number.POSITIVE_INFINITY;
  const bOrder = b.toolsetOrder[toolset] ?? Number.POSITIVE_INFINITY;
  return aOrder - bOrder;
};

const toDefinition = (entry: AnyVfsCatalogEntry): ZodToolDefinition => ({
  name: entry.name,
  description: entry.description,
  parameters: entry.parameters,
});

export class VfsToolRegistry {
  private readonly catalog: AnyVfsCatalogEntry[];
  private readonly byName = new Map<VfsToolName, AnyVfsCatalogEntry>();

  constructor(catalog: AnyVfsCatalogEntry[] = VFS_TOOL_CATALOG) {
    this.catalog = [...catalog];
    for (const entry of this.catalog) {
      this.byName.set(entry.name, entry);
    }

    for (const toolset of NON_OUTLINE_TOOLSETS) {
      const finish = this.catalog.filter(
        (entry) =>
          entry.capability.toolsets.includes(toolset) &&
          entry.capability.isFinishTool === true,
      );
      if (finish.length !== 1) {
        throw new Error(
          `Toolset \"${toolset}\" must contain exactly one finish tool, got ${finish.length}`,
        );
      }
    }

    const outlineFinish = this.catalog.filter(
      (entry) =>
        entry.capability.toolsets.includes("outline") &&
        entry.capability.isFinishTool === true,
    );
    if (outlineFinish.length !== OUTLINE_PHASES.length) {
      throw new Error(
        `Toolset "outline" must contain ${OUTLINE_PHASES.length} phase finish tools, got ${outlineFinish.length}`,
      );
    }
  }

  public listCatalog(): AnyVfsCatalogEntry[] {
    return [...this.catalog];
  }

  public has(name: string): name is VfsToolName {
    return this.byName.has(name as VfsToolName);
  }

  public getCatalogEntry(name: VfsToolName): AnyVfsCatalogEntry {
    const entry = this.byName.get(name);
    if (!entry) {
      throw new Error(`Unknown VFS tool: ${name}`);
    }
    return entry;
  }

  public getCapability(name: VfsToolName): VfsToolCapabilityV2 {
    return this.getCatalogEntry(name).capability;
  }

  public getDefinition(
    name: VfsToolName,
    options?: { ragEnabled?: boolean },
  ): ZodToolDefinition {
    if (name === "vfs_search" && options?.ragEnabled === false) {
      return VFS_SEARCH_TOOL_NO_SEMANTIC;
    }

    return toDefinition(this.getCatalogEntry(name));
  }

  public getDefinitions(options?: { ragEnabled?: boolean }): ZodToolDefinition[] {
    return this.catalog.map((entry) => this.getDefinition(entry.name, options));
  }

  public getToolset(toolset: VfsToolsetId): VfsToolset {
    if (toolset === "outline") {
      const phaseZeroTools = this.getOutlineToolsetByPhase(0);
      return {
        tools: phaseZeroTools,
        finishToolName: this.getOutlineSubmitToolName(0),
      };
    }

    const tools = this.catalog
      .filter((entry) => entry.capability.toolsets.includes(toolset))
      .sort((a, b) => byOrder(a, b, toolset))
      .map((entry) => entry.name);

    const finish = this.catalog.find(
      (entry) =>
        entry.capability.toolsets.includes(toolset) &&
        entry.capability.isFinishTool === true,
    );

    if (!finish) {
      throw new Error(`Toolset \"${toolset}\" has no finish tool`);
    }

    return {
      tools,
      finishToolName: finish.name,
    };
  }

  private getOutlineToolsetByPhase(phase: number): VfsToolName[] {
    const submitTool = this.getOutlineSubmitToolName(phase);
    const readTools = this.catalog
      .filter(
        (entry) =>
          entry.capability.toolsets.includes("outline") &&
          entry.capability.readOnly,
      )
      .sort((a, b) => byOrder(a, b, "outline"))
      .map((entry) => entry.name);

    return [...readTools, submitTool];
  }

  public getOutlineSubmitToolName(phase: number): VfsToolName {
    if (!Number.isInteger(phase) || phase < 0 || phase > 9) {
      throw new Error(`Outline phase must be integer in [0..9], got ${phase}`);
    }
    return `vfs_finish_outline_phase_${phase}` as VfsToolName;
  }

  public getOutlineSubmitTool(
    phase: number,
    options?: { ragEnabled?: boolean },
  ): ZodToolDefinition {
    return this.getDefinition(this.getOutlineSubmitToolName(phase), options);
  }

  public getOutlineToolsForPhase(
    phase: number,
    options?: { ragEnabled?: boolean },
  ): ZodToolDefinition[] {
    return this.getOutlineToolsetByPhase(phase).map((name) =>
      this.getDefinition(name, options),
    );
  }

  public getDefinitionsForToolset(
    toolset: VfsToolsetId,
    options?: { ragEnabled?: boolean },
  ): ZodToolDefinition[] {
    if (toolset === "outline") {
      return this.getOutlineToolsForPhase(0, options);
    }
    const toolsetInfo = this.getToolset(toolset);
    return toolsetInfo.tools.map((name) => this.getDefinition(name, options));
  }

  public formatToolsForPrompt(toolset: VfsToolsetId): string {
    return this.getToolset(toolset).tools.map((name) => `- \`${name}\``).join("\n");
  }

  public describeForPrompt(name: VfsToolName): string {
    const capability = this.getCapability(name);
    const clauses: string[] = [];

    if (capability.readOnly) {
      clauses.push("read-only");
    } else {
      clauses.push(`writes: ${capability.mayWriteClasses.join(", ")}`);
      clauses.push("resource-template operation contracts enforced");
    }

    if (capability.needsElevationFor.includes("elevated_editable")) {
      clauses.push(
        "elevated_editable requires one-time user-confirmed token in /god or /sudo",
      );
    }

    if (capability.isFinishTool) {
      clauses.push("finish protocol tool");
    } else if (capability.mayWriteClasses.includes("finish_guarded")) {
      clauses.push("finish_guarded writable only via commit/finish protocol");
    }

    if (capability.immutableZones.length > 0) {
      clauses.push(`immutable: ${capability.immutableZones.join(", ")}`);
    }

    return `- \`${name}\`: ${capability.summary} (${clauses.join("; ")})`;
  }

  public formatCapabilitiesForPrompt(toolset: VfsToolsetId): string {
    return this.getToolset(toolset).tools.map((name) => this.describeForPrompt(name)).join("\n");
  }
}

export const vfsToolRegistry = new VfsToolRegistry();
