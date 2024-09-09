/**
 * Utils for working with Zod schemas
 *
 * @packageDocumentation
 */
import {isObject, uniq} from 'lodash';
import {Range, SemVer} from 'semver';
import {type Class} from 'type-fest';
import {z} from 'zod';

import {castArray, toDualCasedObject} from './util.js';

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
  NonEmptyStringToArraySchema.transform(uniq)
    .pipe(NonEmptyStringArraySchema)
    .describe(
      'A non-empty string or array of non-empty strings, normalized to an array with unique values',
    );

export type EmptyObject = Record<string, never>;

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
 * Schema representing a non-negative integer
 */
export const NonNegativeIntSchema = z
  .number()
  .int()
  .gte(0)
  .describe('Integer greater than or equal to 0');

/**
 * Creates a new schema based on `schema` which aliases the object keys to both
 * camelCase and kebab-case.
 *
 * @param schema Probably a rule schema
 * @returns New schema
 */
export function dualCasedObjectSchema<T extends z.AnyZodObject>(schema: T) {
  const description: string = schema.description
    ? `${schema.description} (with keys in camelCase and kebab-case)`
    : 'Object with keys in camelCase and kebab-case';
  return schema.extend(toDualCasedObject(schema.shape)).describe(description);
}

/**
 * Schema for a {@link SemVer} object
 */
export const SemVerSchema =
  instanceofSchema(SemVer).describe('SemVer instance');

/**
 * Schema for a {@link Range SemVer Range} object
 */
export const SemVerRangeSchema = instanceofSchema(Range).describe(
  'SemVer Range instance',
);

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
 * Creates a schema which accepts "fancy" objects (e.g., class instances) and
 * converts them into plain objects.
 *
 * Zod wants to operate on plain objects.
 *
 * @param schema - Any schema
 * @returns A new schema which preprocesses the input value
 */
export function asObjectSchema<T extends z.AnyZodObject>(schema: T) {
  return z.preprocess(
    (value) => (isObject(value) ? {...value} : value),
    schema,
  );
}

/**
 * Safe implementation of {@link z.instanceof}.
 *
 * @remarks
 * This is needed when we want to validate an object is an instance of some
 * class _but_ that object also has other properties (or we want to be more
 * strict about the known properties).
 *
 * For example, a custom `Error` with additional props: if we try to define the
 * schema directly (e.g. `z.instanceof(X).and(z.object({...}))`), `parse()` will
 * return a plain object instead of an `X` instance. And `parse()` **claims** to
 * return `X & {some: props}`!
 *
 * Another solution to this problem would be to simply avoid using `parse()`
 * entirely for such cases, but I don't trust future me to remember that.
 * @template T Class
 * @template U Additional schema
 * @param ctor Constructor
 * @param schema Optional schema
 * @returns A schema which validates an object is an instance of the specified
 *   class _and_ the optional schema, but returns the original instance
 */
export function instanceofSchema<T extends Class<any>, U extends z.ZodTypeAny>(
  ctor: T,
  schema: U,
): z.ZodType<
  InstanceType<T> & U['_output'],
  U['_def'],
  InstanceType<T> & U['_input']
>;

/**
 * Just wraps {@link z.instanceof}
 *
 * @template T Class
 * @param ctor Constructor
 */
export function instanceofSchema<T extends Class<any>>(
  ctor: T,
): z.ZodType<InstanceType<T>>;

export function instanceofSchema<T extends Class<any>, U extends z.ZodTypeAny>(
  ctor: T,
  schema?: U,
) {
  if (schema) {
    return z
      .instanceof(ctor)
      .refine((value) => schema.safeParse(value).success);
  }
  return z.instanceof(ctor);
}

export const AnyObjectSchema: z.ZodObject<
  Record<string, z.ZodTypeAny>,
  'passthrough'
> = z.object({}).passthrough().describe('Any object');

/**
 * Given a function schema returning a Promise schema, returns a union of the
 * original function schema and a new function schema returning the unwrapped
 * Promise schema.
 *
 * @param schema Zod function schema returning a Promise schema
 * @returns Union with awaited return type
 */
export function multiColorFnSchema<
  Args extends z.ZodTuple<any, any>,
  Return extends z.ZodTypeAny,
  T extends z.ZodFunction<Args, z.ZodPromise<Return>>,
>(schema: T): z.ZodUnion<[T, z.ZodFunction<Args, Return>]>;

/**
 * Given a function schema returning a non-Promise schema, returns a union of
 * the original function schema and a new function schema returning a Promise
 * schema.
 *
 * @param schema Zod function schema returning a non-Promise schema
 * @returns Union with Promise return type
 */
export function multiColorFnSchema<
  Args extends z.ZodTuple<any, any>,
  Return extends z.ZodTypeAny,
  T extends z.ZodFunction<Args, Return>,
>(schema: T): z.ZodUnion<[T, z.ZodFunction<Args, z.ZodPromise<Return>>]>;

export function multiColorFnSchema<
  Args extends z.ZodTuple<any>,
  Return extends z.ZodTypeAny,
  T extends
    | z.ZodFunction<Args, Return>
    | z.ZodFunction<Args, z.ZodPromise<Return>>,
>(schema: T) {
  const returnType = schema.returnType();

  if (returnType instanceof z.ZodPromise) {
    return schema.or(schema.returns(returnType.unwrap()));
  }
  return schema.or(schema.returns(z.promise(returnType)));
}
