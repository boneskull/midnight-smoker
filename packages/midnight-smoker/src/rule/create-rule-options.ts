import {type RuleDefSchemaValue} from '#schema/rule-options';
import {memoize} from 'lodash';
import {type z} from 'zod';

/**
 * Digs around in a {@link z.ZodRawShape} for defaults.
 *
 * Caches result.
 *
 * @internal
 */
export const getDefaultRuleOptions = memoize(
  <T extends RuleDefSchemaValue>(schema: T) => {
    const emptyObjectResult = schema.safeParse({});
    return (
      emptyObjectResult.success ? emptyObjectResult.data : {}
    ) as z.infer<T>;
  },
);
getDefaultRuleOptions.cache = new WeakMap();
