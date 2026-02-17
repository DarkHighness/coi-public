import type { JsonObject, JsonValue } from "../types";

const isJsonObject = (value: unknown): value is JsonObject =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export const toJsonValue = (value: unknown): JsonValue => {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value as JsonValue;
  }

  if (Array.isArray(value)) {
    return value.map((item) => toJsonValue(item));
  }

  if (isJsonObject(value)) {
    const result: JsonObject = {};
    for (const [key, child] of Object.entries(value)) {
      result[key] = toJsonValue(child);
    }
    return result;
  }

  return String(value);
};
