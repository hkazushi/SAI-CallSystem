/**
 * HearingField[] → Vapi の Structured Output JSON Schema に変換する。
 *
 * Vapi は analysisPlan.structuredDataPlan.schema で通話要約を構造化抽出できる。
 * ここでは Chappie がデザインしたヒアリング項目を JSON Schema に落とす。
 *
 * 参考: https://docs.vapi.ai/assistants/structured-outputs
 */
import type { HearingField } from "./types";

type JsonSchemaProperty =
  | { type: "string"; description?: string }
  | { type: "number"; description?: string }
  | { type: "boolean"; description?: string }
  | { type: "string"; enum: string[]; description?: string };

export interface StructuredDataSchema {
  type: "object";
  properties: Record<string, JsonSchemaProperty>;
  required: string[];
}

export function buildStructuredSchema(fields: HearingField[]): StructuredDataSchema {
  const properties: Record<string, JsonSchemaProperty> = {};
  const required: string[] = [];

  for (const field of fields) {
    properties[field.key] = toProperty(field);
    if (field.required) required.push(field.key);
  }

  return { type: "object", properties, required };
}

function toProperty(field: HearingField): JsonSchemaProperty {
  switch (field.type) {
    case "string":
      return { type: "string", description: field.description };
    case "number":
      return { type: "number", description: field.description };
    case "boolean":
      return { type: "boolean", description: field.description };
    case "enum":
      if (!field.options || field.options.length === 0) {
        throw new Error(
          `HearingField "${field.key}" is type "enum" but has no options. At least one option is required.`,
        );
      }
      return {
        type: "string",
        enum: field.options,
        description: field.description,
      };
  }
}
