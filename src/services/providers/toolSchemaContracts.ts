import type { OpenAISchema } from "../zodCompiler";

type SchemaNode = OpenAISchema & {
  anyOf?: unknown;
  nullable?: boolean;
};

export interface ToolSchemaContractOptions {
  forbidAnyOf?: boolean;
  forbidTypeArray?: boolean;
}

export interface ToolSchemaContractIssue {
  path: string;
  message: string;
}

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const joinPath = (base: string, segment: string): string =>
  base ? `${base}.${segment}` : segment;

const collectContractIssuesInternal = (
  node: unknown,
  path: string,
  options: ToolSchemaContractOptions,
  out: ToolSchemaContractIssue[],
): void => {
  if (!isPlainObject(node)) {
    return;
  }

  const schemaNode = node as SchemaNode;

  if (options.forbidAnyOf && Array.isArray(schemaNode.anyOf)) {
    out.push({
      path,
      message: "anyOf is not allowed in this schema profile",
    });
  }

  if (options.forbidTypeArray && Array.isArray(schemaNode.type)) {
    out.push({
      path,
      message: "array type unions are not allowed in this schema profile",
    });
  }

  const requiredRaw = schemaNode.required;
  const propertiesRaw = schemaNode.properties;
  const properties = isPlainObject(propertiesRaw) ? propertiesRaw : undefined;

  if (requiredRaw !== undefined) {
    if (!Array.isArray(requiredRaw)) {
      out.push({
        path: joinPath(path, "required"),
        message: "required must be an array of strings",
      });
    } else {
      const seen = new Set<string>();
      for (let index = 0; index < requiredRaw.length; index += 1) {
        const key = requiredRaw[index];
        if (typeof key !== "string" || key.length === 0) {
          out.push({
            path: joinPath(path, `required[${index}]`),
            message: "required entries must be non-empty strings",
          });
          continue;
        }
        if (seen.has(key)) {
          out.push({
            path: joinPath(path, "required"),
            message: `duplicate required key "${key}"`,
          });
        } else {
          seen.add(key);
        }

        if (
          !properties ||
          !Object.prototype.hasOwnProperty.call(properties, key)
        ) {
          out.push({
            path: joinPath(path, "required"),
            message: `required key "${key}" missing from properties`,
          });
        }
      }
    }
  }

  if (propertiesRaw !== undefined && !properties) {
    out.push({
      path: joinPath(path, "properties"),
      message: "properties must be an object",
    });
  }

  if (properties) {
    for (const [key, child] of Object.entries(properties)) {
      collectContractIssuesInternal(
        child,
        joinPath(path, `properties.${key}`),
        options,
        out,
      );
    }
  }

  if (schemaNode.items !== undefined) {
    collectContractIssuesInternal(
      schemaNode.items,
      joinPath(path, "items"),
      options,
      out,
    );
  }

  if (Array.isArray(schemaNode.anyOf)) {
    for (let index = 0; index < schemaNode.anyOf.length; index += 1) {
      collectContractIssuesInternal(
        schemaNode.anyOf[index],
        joinPath(path, `anyOf[${index}]`),
        options,
        out,
      );
    }
  }
};

export function collectToolSchemaContractIssues(
  schema: unknown,
  options: ToolSchemaContractOptions = {},
): ToolSchemaContractIssue[] {
  const issues: ToolSchemaContractIssue[] = [];
  collectContractIssuesInternal(schema, "$", options, issues);
  return issues;
}
