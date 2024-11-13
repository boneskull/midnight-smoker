import {type RuleSchemaValue} from '#schema/rule-schema-value';
import memoize from 'nano-memoize';
import {type z} from 'zod';

/**
 * Digs around in a {@link RuleSchemaValue} for defaults.
 *
 * Caches result.
 */
export const getDefaultRuleOptions = memoize(
  <T extends RuleSchemaValue>(schema: T): z.infer<T> => {
    const emptyObjectResult = schema.safeParse({});
    return (
      emptyObjectResult.success ? emptyObjectResult.data : {}
    ) as z.infer<T>;
  },
);
