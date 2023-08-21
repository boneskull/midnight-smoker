import {z} from 'zod';
import noBannedFiles from './builtin/no-banned-files';
import noMissingEntryPoint from './builtin/no-missing-entry-point';
import noMissingExports from './builtin/no-missing-exports';
import noMissingPkgFiles from './builtin/no-missing-pkg-files';
import {RuleSeverities, RuleSeveritySchema} from './severity';

const BaseRuleConfigSchema = z.object({
  [noBannedFiles.name]: noBannedFiles.ruleSchema,
  [noMissingPkgFiles.name]: noMissingPkgFiles.ruleSchema,
  [noMissingEntryPoint.name]: noMissingEntryPoint.ruleSchema,
  [noMissingExports.name]: noMissingExports.ruleSchema,
});
export type RawRuleConfig = z.infer<typeof BaseRuleConfigSchema>;

export const RuleConfigSchema = BaseRuleConfigSchema.transform((val) => ({
  ...val,
  getEnabledRules: () =>
    new Set(
      Object.entries(val)
        .filter(([, severity]) => severity !== RuleSeverities.OFF)
        .map(([ruleName]) => ruleName as keyof RawRuleConfig),
    ),
  isRuleEnabled: (ruleName: string) => {
    const name = ruleName as keyof RawRuleConfig;
    return (
      name in BaseRuleConfigSchema.shape && val[name] !== RuleSeverities.OFF
    );
  },
}));

export type RuleConfig = z.infer<typeof RuleConfigSchema>;

export const DEFAULT_RULE_CONFIG = {
  [noMissingPkgFiles.name]: noMissingPkgFiles.defaultSeverity,
  [noBannedFiles.name]: noBannedFiles.defaultSeverity,
  [noMissingEntryPoint.name]: noMissingEntryPoint.defaultSeverity,
  [noMissingExports.name]: noMissingExports.defaultSeverity,
} as const satisfies RawRuleConfig;

export type RuleSeverity = z.infer<typeof RuleSeveritySchema>;
