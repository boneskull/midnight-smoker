/**
 * Utils for working with Zod schemas
 *
 * @packageDocumentation
 */
import {type WorkspaceInfoSchema} from '#schema/workspace-info';
import {camelCase, isObject, kebabCase, mapKeys} from 'lodash';
import {Range, SemVer} from 'semver';
import type {CamelCase, Class, KebabCase, PackageJson} from 'type-fest';
import {z} from 'zod';
import {castArray} from './util';

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
export const NonEmptyNonEmptyStringArraySchema =
  NonEmptyStringArraySchema.min(1);

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

/**
 * Schema _very_ roughly representing a `package.json` file.
 *
 * @see {@link PackageJson}
 */
export const PackageJsonSchema = z
  .custom<PackageJson>((val) => typeof val === 'object' && !Array.isArray(val))
  .describe('package.json contents');

/**
 * Schema representing an empty object
 */
export const EmptyObjectSchema = z.object({}).describe('Empty object');

/**
 * Schema representing a non-negative integer
 */
export const NonNegativeIntSchema = z
  .number()
  .int()
  .gte(0)
  .describe('Integer greater than or equal to 0');

/**
 * Returns a schema that tests if a value is an instance of a given class.
 *
 * @template E - The class type to check against.
 * @param ctor - The class constructor to check against.
 * @returns A custom zod validator function that checks if the value is an
 *   instance of the given class.
 * @todo Determine if this is something we should be in the business of doing at
 *   all
 */
export function instanceofSchema<E extends Class<any>>(ctor: E) {
  return z.custom<InstanceType<E>>((val) => val instanceof ctor);
}

/**
 * Wraps a Zod schema in type `T` and validates the schema against it.
 *
 * Caveats:
 *
 * - Does not support `ZodEffect` schemas.
 * - Does not ensure that `T` is assignable to `z.input<T>`
 *
 * @param schema - Any Zod schema
 * @returns A Zod schema which validates against type `T`
 * @todo Solve the above caveats, if possible
 */
export function customSchema<T>(schema?: z.ZodTypeAny) {
  if (schema) {
    return z.custom<T>((value) => schema.safeParse(value).success);
  }
  return z.custom<T>();
}

/**
 * Schema for a {@link AbortSignal}
 */
export const AbortSignalSchema =
  instanceofSchema(AbortSignal).describe('An AbortSignal');

/**
 * An object with keys transformed to camelCase.
 */
export type CamelCasedObject<T> = {
  [K in keyof T as K | CamelCase<K>]: T[K];
};

/**
 * An object with keys transformed to kebab-case.
 *
 * @template T - The original object type.
 */
export type KebabCasedObject<T> = {
  [K in keyof T as K | KebabCase<K>]: T[K];
};

/**
 * An object with keys transformed to dual casing (camel case and kebab case).
 *
 * @template T - The original object type.
 */
export type DualCasedObject<T> = CamelCasedObject<T> & KebabCasedObject<T>;

/**
 * Creates a new object with the same keys as `obj`, but with each key
 * duplicated both as camelCase and kebab-case.
 *
 * @param obj - Any object
 * @returns New object with probably more keys
 */
export function toDualCasedObject<T extends object>(
  obj: T,
): DualCasedObject<T> {
  return {
    ...(mapKeys(obj, (_, key) => camelCase(key)) as CamelCasedObject<T>),
    ...(mapKeys(obj, (_, key) => kebabCase(key)) as KebabCasedObject<T>),
  };
}

/**
 * Creates a new schema based on `schema` which aliases the object keys to both
 * camelCase and kebab-case.
 *
 * @param schema Probably a rule schema
 * @returns New schema
 */
export function dualCasedObjectSchema<T extends z.AnyZodObject>(schema: T) {
  return schema.extend(toDualCasedObject(schema.shape));
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
export function fancyObjectSchema<T extends z.AnyZodObject>(schema: T) {
  return z.preprocess(
    (value) => (isObject(value) ? {...value} : value),
    schema,
  );
}

/**
 * Creates a strict schema from one extending {@link WorkspaceInfoSchema} which
 * omits the `pkgJson` field.
 *
 * @param schema - A schema extending {@link WorkspaceInfoSchema}
 * @returns A new schema
 */
export function asResultSchema<T extends typeof WorkspaceInfoSchema>(
  schema: T,
) {
  return schema.omit({pkgJson: true}).strict();
}
