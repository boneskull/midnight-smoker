/**
 * Utils for working with Zod schemas
 *
 * @packageDocumentation
 */
import {toDualCasedObject} from '#util/common';
import {isObject} from '#util/guard/common';
import * as R from 'remeda';
import {Range} from 'semver';
import {type Class} from 'type-fest';
import {z} from 'zod';

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
 * Schema for a {@link Range SemVer Range} object
 */
export const SemVerRangeSchema = instanceofSchema(Range).describe(
  'SemVer Range instance',
);

/**
 * Creates a schema which accepts "fancy" objects (e.g., class instances) and
 * converts them into plain objects.
 *
 * Zod wants to operate on plain objects.
 *
 * It's not recommended to use {@link z.ZodType.parse} with this schema; use
 * {@link z.ZodType.safeParse} instead.
 *
 * @template T - A Zod object schema
 * @param schema - Zod object schema
 * @returns A new schema which preprocesses the input value
 */
export const asObjectSchema = <T extends z.AnyZodObject>(schema: T) =>
  z.preprocess(
    (value) =>
      R.isPlainObject(value) ? value : isObject(value) ? {...value} : value,
    schema,
  );

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
