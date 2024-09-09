import {NonEmptyStringSchema} from '#util/schema-util';
import {z} from 'zod';

import {type RuleSeverity, RuleSeveritySchema} from './rule-severity.js';

/**
 * Representation of a rule suitable for serialization into JSON.
 *
 * All fields are user-facing
 */

export type StaticRule = {
  /**
   * The default severity of the rule.
   *
   * Defaults to `error`.
   */
  defaultSeverity?: RuleSeverity;

  /**
   * The description of the rule
   */
  description: string;

  /**
   * The name of the rule
   */
  name: string;

  /**
   * A URL referring to documentation for the rule
   */
  url?: string;
};

/**
 * The bits of a `Rule` suitable for passing the API edge
 */
export const StaticRuleSchema = z
  .strictObject({
    defaultSeverity: RuleSeveritySchema.optional(),
    description: NonEmptyStringSchema,
    name: NonEmptyStringSchema,
    url: NonEmptyStringSchema.optional(),
  })
  .describe('Static representation of a Rule, suitable for serialization');
