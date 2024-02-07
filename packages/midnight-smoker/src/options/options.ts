import {z} from 'zod';
import {BaseRuleOptionsRecordSchema} from '../component/schema/rule-options';
import {DEFAULT_COMPONENT_ID} from '../constants';
import {
  DefaultFalseSchema,
  DefaultTrueSchema,
  NonEmptyStringSchema,
  NonEmptyStringToArraySchema,
} from '../util/schema-util';

/**
 * Properties of {@link SmokerOptions} in camelCase.
 */
const smokerOptionsShape = {
  /**
   * Add an extra package to the list of packages to be installed
   */
  add: NonEmptyStringToArraySchema.describe(
    'Add an extra package to the list of packages to be installed',
  ),

  /**
   * Operate on all workspaces. The root workspace is omitted unless
   */
  all: DefaultFalseSchema.describe(
    'Operate on all workspaces. The root workspace is omitted unless `includeRoot` is `true`',
  ),

  /**
   * Fail on first script failure
   */
  bail: DefaultFalseSchema.describe('Fail on first script failure'),

  /**
   * If `false`, do not lint when running custom scripts
   */
  lint: DefaultTrueSchema.describe(
    'If `false`, do not lint when running custom scripts',
  ),

  /**
   * Component ID of Executor implementation
   */
  executor: NonEmptyStringSchema.describe(
    'Component ID of Executor implementation',
  ).default(DEFAULT_COMPONENT_ID),

  /**
   * Operate on the root workspace. Only has an effect if `all` is `true`
   */
  includeRoot: DefaultFalseSchema.describe(
    'Operate on the root workspace. Only has an effect if `all` is `true`',
  ),

  /**
   * Output JSON only
   */
  json: DefaultFalseSchema.describe('Output JSON only'),

  /**
   * Do not delete temp directories after completion
   */
  linger: DefaultFalseSchema.describe(
    'Do not delete temp directories after completion',
  ),

  /**
   * If `true`, fail if a workspace is missing a script
   */
  loose: DefaultFalseSchema.describe(
    'If `true`, fail if a workspace is missing a script',
  ),

  /**
   * The package manager(s) to use
   */
  pkgManager: NonEmptyStringToArraySchema.describe(
    'Package manager(s) to use (by id)',
  ),

  /**
   * The plugin(s) to load
   */
  plugin: NonEmptyStringToArraySchema.describe('One or more plugins to load'),

  /**
   * The reporter(s) to use
   */
  reporter: NonEmptyStringToArraySchema.describe(
    'Component ID of Reporter implementation',
  ).default(['console']),

  /**
   * The RuleRunners(s) to use
   */
  ruleRunner: NonEmptyStringSchema.describe(
    'Component ID of RuleRunner implementation',
  ).default(DEFAULT_COMPONENT_ID),

  /**
   * Rule config
   */
  rules: BaseRuleOptionsRecordSchema.default({}),

  /**
   * Script(s) to run.
   */
  script: NonEmptyStringToArraySchema.describe('Script(s) to run.'),

  /**
   * ScriptRunners(s) to use.
   */
  scriptRunner: NonEmptyStringSchema.describe(
    'Component ID of ScriptRunner implementation',
  ).default(DEFAULT_COMPONENT_ID),

  /**
   * Verbose logging
   */
  verbose: DefaultFalseSchema.describe('Verbose logging'),

  /**
   * One or more workspaces to operate in
   */
  workspace: NonEmptyStringToArraySchema.describe(
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
