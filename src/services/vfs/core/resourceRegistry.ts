import { normalizeVfsPath } from "../utils";
import { resolveVfsPath } from "./pathResolver";
import { vfsResourceTemplateRegistry } from "./resourceTemplateRegistry";
import type {
  VfsPermissionClass,
  VfsResourceDescriptor,
  VfsResourceMatch,
  VfsScope,
} from "./types";

const toDescriptor = (
  template: ReturnType<typeof vfsResourceTemplateRegistry.match>,
): VfsResourceDescriptor => ({
  id: template.id,
  resourceType: template.domain,
  description: template.description,
  patterns: [...template.patterns],
  criticality: template.criticality,
  retention: template.retention,
  permissionClass: template.permissionClass,
  allowedWriteOps: [...template.allowedWriteOps],
  scope: template.scope,
  contentTypes: template.contentTypes ? [...template.contentTypes] : undefined,
});

export class VfsResourceRegistry {
  /**
   * Resource descriptors are derived from registered templates.
   * Avoid adding ad-hoc resource rules outside the template registry.
   */
  public list(): VfsResourceDescriptor[] {
    return vfsResourceTemplateRegistry
      .list()
      .map((template) => toDescriptor(template));
  }

  /**
   * Resource matching always resolves to canonical path first,
   * then binds to a single resource template.
   */
  public match(
    path: string,
    options?: { activeForkId?: number },
  ): VfsResourceMatch {
    const resolved = resolveVfsPath(path, {
      activeForkId: options?.activeForkId,
    });
    const template = vfsResourceTemplateRegistry.match(resolved.canonicalPath);

    return {
      descriptor: toDescriptor(template),
      template,
      path,
      normalizedPath: normalizeVfsPath(path),
      canonicalPath: resolved.canonicalPath,
      permissionClass:
        template.permissionClass ?? ("default_editable" as VfsPermissionClass),
      scope: template.scope ?? ("fork" as VfsScope),
      domain: template.domain,
      shape: template.shape,
      criticality: template.criticality,
      retention: template.retention,
      allowedWriteOps: [...template.allowedWriteOps],
    };
  }
}

export const vfsResourceRegistry = new VfsResourceRegistry();
