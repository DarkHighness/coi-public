export type ToolArgNormalizationMode = "safe" | "off";

export type ToolArgJsonType =
  | "object"
  | "array"
  | "string"
  | "integer"
  | "number"
  | "boolean"
  | "null";

export interface ToolArgPathSchemaMeta {
  expectedTypes: Set<ToolArgJsonType>;
  enumValues?: Array<string | number | boolean | null>;
  minItems?: number;
  maxItems?: number;
  arrayItemTypes?: Set<ToolArgJsonType>;
  arrayItemMayBeComplex?: boolean;
  stringStructuredUnion?: boolean;
}

export interface ToolArgSchemaIndex {
  byPath: Map<string, ToolArgPathSchemaMeta>;
}

export interface ToolArgCoercionRecord {
  path: string;
  issueCode: string;
  action: string;
  success: boolean;
  beforeType: string;
  afterType?: string;
  note?: string;
}

export interface ToolArgNormalizationResult {
  args: unknown;
  coercions: ToolArgCoercionRecord[];
  changed: boolean;
  rounds: number;
}
