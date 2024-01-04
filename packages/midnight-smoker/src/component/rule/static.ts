import {z} from 'zod';
import {zNonEmptyString, zPackageJson} from '../../schema-util';
import {zRuleSeverity} from './severity';

export const zStaticRuleContext = z
  .object({
    pkgJson: zPackageJson,
    pkgJsonPath: zNonEmptyString,
    installPath: zNonEmptyString,
    severity: zRuleSeverity,
  })
  .describe(
    'Static representation of a RuleContext, suitable for serialization',
  );

/**
 * The bits of a {@link RuleContext} suitable for serialization.
 *
 * @public
 */
export type StaticRuleContext = z.infer<typeof zStaticRuleContext>;

/**
 * The bits of a {@link RuleDef} suitable for passing the API edge
 */
export const zStaticRule = z
  .object({
    defaultSeverity: zRuleSeverity.optional(),
    description: z.string(),
    name: zNonEmptyString,
    url: zNonEmptyString.optional(),
  })
  .describe('Static representation of a Rule, suitable for serialization');

/**
 * Representation of a rule suitable for serialization into JSON.
 */
export type StaticRule = z.infer<typeof zStaticRule>;
