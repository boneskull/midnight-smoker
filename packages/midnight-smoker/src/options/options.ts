import {z} from 'zod';
import {zBaseRuleOptionsRecord} from '../component/rule/rule';
import {DEFAULT_COMPONENT_ID, DEFAULT_PACKAGE_MANAGER_SPEC} from '../constants';
import {
  zDefaultFalse,
  zDefaultTrue,
  zNonEmptyString,
  zNonEmptyStringOrArrayThereof,
} from '../schema-util';

/**
 * Properties of {@link SmokerOptions} in camelCase.
 */
const smokerOptionsShape = {
  /**
   * Add an extra package to the list of packages to be installed
   */
  add: zNonEmptyStringOrArrayThereof.describe(
    'Add an extra package to the list of packages to be installed',
  ),
  /**
   * Operate on all workspaces. The root workspace is omitted unless
   */
  all: zDefaultFalse.describe(
    'Operate on all workspaces. The root workspace is omitted unless `includeRoot` is `true`',
  ),
  /**
   * Fail on first script failure
   */
  bail: zDefaultFalse.describe('Fail on first script failure'),
  /**
   * If `false`, do not lint when running custom scripts
   */
  lint: zDefaultTrue.describe(
    'If `false`, do not lint when running custom scripts',
  ),
  /**
   * Component ID of Executor implementation
   */
  executor: zNonEmptyString
    .describe('Component ID of Executor implementation')
    .default(DEFAULT_COMPONENT_ID),
  /**
   * Operate on the root workspace. Only has an effect if `all` is `true`
   */
  includeRoot: zDefaultFalse.describe(
    'Operate on the root workspace. Only has an effect if `all` is `true`',
  ),
  /**
   * Output JSON only
   */
  json: zDefaultFalse.describe('Output JSON only'),
  /**
   * Do not delete temp directories after completion
   */
  linger: zDefaultFalse.describe(
    'Do not delete temp directories after completion',
  ),
  /**
   * If `true`, fail if a workspace is missing a script
   */
  loose: zDefaultFalse.describe(
    'If `true`, fail if a workspace is missing a script',
  ),
  /**
   * The package manager(s) to use
   */
  pkgManager: zNonEmptyStringOrArrayThereof
    .default(DEFAULT_PACKAGE_MANAGER_SPEC)
    .describe('Package manager(s) to use'),
  /**
   * The plugin(s) to load
   */
  plugin: zNonEmptyStringOrArrayThereof.describe('One or more plugins to load'),
  /**
   * The reporter(s) to use
   */
  reporter: zNonEmptyStringOrArrayThereof
    .describe('Component ID of Reporter implementation')
    .default(['console']),
  /**
   * The RuleRunners(s) to use
   */
  ruleRunner: zNonEmptyString
    .describe('Component ID of RuleRunner implementation')
    .default(DEFAULT_COMPONENT_ID),
  /**
   * Rule config
   */
  rules: zBaseRuleOptionsRecord.default({}),
  /**
   * Script(s) to run.
   */
  script: zNonEmptyStringOrArrayThereof.describe('Script(s) to run.'),
  /**
   * ScriptRunners(s) to use.
   */
  scriptRunner: zNonEmptyString
    .describe('Component ID of ScriptRunner implementation')
    .default(DEFAULT_COMPONENT_ID),
  /**
   * Verbose logging
   */
  verbose: zDefaultFalse.describe('Verbose logging'),
  /**
   * One or more workspaces to operate in
   */
  workspace: zNonEmptyStringOrArrayThereof.describe(
    'One or more workspaces to run scripts in',
  ),
};

/**
 * Schema representing all options for `midnight-smoker`, either passed thru the
 * CLI, config file, or API.
 */

export const zBaseSmokerOptions = z
  .object(smokerOptionsShape)
  // .extend(
  //   mapKeys(smokerOptionsShape, (_, key) => kebabCase(key)) as CamelCasedObject<
  //     typeof smokerOptionsShape
  //   >,
  // )
  .setKey('include-root', smokerOptionsShape.includeRoot)
  .setKey('script-runner', smokerOptionsShape.scriptRunner)
  .setKey('rule-runner', smokerOptionsShape.ruleRunner)
  .setKey('pkg-manager', smokerOptionsShape.pkgManager)
  .describe('midnight-smoker options schema');

/**
 * Options for `Smoker` as provided by a user
 */
export type RawSmokerOptions = z.input<typeof zBaseSmokerOptions>;

/**
 * Normalized options for `Smoker`.
 */
export type SmokerOptions = z.infer<typeof zBaseSmokerOptions>;
