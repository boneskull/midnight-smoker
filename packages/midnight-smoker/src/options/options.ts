import z from 'zod';
import {zBaseRuleOptionsRecord} from '../component/rule/rule';
import {DEFAULT_COMPONENT_ID, DEFAULT_PACKAGE_MANAGER_SPEC} from '../constants';
import {
  toDualCasedObject,
  zDefaultFalse,
  zDefaultTrue,
  zNonEmptyString,
  zNonEmptyStringOrArrayThereof,
} from '../schema-util';

/**
 * Schema representing all options for `midnight-smoker`, either passed thru the
 * CLI, config file, or API.
 */

export const zBaseSmokerOptions = z
  .object(
    toDualCasedObject({
      add: zNonEmptyStringOrArrayThereof.describe(
        'Add an extra package to the list of packages to be installed',
      ),
      all: zDefaultFalse.describe(
        'Operate on all workspaces. The root workspace is omitted unless `includeRoot` is `true`',
      ),
      bail: zDefaultFalse.describe('Fail on first script failure'),
      includeRoot: zDefaultFalse.describe(
        'Operate on the root workspace. Only has an effect if `all` is `true`',
      ),
      json: zDefaultFalse.describe('Output JSON only'),
      linger: zDefaultFalse.describe(
        'Do not delete temp directories after completion',
      ),
      verbose: zDefaultFalse.describe('Verbose logging'),
      workspace: zNonEmptyStringOrArrayThereof.describe(
        'One or more workspaces to run scripts in',
      ),
      pkgManager: zNonEmptyStringOrArrayThereof
        .default(DEFAULT_PACKAGE_MANAGER_SPEC)
        .describe('Package manager(s) to use'),
      script: zNonEmptyStringOrArrayThereof.describe(
        'Script(s) to run. Alias of `scripts`',
      ),
      scripts: zNonEmptyStringOrArrayThereof.describe(
        'Script(s) to run. Alias of `script`',
      ),
      loose: zDefaultFalse.describe(
        'If `true`, fail if a workspace is missing a script',
      ),
      checks: zDefaultTrue.describe('If `false`, run no builtin checks'),
      rules: zBaseRuleOptionsRecord.default({}),
      plugin: zNonEmptyStringOrArrayThereof.describe(
        'One or more plugins to load',
      ),
      executor: zNonEmptyString
        .describe('Component ID of Executor implementation')
        .default(DEFAULT_COMPONENT_ID),
      ruleRunner: zNonEmptyString
        .describe('Component ID of RuleRunner implementation')
        .default(DEFAULT_COMPONENT_ID),
      scriptRunner: zNonEmptyString
        .describe('Component ID of ScriptRunner implementation')
        .default(DEFAULT_COMPONENT_ID),
      reporter: zNonEmptyStringOrArrayThereof
        .describe('Component ID of Reporter implementation')
        .default(['console']),
    }),
  )
  .describe('midnight-smoker options schema');
/**
 * Options for `Smoker` as provided by a user
 */

export type RawSmokerOptions = z.input<typeof zBaseSmokerOptions>;
/**
 * Normalized options for `Smoker`.
 */

export type SmokerOptions = z.output<typeof zBaseSmokerOptions>;
