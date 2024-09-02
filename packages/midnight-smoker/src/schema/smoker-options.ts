import {DEFAULT_COMPONENT_ID} from '#constants';
import {
  type BaseRuleConfigRecord,
  RawRuleOptionsRecordSchema,
} from '#schema/rule-options';
import {
  DefaultFalseSchema,
  DefaultTrueSchema,
  NonEmptyStringSchema,
  UniqueNonEmptyStringToArraySchema,
} from '#util/schema-util';
import {type DualCasedObject, toDualCasedObject} from '#util/util';
import {type ReadonlyDeep, type Simplify} from 'type-fest';
import {z} from 'zod';

import {
  type DesiredPkgManager,
  DesiredPkgManagerSchema,
} from './desired-pkg-manager';

/**
 * Properties of {@link SmokerOptions}, dual-cased
 */
const smokerOptionsShape = {
  /**
   * Add an extra package to the list of packages to be installed
   */
  add: UniqueNonEmptyStringToArraySchema.readonly().describe(
    'Add an extra package to the list of packages to be installed',
  ),

  /**
   * Operate on all workspaces. The root workspace is omitted unless
   */
  all: DefaultFalseSchema.describe(
    'Operate on all workspaces. The root workspace is omitted unless `includeRoot` is `true`',
  ),

  /**
   * Operate on private workspaces
   */
  allowPrivate: DefaultFalseSchema.describe('Operate on private workspaces'),

  /**
   * Fail on first script failure
   */
  bail: DefaultFalseSchema.describe('Fail on first script failure'),

  cwd: NonEmptyStringSchema.describe('Path to workspace root').default(
    process.cwd(),
  ),

  /**
   * Component ID of Executor implementation
   */
  executor: NonEmptyStringSchema.describe(
    'Component ID of Executor implementation',
  ).default(DEFAULT_COMPONENT_ID),

  /**
   * Output JSON only
   */
  json: DefaultFalseSchema.describe('Output JSON only'),

  // /**
  //  * Operate on the root workspace. Only has an effect if `all` is `true`
  //  */
  // includeRoot: DefaultFalseSchema.describe(
  //   'Operate on the root workspace. Only has an effect if `all` is `true`',
  // ),

  /**
   * Do not delete temp directories after completion
   */
  linger: DefaultFalseSchema.describe(
    'Do not delete temp directories after completion',
  ),

  /**
   * If `false`, do not lint when running custom scripts
   */
  lint: DefaultTrueSchema.describe(
    'If `false`, do not lint when running custom scripts',
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
  pkgManager: UniqueNonEmptyStringToArraySchema.pipe(
    z.array(DesiredPkgManagerSchema),
  )
    .readonly()
    .describe('Package manager(s) to use'),

  /**
   * The plugin(s) to load
   */
  plugin: UniqueNonEmptyStringToArraySchema.readonly().describe(
    'One or more plugins to load',
  ),

  /**
   * The reporter(s) to use
   */
  reporter: UniqueNonEmptyStringToArraySchema.describe(
    'Component ID of Reporter implementation',
  )
    .readonly()
    .default([process.stderr.isTTY ? 'console' : 'simple']),

  /**
   * Rule config
   */
  rules: RawRuleOptionsRecordSchema.readonly().default({}),

  /**
   * Script(s) to run.
   */
  script:
    UniqueNonEmptyStringToArraySchema.readonly().describe('Script(s) to run.'),

  /**
   * Verbose logging
   */
  verbose: DefaultFalseSchema.describe('Verbose logging'),

  /**
   * One or more workspaces to operate in
   */
  workspace: UniqueNonEmptyStringToArraySchema.readonly().describe(
    'One or more workspaces to run scripts in',
  ),
};

const dualCasedSmokerOptionsShape = toDualCasedObject(smokerOptionsShape);

/**
 * Schema representing all user-provided options for `midnight-smoker`, either
 * passed thru the CLI, config file, or API.
 *
 * Does not include custom rule options, which are computed at runtime.
 */
export const SmokerOptionsSchema: z.ZodObject<
  typeof dualCasedSmokerOptionsShape,
  'strip',
  z.ZodTypeAny,
  NormalizedSmokerOptions,
  RawSmokerOptions
> = z
  .object(dualCasedSmokerOptionsShape)
  .describe('Pre-plugin midnight-smoker options schema');

/**
 * Normalized options for `midnight-smoker`.
 *
 * This is the output of {@link SmokerOptionsSchema}.
 */
type NormalizedSmokerOptions = DualCasedObject<{
  add: readonly string[];
  all: boolean;
  allowPrivate: boolean;
  bail: boolean;
  cwd: string;
  executor: string;
  json: boolean;
  linger: boolean;
  lint: boolean;
  loose: boolean;
  pkgManager: readonly DesiredPkgManager[];
  plugin: readonly string[];
  reporter: readonly string[];
  rules: Readonly<BaseRuleConfigRecord>;
  script: readonly string[];
  verbose: boolean;
  workspace: readonly string[];
}>;

/**
 * Normalized options for `midnight-smoker`.
 *
 * While any such object having this type is actually just
 * {@link NormalizedSmokerOptions}, **no part of it should ever be written to**.
 */
export type SmokerOptions = Simplify<ReadonlyDeep<NormalizedSmokerOptions>>;

/**
 * User-facing options for `midnight-smoker`.
 *
 * Because plugins are a thing, which add their own rules (and config), we
 * cannot fully determine the shape of the options object _until runtime_.
 */
export type RawSmokerOptions = Partial<
  DualCasedObject<{
    add: readonly string[] | string;
    all: boolean;
    allowPrivate: boolean;
    bail: boolean;
    cwd: string;
    executor: string;
    json: boolean;
    linger: boolean;
    lint: boolean;
    loose: boolean;
    pkgManager:
      | DesiredPkgManager
      | DesiredPkgManager[]
      | readonly DesiredPkgManager[];
    plugin: readonly string[] | string;
    reporter: readonly string[] | string;
    // TODO: make this a static type
    rules: z.input<typeof RawRuleOptionsRecordSchema>;
    script: readonly string[] | string;
    verbose: boolean;
    workspace: readonly string[] | string;
  }>
>;
