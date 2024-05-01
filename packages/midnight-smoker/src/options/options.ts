import {DEFAULT_COMPONENT_ID} from '#constants';
import {BaseRuleOptionsRecordSchema} from '#schema/rule-options';
import {
  DefaultFalseSchema,
  DefaultTrueSchema,
  NonEmptyStringSchema,
  NonEmptyStringToArraySchema,
} from '#util/schema-util';
import {z} from 'zod';

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

  cwd: NonEmptyStringSchema.describe('Path to workspace root').default(
    process.cwd(),
  ),

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

  // /**
  //  * Operate on the root workspace. Only has an effect if `all` is `true`
  //  */
  // includeRoot: DefaultFalseSchema.describe(
  //   'Operate on the root workspace. Only has an effect if `all` is `true`',
  // ),

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
   * Rule config
   */
  rules: BaseRuleOptionsRecordSchema.default({}),

  /**
   * Script(s) to run.
   */
  script: NonEmptyStringToArraySchema.describe('Script(s) to run.'),

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

export const BaseSmokerOptionsSchema = z
  .object(smokerOptionsShape)
  .extend({
    // 'include-root': smokerOptionsShape.includeRoot,
    'pkg-manager': smokerOptionsShape.pkgManager,
  })
  .describe('midnight-smoker options schema');

/**
 * Options for `Smoker` as provided by a user
 */
export type RawSmokerOptions = z.input<typeof BaseSmokerOptionsSchema>;

/**
 * Normalized options for `Smoker`.
 */
export type SmokerOptions = z.infer<typeof BaseSmokerOptionsSchema>;
