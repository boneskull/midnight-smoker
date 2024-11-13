/**
 *
 *
 * @packageDocumentation
 */

import {type JsonArray, type JsonObject, type JsonValue} from 'type-fest';
import {z} from 'zod';

/**
 * Represents a valid JSON value.
 */
export const JsonValueSchema: z.ZodType<JsonValue> = z
  .union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.lazy(() => JsonObjectSchema),
    z.lazy(() => JsonArraySchema),
  ])
  .or(z.lazy(() => JsonArraySchema))
  .describe('A valid JSON value');

/**
 * Represents a Zod schema for a valid JSON array.
 */
export const JsonArraySchema: z.ZodType<JsonArray> = z
  .array(JsonValueSchema)
  .describe('A valid JSON array');

/**
 * Represents a Zod schema for a JSON object.
 */
export const JsonObjectSchema: z.ZodType<JsonObject> = z
  .record(JsonValueSchema)
  .describe('A valid JSON object');
