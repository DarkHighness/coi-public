import type { ZodTypeAny } from "zod";
import { zodToGeminiCompatibleSchema } from "../../../zodCompiler";
import type {
  ToolArgJsonType,
  ToolArgPathSchemaMeta,
  ToolArgSchemaIndex,
} from "./types";

const schemaIndexCache = new WeakMap<ZodTypeAny, ToolArgSchemaIndex>();

type SchemaNode = Record<string, unknown>;

const isSchemaNode = (value: unknown): value is SchemaNode =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isSchemaRecord = (
  value: unknown,
): value is Record<string, Record<string, unknown>> => {
  if (!isSchemaNode(value)) return false;
  return Object.values(value).every((entry) => isSchemaNode(entry));
};

const toPathKey = (path: readonly string[]): string => JSON.stringify(path);

const normalizeSchemaType = (raw: unknown): ToolArgJsonType | null => {
  if (typeof raw !== "string") return null;
  const normalized = raw.trim().toLowerCase();
  switch (normalized) {
    case "object":
    case "array":
    case "string":
    case "integer":
    case "number":
    case "boolean":
    case "null":
      return normalized;
    default:
      return null;
  }
};

const collectTypes = (node: SchemaNode): Set<ToolArgJsonType> => {
  const types = new Set<ToolArgJsonType>();

  const collectFromValue = (value: unknown): void => {
    const normalized = normalizeSchemaType(value);
    if (normalized) {
      types.add(normalized);
    }
  };

  const rawType = node.type;
  if (Array.isArray(rawType)) {
    rawType.forEach(collectFromValue);
  } else {
    collectFromValue(rawType);
  }

  if (node.nullable === true) {
    types.add("null");
  }

  if (Array.isArray(node.enum) && node.enum.length > 0) {
    for (const entry of node.enum) {
      if (entry === null) {
        types.add("null");
      } else if (typeof entry === "string") {
        types.add("string");
      } else if (typeof entry === "number") {
        types.add(Number.isInteger(entry) ? "integer" : "number");
      } else if (typeof entry === "boolean") {
        types.add("boolean");
      }
    }
  }

  if (Array.isArray(node.anyOf)) {
    for (const option of node.anyOf) {
      if (!isSchemaNode(option)) continue;
      for (const typeName of collectTypes(option)) {
        types.add(typeName);
      }
    }
  }

  return types;
};

const isEnumLiteral = (
  value: unknown,
): value is string | number | boolean | null =>
  value === null ||
  typeof value === "string" ||
  typeof value === "number" ||
  typeof value === "boolean";

const mergeEnumValues = (
  current: Array<string | number | boolean | null> | undefined,
  incoming: unknown[],
): Array<string | number | boolean | null> | undefined => {
  const next = [...(current ?? [])];
  for (const value of incoming) {
    if (!isEnumLiteral(value)) {
      continue;
    }
    if (!next.some((entry) => entry === value)) {
      next.push(value);
    }
  }
  return next.length > 0 ? next : undefined;
};

const ensurePathMeta = (
  index: ToolArgSchemaIndex,
  path: readonly string[],
): ToolArgPathSchemaMeta => {
  const key = toPathKey(path);
  const existing = index.byPath.get(key);
  if (existing) return existing;
  const created: ToolArgPathSchemaMeta = {
    expectedTypes: new Set<ToolArgJsonType>(),
  };
  index.byPath.set(key, created);
  return created;
};

const applyArrayItemHints = (
  meta: ToolArgPathSchemaMeta,
  itemNode: SchemaNode,
): void => {
  const itemTypes = collectTypes(itemNode);
  if (!meta.arrayItemTypes) {
    meta.arrayItemTypes = new Set<ToolArgJsonType>();
  }
  for (const typeName of itemTypes) {
    meta.arrayItemTypes.add(typeName);
  }

  if (itemTypes.size === 0) {
    meta.arrayItemMayBeComplex = true;
    return;
  }

  if (itemTypes.has("object") || itemTypes.has("array")) {
    meta.arrayItemMayBeComplex = true;
    return;
  }

  if (meta.arrayItemMayBeComplex !== true) {
    meta.arrayItemMayBeComplex = false;
  }
};

const walkSchema = (
  node: SchemaNode,
  path: string[],
  index: ToolArgSchemaIndex,
): void => {
  const meta = ensurePathMeta(index, path);
  for (const typeName of collectTypes(node)) {
    meta.expectedTypes.add(typeName);
  }

  if (Array.isArray(node.enum) && node.enum.length > 0) {
    meta.enumValues = mergeEnumValues(meta.enumValues, node.enum);
  }

  if (typeof node.minItems === "number" && Number.isFinite(node.minItems)) {
    const normalized = Math.max(0, Math.floor(node.minItems));
    meta.minItems =
      typeof meta.minItems === "number"
        ? Math.max(meta.minItems, normalized)
        : normalized;
  }

  if (typeof node.maxItems === "number" && Number.isFinite(node.maxItems)) {
    const normalized = Math.max(0, Math.floor(node.maxItems));
    meta.maxItems =
      typeof meta.maxItems === "number"
        ? Math.min(meta.maxItems, normalized)
        : normalized;
  }

  if (isSchemaNode(node.items)) {
    applyArrayItemHints(meta, node.items);
    walkSchema(node.items, [...path, "*"], index);
  }

  if (isSchemaRecord(node.properties)) {
    for (const [key, propertySchema] of Object.entries(node.properties)) {
      walkSchema(propertySchema, [...path, key], index);
    }
  }

  if (Array.isArray(node.anyOf)) {
    for (const option of node.anyOf) {
      if (!isSchemaNode(option)) continue;
      walkSchema(option, path, index);
    }
  }
};

const finalizeIndex = (index: ToolArgSchemaIndex): void => {
  for (const meta of index.byPath.values()) {
    const hasStructuredType =
      meta.expectedTypes.has("object") || meta.expectedTypes.has("array");
    meta.stringStructuredUnion =
      meta.expectedTypes.has("string") && hasStructuredType;

    if (meta.expectedTypes.has("array")) {
      if (!meta.arrayItemTypes || meta.arrayItemTypes.size === 0) {
        meta.arrayItemMayBeComplex = true;
      } else if (
        meta.arrayItemTypes.has("object") ||
        meta.arrayItemTypes.has("array")
      ) {
        meta.arrayItemMayBeComplex = true;
      } else if (meta.arrayItemMayBeComplex !== true) {
        meta.arrayItemMayBeComplex = false;
      }
    }
  }
};

const toSchemaLookupPath = (
  path: readonly (string | number)[],
  wildcardNumbers: boolean,
): string[] =>
  path.map((segment) => {
    if (wildcardNumbers && typeof segment === "number") {
      return "*";
    }
    return String(segment);
  });

export const getToolArgSchemaIndex = (
  schema: ZodTypeAny,
): ToolArgSchemaIndex => {
  const cached = schemaIndexCache.get(schema);
  if (cached) {
    return cached;
  }

  const compiled = zodToGeminiCompatibleSchema(schema);
  const index: ToolArgSchemaIndex = {
    byPath: new Map<string, ToolArgPathSchemaMeta>(),
  };

  if (isSchemaNode(compiled)) {
    walkSchema(compiled, [], index);
  }

  finalizeIndex(index);
  schemaIndexCache.set(schema, index);
  return index;
};

export const getToolArgPathMeta = (
  index: ToolArgSchemaIndex,
  path: readonly (string | number)[],
): ToolArgPathSchemaMeta | null => {
  for (let depth = path.length; depth >= 0; depth -= 1) {
    const scoped = path.slice(0, depth);
    const exact = index.byPath.get(
      toPathKey(toSchemaLookupPath(scoped, false)),
    );
    if (exact) return exact;

    const wildcard = index.byPath.get(
      toPathKey(toSchemaLookupPath(scoped, true)),
    );
    if (wildcard) return wildcard;
  }

  return null;
};
