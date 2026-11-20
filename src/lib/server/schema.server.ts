/** Tiny helpers for strict JSON schemas (object root, all required, no extra props). */
type S = Record<string, unknown>;
export const str = (description?: string): S => ({
  type: "string",
  ...(description ? { description } : {}),
});
export const nstr = (description?: string): S => ({
  type: ["string", "null"],
  ...(description ? { description } : {}),
});
export const num = (description?: string): S => ({
  type: "number",
  ...(description ? { description } : {}),
});
export const bool = (): S => ({ type: "boolean" });
export const arr = (items: S, description?: string): S => ({
  type: "array",
  items,
  ...(description ? { description } : {}),
});
export const narr = (items: S): S => ({ type: ["array", "null"], items });
export const enm = (values: string[]): S => ({ type: "string", enum: values });
export const obj = (properties: Record<string, S>): S => ({
  type: "object",
  properties,
  required: Object.keys(properties),
  additionalProperties: false,
});
