import { normalizeVfsPath } from "../utils";
import { resolveVfsPath } from "./pathResolver";
import { vfsResourceTemplateRegistry } from "./resourceTemplateRegistry";
import type { VfsPathClassification } from "./types";

interface VfsListRuleEntry {
  id: string;
  description: string;
  pattern: string;
  permissionClass: VfsPathClassification["permissionClass"];
  scope: VfsPathClassification["scope"];
  domain: VfsPathClassification["domain"];
  shape: VfsPathClassification["resourceShape"];
  criticality: VfsPathClassification["criticality"];
  retention: VfsPathClassification["retention"];
  allowedWriteOps: VfsPathClassification["allowedWriteOps"];
}

export interface VfsClassifyOptions {
  activeForkId?: number;
}

export class VfsPathRegistry {
  /**
   * Path classification is fully template-driven.
   * This registry projects `VfsResourceTemplateRegistry` into path-centric views.
   */
  public listRules(): VfsListRuleEntry[] {
    return vfsResourceTemplateRegistry
      .list()
      .flatMap((template) =>
        template.patterns.map((pattern) => ({
          id: template.id,
          description: template.description,
          pattern,
          permissionClass: template.permissionClass,
          scope: template.scope,
          domain: template.domain,
          shape: template.shape,
          criticality: template.criticality,
          retention: template.retention,
          allowedWriteOps: [...template.allowedWriteOps],
        })),
      );
  }

  /**
   * Single source of truth for path permission/scope metadata:
   * resolve path -> match resource template -> project classification.
   */
  public classify(path: string, options?: VfsClassifyOptions): VfsPathClassification {
    const resolved = resolveVfsPath(path, { activeForkId: options?.activeForkId });
    const template = vfsResourceTemplateRegistry.match(resolved.canonicalPath);

    return {
      path,
      normalizedPath: normalizeVfsPath(path),
      canonicalPath: resolved.canonicalPath,
      displayPath: resolved.displayPath,
      permissionClass: template.permissionClass,
      scope: template.scope,
      ruleId: template.id,
      templateId: template.id,
      description: template.description,
      domain: template.domain,
      resourceShape: template.shape,
      criticality: template.criticality,
      retention: template.retention,
      allowedWriteOps: [...template.allowedWriteOps],
      mountKind: resolved.mountKind,
    };
  }

  public isImmutableReadonly(path: string, options?: VfsClassifyOptions): boolean {
    return this.classify(path, options).permissionClass === "immutable_readonly";
  }

  public isShared(path: string, options?: VfsClassifyOptions): boolean {
    return this.classify(path, options).scope === "shared";
  }
}

export const vfsPathRegistry = new VfsPathRegistry();
export const stripCurrentPrefixFromVfsPath = (path: string): string =>
  resolveVfsPath(path).logicalPath;
