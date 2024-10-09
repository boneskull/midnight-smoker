import {instanceofSchema} from '#util/schema-util';
import {type JsonObject} from 'type-fest';
import {z} from 'zod';

/**
 * A schema for a rule's options; this is the {@link Rule.schema} prop as defined
 * by a plugin author.
 *
 * The schema _must_ be a {@link z.ZodObject}. Each value _should_ either have a
 * default value or be optional--required values will be treated as optional!
 *
 * The input type _must_ be a {@link JsonObject}, since configuration can live in
 * JSON files. The output type can be an object of whatever shape you like.
 *
 * @see {@link https://zod.dev/?id=json-type}
 *
 * @todo `opts` is disallowed as an option name; probably need a tsd test for it
 *
 * @todo Is it possible to allow _any_ output type?
 */
export type RuleSchemaValue = z.ZodObject<
  Omit<Record<string, z.ZodTypeAny>, 'opts'>,
  'strip',
  z.ZodTypeAny,
  Record<string, unknown>,
  JsonObject
>;

/**
 * _Rough_ schema for {@link RuleSchemaValue}
 *
 * At this point we start validating Zod objects with Zod, and maybe we should
 * take a long walk.
 *
 * @todo Ensure that we're checking `Catchall` and `UnknownKeys` somewhere or
 *   otherwise enforcing that we're looking at a {@link RuleSchemaValue}
 */
export const RuleSchemaValueSchema = instanceofSchema(z.ZodObject);
