import type { VfsToolCapability } from "./types";

const IMMUTABLE_ZONES = [
  "shared/system/skills/**",
  "shared/system/refs/**",
  "skills/**",
  "refs/**",
];

const CAPABILITIES: VfsToolCapability[] = [
  {
    toolName: "vfs_ls",
    summary:
      "List VFS entries (plain list, glob pattern matching, optional stat metadata).",
    readOnly: true,
    mayWriteClasses: [],
    needsElevationFor: [],
    immutableZones: IMMUTABLE_ZONES,
    toolsets: ["turn", "cleanup", "summary", "outline"],
  },
  {
    toolName: "vfs_schema",
    summary: "Inspect JSON schema hints for paths.",
    readOnly: true,
    mayWriteClasses: [],
    needsElevationFor: [],
    immutableZones: IMMUTABLE_ZONES,
    toolsets: ["turn", "cleanup", "summary", "outline"],
  },
  {
    toolName: "vfs_read",
    summary: "Read one file by chars, lines, or JSON pointers.",
    readOnly: true,
    mayWriteClasses: [],
    needsElevationFor: [],
    immutableZones: IMMUTABLE_ZONES,
    toolsets: ["turn", "cleanup", "summary", "outline"],
  },
  {
    toolName: "vfs_search",
    summary: "Search content (text/fuzzy/regex/semantic).",
    readOnly: true,
    mayWriteClasses: [],
    needsElevationFor: [],
    immutableZones: IMMUTABLE_ZONES,
    toolsets: ["turn", "cleanup", "summary", "outline"],
  },
  {
    toolName: "vfs_write",
    summary:
      "Apply write/update operations atomically (write_file/append_text/edit_lines/patch_json/merge_json).",
    readOnly: false,
    mayWriteClasses: ["default_editable", "elevated_editable"],
    needsElevationFor: ["elevated_editable"],
    immutableZones: IMMUTABLE_ZONES,
    toolsets: ["turn", "cleanup"],
  },
  {
    toolName: "vfs_move",
    summary: "Move/rename files atomically.",
    readOnly: false,
    mayWriteClasses: ["default_editable", "elevated_editable"],
    needsElevationFor: ["elevated_editable"],
    immutableZones: IMMUTABLE_ZONES,
    toolsets: ["turn", "cleanup"],
  },
  {
    toolName: "vfs_delete",
    summary: "Delete files atomically.",
    readOnly: false,
    mayWriteClasses: ["default_editable", "elevated_editable"],
    needsElevationFor: ["elevated_editable"],
    immutableZones: IMMUTABLE_ZONES,
    toolsets: ["turn", "cleanup"],
  },
  {
    toolName: "vfs_commit_turn",
    summary: "Commit a conversation turn via finish protocol.",
    readOnly: false,
    mayWriteClasses: ["finish_guarded", "default_editable"],
    needsElevationFor: [],
    immutableZones: IMMUTABLE_ZONES,
    toolsets: ["turn", "cleanup"],
    isFinishTool: true,
  },
  {
    toolName: "vfs_commit_summary",
    summary: "Append summary state via finish protocol.",
    readOnly: false,
    mayWriteClasses: ["finish_guarded"],
    needsElevationFor: [],
    immutableZones: IMMUTABLE_ZONES,
    toolsets: ["summary"],
    isFinishTool: true,
  },
];

for (let phase = 0; phase <= 9; phase += 1) {
  CAPABILITIES.push({
    toolName: `vfs_commit_outline_phase_${phase}`,
    summary: `Validate and write outline phase ${phase}.`,
    readOnly: false,
    mayWriteClasses: ["elevated_editable"],
    needsElevationFor: ["elevated_editable"],
    immutableZones: IMMUTABLE_ZONES,
    toolsets: ["outline"],
  });
}

export class VfsToolCapabilityRegistry {
  private readonly byName = new Map<string, VfsToolCapability>();

  constructor(capabilities: VfsToolCapability[] = CAPABILITIES) {
    for (const capability of capabilities) {
      this.byName.set(capability.toolName, capability);
    }
  }

  public get(toolName: string): VfsToolCapability | undefined {
    return this.byName.get(toolName);
  }

  /**
   * Capability registry is the single source for tool permission prose.
   * Prompts/tool schema descriptions should be generated from this registry,
   * not hand-maintained in scattered prompt files.
   */
  public list(): VfsToolCapability[] {
    return Array.from(this.byName.values());
  }

  public listForToolset(
    toolset: "turn" | "cleanup" | "summary" | "outline",
  ): VfsToolCapability[] {
    return this.list().filter((capability) => capability.toolsets.includes(toolset));
  }

  public listToolNamesForToolset(
    toolset: "turn" | "cleanup" | "summary" | "outline",
  ): string[] {
    return this.listForToolset(toolset).map((capability) => capability.toolName);
  }

  public describeForPrompt(toolName: string): string {
    const capability = this.get(toolName);
    if (!capability) {
      return `- \`${toolName}\`: capability metadata missing.`;
    }

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

    return `- \`${toolName}\`: ${capability.summary} (${clauses.join("; ")})`;
  }
}

export const vfsToolCapabilityRegistry = new VfsToolCapabilityRegistry();
