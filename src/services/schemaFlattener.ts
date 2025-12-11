/**
 * ============================================================================
 * Schema Flattener - Flatten nested Zod schemas for AI generation
 * ============================================================================
 *
 * Some AI models struggle with deeply nested JSON structures.
 * This module provides utilities to:
 * 1. Flatten nested Zod schemas into a flat structure
 * 2. Unflatten AI responses back to the original nested structure
 *
 * Naming Convention:
 * - `name` → `Name`
 * - `visible.description` → `VDescription`
 * - `visible.sensory.texture` → `VSTexture`
 * - `visible.items[].name` → `VI[].Name` (arrays reset flattening)
 *
 * Nullability Inheritance:
 * - Parent nullable + child required → child becomes nullable
 */

import {
  z,
  ZodObject,
  ZodArray,
  ZodOptional,
  ZodNullable,
  ZodDefault,
  ZodEffects,
} from "zod";
import type { ZodTypeAny, ZodRawShape } from "zod";

// ============================================================================
// Prompt Field Name Conversion
// ============================================================================

/**
 * Convert a nested field path to its flattened name
 * e.g., "visible.description" -> "VDescription"
 * e.g., "hidden.truth" -> "HTruth"
 * e.g., "name" -> "Name"
 */
export function flattenFieldPath(path: string): string {
  const parts = path.split(".");
  if (parts.length === 1) {
    return capitalize(parts[0]);
  }
  // First part gets full capitalize, rest get first letter uppercase
  return parts
    .map((p, i) => (i === 0 ? capitalize(p.charAt(0)) : capitalize(p)))
    .join("");
}

// ============================================================================
// Types
// ============================================================================

/**
 * Mapping of flattened field name to original nested path
 */
export interface FieldMapping {
  flatName: string;
  originalPath: string[];
  isNullable: boolean;
  description?: string;
  schema: ZodTypeAny;
}

/**
 * Result of schema flattening
 */
export interface FlattenResult {
  flatSchema: ZodObject<ZodRawShape>;
  fieldMappings: FieldMapping[];
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get the first letter of a field name (uppercase)
 */
function getAbbreviation(name: string): string {
  return name.charAt(0).toUpperCase();
}

/**
 * Capitalize first letter
 */
function capitalize(name: string): string {
  return name.charAt(0).toUpperCase() + name.slice(1);
}

/**
 * Check if schema is nullable or optional
 */
function isNullableOrOptional(schema: ZodTypeAny): boolean {
  const typeName = schema._def.typeName;
  return (
    typeName === "ZodOptional" ||
    typeName === "ZodNullable" ||
    typeName === "ZodDefault"
  );
}

/**
 * Unwrap nullable/optional/default wrappers to get inner type
 */
function unwrapSchema(schema: ZodTypeAny): ZodTypeAny {
  let current = schema;
  let typeName = current._def.typeName;

  while (
    typeName === "ZodOptional" ||
    typeName === "ZodNullable" ||
    typeName === "ZodDefault" ||
    typeName === "ZodEffects"
  ) {
    if (typeName === "ZodOptional") {
      current = (current as ZodOptional<ZodTypeAny>)._def.innerType;
    } else if (typeName === "ZodNullable") {
      current = (current as ZodNullable<ZodTypeAny>)._def.innerType;
    } else if (typeName === "ZodDefault") {
      current = (current as ZodDefault<ZodTypeAny>)._def.innerType;
    } else if (typeName === "ZodEffects") {
      current = (current as ZodEffects<ZodTypeAny>)._def.schema;
    }
    typeName = current._def.typeName;
  }

  return current;
}

/**
 * Get description from schema
 */
function getDescription(schema: ZodTypeAny): string | undefined {
  return schema._def.description || schema.description;
}

// ============================================================================
// Schema Flattening
// ============================================================================

/**
 * Recursively collect field mappings from a schema
 */
function collectFields(
  schema: ZodTypeAny,
  path: string[],
  prefix: string,
  parentNullable: boolean,
  mappings: FieldMapping[],
): void {
  const unwrapped = unwrapSchema(schema);
  const isCurrentNullable = parentNullable || isNullableOrOptional(schema);
  const typeName = unwrapped._def.typeName;

  if (typeName === "ZodObject") {
    // Process object properties
    const shape = (unwrapped as ZodObject<ZodRawShape>)._def.shape();

    for (const [key, fieldSchema] of Object.entries(shape)) {
      // Logic to filter out internal system fields
      const INTERNAL_FIELDS = new Set([
        "id",
        "createdAt",
        "updatedAt",
        "modifiedAt",
        "lastAccess",
        "highlight",
      ]);

      const fieldZod = fieldSchema as ZodTypeAny;
      const desc = getDescription(fieldZod);

      // Skip if in blacklist or explicitly marked invisible
      if (INTERNAL_FIELDS.has(key) || (desc && desc.includes("INVISIBLE"))) {
        continue;
      }

      const fieldUnwrapped = unwrapSchema(fieldZod);
      const fieldTypeName = fieldUnwrapped._def.typeName;
      const newPath = [...path, key];
      let newPrefix: string;
      if (prefix === "") {
        if (fieldTypeName === "ZodObject") {
          newPrefix = getAbbreviation(key);
        } else {
          newPrefix = capitalize(key);
        }
      } else {
        newPrefix = prefix + capitalize(key);
      }

      if (fieldTypeName === "ZodObject") {
        // Nested object - continue flattening with abbreviation
        collectFields(
          fieldZod,
          newPath,
          newPrefix,
          isCurrentNullable || isNullableOrOptional(fieldZod),
          mappings,
        );
      } else if (fieldTypeName === "ZodArray") {
        // Array - reset flattening, process items separately
        const itemSchema = (fieldUnwrapped as ZodArray<ZodTypeAny>)._def.type;
        const itemUnwrapped = unwrapSchema(itemSchema);

        if (itemUnwrapped._def.typeName === "ZodObject") {
          // Array of objects - add the array field itself and process items
          // The array items will be processed with their own prefix
          const arrayFieldName = newPrefix;

          // Create a flattened item schema
          const itemMappings: FieldMapping[] = [];
          collectFields(
            itemSchema,
            [],
            "",
            isCurrentNullable || isNullableOrOptional(fieldZod),
            itemMappings,
          );

          // Create the flat item shape
          const flatItemShape: ZodRawShape = {};
          for (const m of itemMappings) {
            flatItemShape[m.flatName] = m.isNullable
              ? m.schema.nullish()
              : m.schema;
          }

          // Add array field with flattened item schema
          mappings.push({
            flatName: arrayFieldName,
            originalPath: newPath,
            isNullable: isCurrentNullable || isNullableOrOptional(fieldZod),
            description: getDescription(fieldZod),
            schema: z.array(z.object(flatItemShape)),
          });
        } else {
          // Array of primitives - keep as is
          mappings.push({
            flatName: newPrefix,
            originalPath: newPath,
            isNullable: isCurrentNullable || isNullableOrOptional(fieldZod),
            description: getDescription(fieldZod),
            schema: fieldUnwrapped,
          });
        }
      } else {
        // Primitive field - add directly with flat name
        mappings.push({
          flatName: newPrefix,
          originalPath: newPath,
          isNullable: isCurrentNullable || isNullableOrOptional(fieldZod),
          description: getDescription(fieldZod),
          schema: fieldUnwrapped,
        });
      }
    }
  }
}

/**
 * Flatten a Zod schema for AI generation
 *
 * @param schema - The Zod schema to flatten
 * @returns Flattened schema and field mappings for unflattening
 */
export function flattenZodSchema(schema: ZodTypeAny): FlattenResult {
  const mappings: FieldMapping[] = [];
  collectFields(schema, [], "", false, mappings);

  // Build flat schema shape
  const flatShape: ZodRawShape = {};
  for (const mapping of mappings) {
    let fieldSchema = mapping.schema;

    // Add description if available
    if (mapping.description) {
      fieldSchema = fieldSchema.describe(mapping.description);
    }

    // Apply nullability
    if (mapping.isNullable) {
      flatShape[mapping.flatName] = fieldSchema.nullish();
    } else {
      flatShape[mapping.flatName] = fieldSchema;
    }
  }

  return {
    flatSchema: z.object(flatShape),
    fieldMappings: mappings,
  };
}

// ============================================================================
// Result Unflattening
// ============================================================================

/**
 * Set a value at a nested path in an object
 */
function setNestedValue(obj: any, path: string[], value: any): void {
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
 * Unflatten array items
 */
function unflattenArrayItems(
  items: any[],
  itemMappings: FieldMapping[],
): any[] {
  return items.map((item) => {
    const nested: any = {};
    for (const mapping of itemMappings) {
      if (mapping.flatName in item) {
        setNestedValue(nested, mapping.originalPath, item[mapping.flatName]);
      }
    }
    return nested;
  });
}

/**
 * Unflatten AI response back to nested structure
 *
 * @param flatResult - The flat response from AI
 * @param fieldMappings - The field mappings from flattenZodSchema
 * @returns Nested structure matching original schema
 */
export function unflattenResult(
  flatResult: Record<string, unknown>,
  fieldMappings: FieldMapping[],
): Record<string, unknown> {
  const nested: Record<string, unknown> = {};

  for (const mapping of fieldMappings) {
    const flatName = mapping.flatName;

    // Check if this is an array field (ends with [])
    if (flatName.endsWith("[]")) {
      const baseName = flatName.slice(0, -2);
      // Find array value - could be at the flat name or base name
      const arrayValue = flatResult[flatName] ?? flatResult[baseName];

      if (Array.isArray(arrayValue)) {
        // Get mappings for array items
        // These are the mappings that were applied to array items during flattening
        // We need to find them by looking at the array item schema
        const itemMappings: FieldMapping[] = [];
        const itemSchema = unwrapSchema(mapping.schema);
        if (itemSchema._def.typeName === "ZodArray") {
          const itemType = (itemSchema as ZodArray<ZodTypeAny>)._def.type;
          collectFields(itemType, [], "", false, itemMappings);
        }

        if (itemMappings.length > 0) {
          setNestedValue(
            nested,
            mapping.originalPath,
            unflattenArrayItems(arrayValue, itemMappings),
          );
        } else {
          // Primitive array
          setNestedValue(nested, mapping.originalPath, arrayValue);
        }
      }
    } else if (flatName in flatResult) {
      setNestedValue(nested, mapping.originalPath, flatResult[flatName]);
    }
  }

  return nested;
}
