/**
 * ============================================================================
 * Schema Flattener - 将嵌套 Schema 扁平化
 * ============================================================================
 *
 * 用于将嵌套的 Zod/JSON Schema 转换为扁平结构，同时提供反向转换功能
 * 适用于不支持嵌套 JSON Schema 的模型
 *
 * 命名规则：
 * - 父级字段取首字母大写
 * - 叶子节点取完整 PascalCase
 * - 例如: visible.name → VName, hidden.realMotives → HRealMotives
 */

import { z, ZodObject, ZodTypeAny, ZodOptional, ZodNullable, ZodArray } from "zod";

// ============================================================================
// Types
// ============================================================================

interface FlatFieldInfo {
  path: string[]; // Original path, e.g., ["visible", "name"]
  flatName: string; // Flattened name, e.g., "VName"
  schema: ZodTypeAny; // The leaf schema
  description?: string; // Original description
  isOptional: boolean;
  isNullable: boolean;
  // 数组元素的 fieldMap（仅用于数组类型，用于还原数组元素）
  elementFieldMap?: Map<string, FlatFieldInfo>;
}

interface FlatteningContext {
  fields: Map<string, FlatFieldInfo>; // flatName -> info
  usedNames: Set<string>; // Track used names for uniqueness
}

// ============================================================================
// Field Name Generation
// ============================================================================

/**
 * Convert a string to PascalCase
 */
function toPascalCase(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Generate abbreviated field name from path
 *
 * Rules:
 * - Single segment: PascalCase (e.g., "name" → "Name")
 * - Multiple segments: Parent initials + Leaf PascalCase
 *   - First parent: first letter uppercase
 *   - Middle parents: first letter uppercase
 *   - Last segment (leaf): full PascalCase
 *
 * Examples:
 * - ["name"] → "Name"
 * - ["visible", "name"] → "VName"
 * - ["visible", "sensory", "texture"] → "VSTexture"
 * - ["hidden", "realMotives"] → "HRealMotives"
 */
function generateFlatFieldName(path: string[]): string {
  if (path.length === 0) return "";
  if (path.length === 1) return toPascalCase(path[0]);

  // Build prefix from parent segments (all but last)
  let prefix = "";
  for (let i = 0; i < path.length - 1; i++) {
    prefix += path[i].charAt(0).toUpperCase();
  }

  // Add leaf name in PascalCase
  const leafName = path[path.length - 1];
  return prefix + toPascalCase(leafName);
}

/**
 * Ensure field name is unique within context
 * If collision detected, append parent info until unique
 */
function ensureUniqueName(
  baseName: string,
  path: string[],
  context: FlatteningContext
): string {
  let name = baseName;
  let suffix = 0;

  while (context.usedNames.has(name)) {
    suffix++;
    // Try adding more parent context
    if (suffix <= path.length - 1) {
      // Add more parent letters
      name = "";
      for (let i = 0; i < Math.min(suffix + 1, path.length - 1); i++) {
        name += toPascalCase(path[i].substring(0, suffix + 1));
      }
      name += toPascalCase(path[path.length - 1]);
    } else {
      // Fall back to numeric suffix
      name = baseName + suffix;
    }
  }

  context.usedNames.add(name);
  return name;
}

// ============================================================================
// Schema Analysis
// ============================================================================

/**
 * Check if a Zod type is an object schema
 */
function isZodObject(schema: ZodTypeAny): schema is ZodObject<any> {
  return schema._def.typeName === "ZodObject";
}

/**
 * Check if a Zod type is an array schema
 */
function isZodArray(schema: ZodTypeAny): schema is ZodArray<any> {
  return schema._def.typeName === "ZodArray";
}

/**
 * Unwrap optional/nullable and get the inner type
 */
function unwrapSchema(schema: ZodTypeAny): {
  inner: ZodTypeAny;
  isOptional: boolean;
  isNullable: boolean;
} {
  let current = schema;
  let isOptional = false;
  let isNullable = false;

  // Unwrap layers
  while (true) {
    const typeName = current._def.typeName;
    if (typeName === "ZodOptional") {
      isOptional = true;
      current = (current as ZodOptional<any>)._def.innerType;
    } else if (typeName === "ZodNullable") {
      isNullable = true;
      current = (current as ZodNullable<any>)._def.innerType;
    } else if (typeName === "ZodDefault") {
      current = current._def.innerType;
    } else {
      break;
    }
  }

  return { inner: current, isOptional, isNullable };
}

/**
 * Get description from a Zod schema
 */
function getDescription(schema: ZodTypeAny): string | undefined {
  return schema._def.description;
}

// ============================================================================
// Flattening Logic
// ============================================================================

/**
 * Recursively collect all leaf fields from a schema
 *
 * 注意：当遇到数组时，数组成为新的 root，其内部元素保持原有嵌套结构不被扁平化
 */
function collectFields(
  schema: ZodTypeAny,
  path: string[],
  context: FlatteningContext,
  parentOptional: boolean = false,
  parentNullable: boolean = false
): void {
  const { inner, isOptional, isNullable } = unwrapSchema(schema);
  const effectiveOptional = parentOptional || isOptional;
  const effectiveNullable = parentNullable || isNullable;

  if (isZodObject(inner)) {
    // Recurse into object properties
    const shape = inner.shape;
    for (const [key, value] of Object.entries(shape)) {
      collectFields(
        value as ZodTypeAny,
        [...path, key],
        context,
        effectiveOptional,
        effectiveNullable
      );
    }
  } else if (isZodArray(inner)) {
    // 数组成为新的 root - 但其内部元素的 schema 也需要被扁平化
    const baseName = generateFlatFieldName(path);
    const flatName = ensureUniqueName(baseName, path, context);

    // 获取数组元素的 schema
    const elementSchema = inner._def.type;
    const { inner: unwrappedElement } = unwrapSchema(elementSchema);

    // 如果元素是对象，递归扁平化它
    let flattenedArraySchema: ZodTypeAny;
    let elementFieldMap: Map<string, FlatFieldInfo> | undefined;

    if (isZodObject(unwrappedElement)) {
      // 递归扁平化元素 schema，并保存 fieldMap 用于还原
      const { flatSchema: flatElementSchema, fieldMap: elemFieldMap } = flattenZodSchema(unwrappedElement);
      elementFieldMap = elemFieldMap;
      // 重新包装为数组
      flattenedArraySchema = z.array(flatElementSchema);
      // 保持原有的 optional/nullable 包装
      if (isOptional) {
        flattenedArraySchema = flattenedArraySchema.optional();
      }
      if (isNullable) {
        flattenedArraySchema = flattenedArraySchema.nullable();
      }
    } else {
      // 元素不是对象，保持原样
      flattenedArraySchema = schema;
    }

    context.fields.set(flatName, {
      path,
      flatName,
      schema: flattenedArraySchema,
      description: getDescription(schema) || getDescription(inner),
      isOptional: effectiveOptional,
      isNullable: effectiveNullable,
      elementFieldMap, // 存储元素的 fieldMap 用于还原
    });
  } else {
    // Leaf field - add to context
    const baseName = generateFlatFieldName(path);
    const flatName = ensureUniqueName(baseName, path, context);

    context.fields.set(flatName, {
      path,
      flatName,
      schema: schema, // Keep original with optional/nullable wrappers
      description: getDescription(schema) || getDescription(inner),
      isOptional: effectiveOptional,
      isNullable: effectiveNullable,
    });
  }
}

/**
 * Flatten a Zod object schema into a flat structure
 *
 * @param schema The original nested Zod schema
 * @returns Object containing flat schema and field mapping
 */
export function flattenZodSchema(schema: ZodObject<any>): {
  flatSchema: ZodObject<any>;
  fieldMap: Map<string, FlatFieldInfo>;
} {
  const context: FlatteningContext = {
    fields: new Map(),
    usedNames: new Set(),
  };

  // Collect all fields recursively
  collectFields(schema, [], context, false, false);

  // Build the flat schema shape
  const flatShape: Record<string, ZodTypeAny> = {};

  for (const [flatName, info] of context.fields) {
    let fieldSchema = info.schema;

    // 只保留原始描述，不添加路径信息
    if (info.description) {
      fieldSchema = fieldSchema.describe(info.description);
    }
    flatShape[flatName] = fieldSchema;
  }

  return {
    flatSchema: z.object(flatShape),
    fieldMap: context.fields,
  };
}

// ============================================================================
// Unflattening Logic
// ============================================================================

/**
 * Set a value at a nested path in an object
 */
function setNestedValue(obj: any, path: string[], value: any): void {
  if (path.length === 0) return;

  let current = obj;
  for (let i = 0; i < path.length - 1; i++) {
    const key = path[i];
    if (!(key in current)) {
      current[key] = {};
    }
    current = current[key];
  }

  current[path[path.length - 1]] = value;
}

/**
 * Convert a flat response back to nested structure
 *
 * @param flatData The flat data from model response
 * @param fieldMap The field mapping from flattening
 * @returns Nested data matching original schema structure
 */
export function unflattenResponse(
  flatData: Record<string, any>,
  fieldMap: Map<string, FlatFieldInfo>
): Record<string, any> {
  const result: Record<string, any> = {};

  for (const [flatName, value] of Object.entries(flatData)) {
    const info = fieldMap.get(flatName);
    if (info) {
      // 检查是否是数组值，如果有 elementFieldMap 说明元素需要递归还原
      if (Array.isArray(value) && info.elementFieldMap) {
        // 递归还原每个数组元素
        const unflattenedArray = value.map((element: Record<string, any>) => {
          if (typeof element === 'object' && element !== null) {
            return unflattenResponse(element, info.elementFieldMap!);
          }
          return element;
        });

        setNestedValue(result, info.path, unflattenedArray);
        continue;
      }

      setNestedValue(result, info.path, value);
    } else {
      // Unknown field - keep at top level
      result[flatName] = value;
    }
  }

  return result;
}

// ============================================================================
// JSON Schema Flattening (for direct use with providers)
// ============================================================================

interface JSONSchemaProperty {
  type?: string | string[];
  description?: string;
  enum?: any[];
  items?: JSONSchemaProperty;
  properties?: Record<string, JSONSchemaProperty>;
  required?: string[];
  nullable?: boolean;
  [key: string]: any;
}

interface JSONSchema {
  type: string;
  properties?: Record<string, JSONSchemaProperty>;
  required?: string[];
  [key: string]: any;
}

/**
 * Recursively collect fields from JSON schema
 */
function collectJsonFields(
  prop: JSONSchemaProperty,
  path: string[],
  context: FlatteningContext,
  parentRequired: boolean = true
): void {
  // Handle nullable types
  const isNullable = prop.nullable === true ||
    (Array.isArray(prop.type) && prop.type.includes("null"));

  const effectiveType = Array.isArray(prop.type)
    ? prop.type.find(t => t !== "null")
    : prop.type;

  if (effectiveType === "object" && prop.properties) {
    // Recurse into object properties
    const requiredFields = new Set(prop.required || []);
    for (const [key, value] of Object.entries(prop.properties)) {
      collectJsonFields(
        value,
        [...path, key],
        context,
        parentRequired && requiredFields.has(key)
      );
    }
  } else if (effectiveType === "array") {
    // Keep arrays as-is
    const baseName = generateFlatFieldName(path);
    const flatName = ensureUniqueName(baseName, path, context);

    context.fields.set(flatName, {
      path,
      flatName,
      schema: z.any(), // Placeholder
      description: prop.description,
      isOptional: !parentRequired,
      isNullable,
    });
  } else {
    // Leaf field
    const baseName = generateFlatFieldName(path);
    const flatName = ensureUniqueName(baseName, path, context);

    context.fields.set(flatName, {
      path,
      flatName,
      schema: z.any(), // Placeholder
      description: prop.description,
      isOptional: !parentRequired,
      isNullable,
    });
  }
}

/**
 * Flatten a JSON schema object
 *
 * @param schema The original nested JSON schema
 * @returns Object containing flat schema and field mapping
 */
export function flattenJsonSchema(schema: JSONSchema): {
  flatSchema: JSONSchema;
  fieldMap: Map<string, FlatFieldInfo>;
} {
  const context: FlatteningContext = {
    fields: new Map(),
    usedNames: new Set(),
  };

  if (schema.properties) {
    const requiredFields = new Set(schema.required || []);
    for (const [key, value] of Object.entries(schema.properties)) {
      collectJsonFields(value, [key], context, requiredFields.has(key));
    }
  }

  // Build flat schema
  const flatProperties: Record<string, JSONSchemaProperty> = {};
  const flatRequired: string[] = [];

  for (const [flatName, info] of context.fields) {
    // Get the original property by traversing the path
    let prop = schema;
    for (const segment of info.path) {
      prop = (prop.properties?.[segment] || {}) as any;
    }

    // Clone and enhance the property
    const flatProp: JSONSchemaProperty = { ...prop };

    // Enhance description with original path
    const pathStr = info.path.join(".");
    flatProp.description = info.description
      ? `[${pathStr}] ${info.description}`
      : `[${pathStr}]`;

    flatProperties[flatName] = flatProp;

    if (!info.isOptional) {
      flatRequired.push(flatName);
    }
  }

  return {
    flatSchema: {
      type: "object",
      properties: flatProperties,
      required: flatRequired.length > 0 ? flatRequired : undefined,
    },
    fieldMap: context.fields,
  };
}

// ============================================================================
// Tool Schema Flattening
// ============================================================================

/**
 * Flatten tool parameters schema
 * Used for tool call definitions
 */
export function flattenToolSchema(schema: ZodObject<any>): {
  flatSchema: ZodObject<any>;
  fieldMap: Map<string, FlatFieldInfo>;
} {
  return flattenZodSchema(schema);
}

// ============================================================================
// Exports
// ============================================================================

export type { FlatFieldInfo, JSONSchema, JSONSchemaProperty };
