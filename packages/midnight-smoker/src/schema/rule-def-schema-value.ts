import {type z} from 'zod';

/**
 * A schema for a rule's options; this is the {@link RuleDef.schema} prop as
 * defined by a plugin author.
 *
 * The schema must be a {@link z.ZodObject} and each member of the object's shape
 * must either be _optional_ or have a _default_ value.
 *
 * @see {@link https://zod.dev/?id=json-type}
 * @todo There are certain Zod types which we should disallow. The value must be
 *   expressible as JSON.
 *
 * @todo `opts` is disallowed as an option name; probably need a tsd test for it
 *
 * @todo The value of in the shape of the ZodObject needs to accept an input
 *   value of `undefined`.
 *
 * @todo Evaluate whether or not other, non-object types should be allowed as
 *   rule-specific options
 */
export type RuleDefSchemaValue<
  UnknownKeys extends z.UnknownKeysParam = z.UnknownKeysParam,
> = z.ZodObject<Omit<Record<string, z.ZodTypeAny>, 'opts'>, UnknownKeys>;
