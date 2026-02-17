type JsonPrimitive = string | number | boolean | null;
type JsonValue = JsonPrimitive | JsonObject | JsonArray;
type JsonArray = JsonValue[];

interface JsonObject {
  [key: string]: unknown;
}

interface ToolArguments extends JsonObject {}

interface I18nParams extends JsonObject {}
