import type {PluginHelpers} from '#plugin';
import {ExecutorSchema, type Executor} from '#schema/executor.js';
import {PkgManagerSchema, type PkgManager} from '#schema/pkg-manager.js';
import {
  NonEmptyStringSchema,
  customSchema,
  instanceofSchema,
} from '#util/schema-util.js';
import {Range, SemVer} from 'semver';
import {z} from 'zod';
import {
  PkgManagerSpecSchema,
  type PkgManagerSpec,
} from '../pkg-manager/pkg-manager-spec';

export const SemVerSchema = instanceofSchema(SemVer);

export const SemVerRangeSchema = instanceofSchema(Range);

/**
 * Options passed to a {@link PkgManagerFactory}
 */
export const PkgManagerOptsSchema = z
  .object({
    /**
     * If `true`, show STDERR/STDOUT from the package manager
     */
    verbose: z.boolean().describe('If `true`, show STDERR/STDOUT'),

    /**
     * If `true`, ignore missing scripts
     */
    loose: z.boolean().describe('If `true`, ignore missing scripts'),
  })
  .partial()
  .describe('Options for package manager factory function');

/**
 * Options for a {@link PkgManagerFactory}
 */

export type PkgManagerOpts = z.infer<typeof PkgManagerOptsSchema>;

/**
 * Pass-through schema for Helpers. We control these and do not need to validate
 * them.
 */
export const HelpersSchema = customSchema<PluginHelpers>();

export type PkgManagerFactory = (
  spec: PkgManagerSpec,
  executor: Executor,
  helpers: PluginHelpers,
  opts?: PkgManagerOpts,
) => Promise<PkgManager>;

export const PkgManagerFactorySchema = customSchema<PkgManagerFactory>(
  z
    .function(
      z.tuple([
        PkgManagerSpecSchema,
        ExecutorSchema,
        HelpersSchema,
        PkgManagerOptsSchema,
      ] as [
        spec: typeof PkgManagerSpecSchema,
        executor: typeof ExecutorSchema,
        helpers: typeof HelpersSchema,
        opts: typeof PkgManagerOptsSchema,
      ]),
      z.promise(PkgManagerSchema),
    )
    .or(
      z.function(
        z.tuple([PkgManagerSpecSchema, ExecutorSchema, HelpersSchema] as [
          spec: typeof PkgManagerSpecSchema,
          executor: typeof ExecutorSchema,
          helpers: typeof HelpersSchema,
        ]),
        z.promise(PkgManagerSchema),
      ),
    ),
);

export const PkgManagerDefSchema = z.object({
  /**
   * The name of the package manager's executable.
   */
  bin: NonEmptyStringSchema,

  /**
   * Either a SemVer range or a function which returns `true` if its parameter
   * is within the allowed range.
   */
  accepts: z.union([
    /**
     * Returns `true` if this `PackageManager` can handle the given version.
     *
     * @param semver The version to check.
     * @returns `true` if the package manager can handle the version, `false`
     *   otherwise.
     */
    z.function(
      z.tuple([SemVerSchema] as [semver: typeof SemVerSchema]),
      z.boolean(),
    ),
    z.union([NonEmptyStringSchema, SemVerRangeSchema]),
  ]),
  lockfile: NonEmptyStringSchema.optional(),

  /**
   * Creates a {@link PkgManager} object.
   */
  create: PkgManagerFactorySchema,
});

export type PkgManagerDef = z.infer<typeof PkgManagerDefSchema>;
