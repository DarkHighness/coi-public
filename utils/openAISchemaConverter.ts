import { Schema, Type } from "@google/genai";

export const toOpenAIStrictSchema = (schema: Schema): any => {
  const convert = (s: Schema): any => {
    const typeMap: Record<string, string> = {
      [Type.OBJECT]: "object",
      [Type.ARRAY]: "array",
      [Type.STRING]: "string",
      [Type.NUMBER]: "number",
      [Type.INTEGER]: "integer",
      [Type.BOOLEAN]: "boolean",
    };

    const type = typeMap[s.type as string] || (s.type as string).toLowerCase();

    if (type === "object") {
      const properties: Record<string, any> = {};
      const required: string[] = [];

      if (s.properties) {
        for (const [key, value] of Object.entries(s.properties)) {
          properties[key] = convert(value);
          required.push(key); // Strict mode requires all properties to be required
        }
      }

      return {
        type: "object",
        properties,
        required,
        additionalProperties: false,
        description: s.description,
      };
    }

    if (type === "array") {
      return {
        type: "array",
        items: s.items ? convert(s.items) : undefined,
        description: s.description,
      };
    }

    // Primitive types
    const result: any = {
      type,
      description: s.description,
    };

    if (s.enum) {
      result.enum = s.enum;
    }

    return result;
  };

  return {
    name: "response",
    strict: true,
    schema: convert(schema),
  };
};
