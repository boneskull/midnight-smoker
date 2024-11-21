import {castArray} from '#util/common';
import * as R from 'remeda';
import {z} from 'zod';

/**
 * An object containing string keys an unknown values
 */
export type AnyObject = Record<string, unknown>;

export type EmptyObject = Record<string, never>;

/**
 * Schema representing a non-empty string
 */
export const NonEmptyStringSchema = z
  .string()
  .min(1)
  .trim()
  .describe('A non-empty string');

/**
 * Schema representing a `boolean` which defaults to `false`
 */
export const DefaultFalseSchema = z
  .boolean()
  .default(false)
  .describe('A boolean defaulting to false');

/**
 * Schema representing a `boolean` which defaults to `true`
 */
export const DefaultTrueSchema = z
  .boolean()
  .default(true)
  .describe('A boolean defaulting to true');

/**
 * Array of non-empty strings
 */
export const NonEmptyStringArraySchema = z
  .array(NonEmptyStringSchema)
  .describe('An array of non-empty strings');

/**
 * Non-empty array of non-empty strings :)
 */
export const NonEmptyNonEmptyStringArraySchema = NonEmptyStringArraySchema.min(
  1,
).describe('Non-empty array of non-empty strings');

/**
 * Schema representing a non-negative integer
 */
export const NonNegativeIntSchema = z
  .number()
  .int()
  .gte(0)
  .describe('Integer greater than or equal to 0');

/**
 * Schema for `void | Promise<void>`.
 *
 * Useful for function schemas.
 */
export const VoidOrPromiseVoidSchema = z
  .void()
  .or(z.promise(z.void()))
  .describe('void or Promise<void>');

/**
 * Schema for {@link AnyObject}
 */
export const AnyObjectSchema: z.ZodType<AnyObject> = z
  .object({})
  .passthrough()
  .describe('Any object');

/**
 * Schema representing an empty object
 */
export const EmptyObjectSchema: z.ZodObject<
  EmptyObject,
  'strip',
  z.ZodTypeAny,
  EmptyObject
> = z.object({}).describe('Empty object');

/**
 * Schema representing a non-empty _string or array_ of non-empty strings, which
 * is then cast to an array. Yep
 */
export const NonEmptyStringToArraySchema = z
  .union([NonEmptyStringSchema, NonEmptyStringArraySchema])
  .default([])
  .transform(castArray)
  .pipe(NonEmptyStringArraySchema)
  .describe(
    'A non-empty string or array of non-empty strings, normalized to an array',
  );

export const UniqueNonEmptyStringToArraySchema =
  NonEmptyStringToArraySchema.transform(R.unique())
    .pipe(NonEmptyStringArraySchema)
    .describe(
      'A non-empty string or array of non-empty strings, normalized to an array with unique values',
    );
