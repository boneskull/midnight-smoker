/**
 * Utils for working with Zod schemas
 *
 * @packageDocumentation
 */
import type {Many} from 'lodash';
import {
  castArray as _castArray,
  camelCase,
  compact,
  isFunction,
  isObject,
  kebabCase,
  mapKeys,
} from 'lodash';
import type {EventEmitter} from 'node:events';
import {Range, SemVer} from 'semver';
import type {CamelCase, Class, KebabCase, PackageJson} from 'type-fest';
import {z} from 'zod';

/**
 * Type guard for an object with a `toJSON` method.
 *
 * **This function is duplicated in `util.ts` on purpose.**
 *
 * @param value Any value
 * @returns - `true` if `value` is an object with a `toJSON` method
 */
function isSerializable<T>(value: T): value is T & {toJSON: () => unknown} {
  return isObject(value) && 'toJSON' in value && isFunction(value.toJSON);
}

/**
 * Casts a defined value to an array of non-`undefined` values.
 *
 * If `value` is `undefined`, returns an empty array. If `value` is an `Array`,
 * returns the compacted array. Otherwise, returns an array with `value` as the
 * only element.
 *
 * This differs from {@link _castArray _.castArray} in that it refuses to put
 * `undefined` values within the array.
 *
 * @param value Any value
 * @returns An array, for sure!
 */
export function castArray<T>(value?: Many<T>): T[] {
  return compact(_castArray(value));
}

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
 * Schema representing a non-empty string or array of non-empty strings, which
 * is then cast to an array
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
 * Returns a schema which transforms a schema such that if a schema's output is
 * an object, and that object has a `toJSON` method, call it.
 *
 * `midnight-smoker` has a convention where many classes implement a "static"
 * interface, and the `toJSON` method returns such a type. This type is used for
 * passing thru the module edge; e.g., via an `EventEmitter`.
 *
 * @param schema - The schema to use for serialization.
 * @returns The serialized object.
 */
export function serializeObject<T extends z.ZodTypeAny>(schema: T) {
  return schema
    .transform((val: unknown) =>
      isSerializable(val) ? (val.toJSON() as z.infer<T>) : val,
    )
    .pipe(schema);
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
export const AbortSignalSchema = instanceofSchema(AbortSignal);

/**
 * Rough schema for a {@link EventEmitter}-like object.
 *
 * This is not an `instanceof` check against Node.js' `EventEmitter` because
 * alternative implementations may be used.
 */
export const EventEmitterSchema = customSchema<EventEmitter>(
  z.object({on: z.function(), once: z.function(), emit: z.function()}),
);

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

export const SemVerSchema = instanceofSchema(SemVer);

export const SemVerRangeSchema = instanceofSchema(Range);
