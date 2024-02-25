import {
  PkgManagerSpecSchema,
  type PkgManagerSpec,
} from '#pkg-manager/pkg-manager-spec';
import type {PluginHelpers} from '#plugin';
import {ExecutorSchema, type Executor} from '#schema/executor';
import {PkgManagerSchema, type PkgManager} from '#schema/pkg-manager';
import {
  NonEmptyStringSchema,
  SemVerRangeSchema,
  SemVerSchema,
  customSchema,
} from '#util/schema-util';
import {z} from 'zod';

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
   * Returns `true` if this `PackageManager` can handle the given version.
   *
   * @param versionOrRangeOrTag - The value to check
   * @returns Normalized version if accepted, `undefined` otherwise
   */
  accepts: z.function(
    z.tuple([NonEmptyStringSchema] as [
      versionOrRangeOrTag: typeof NonEmptyStringSchema,
    ]),
    z.union([SemVerSchema, NonEmptyStringSchema]).optional(),
  ),

  supportedVersionRange: NonEmptyStringSchema.or(SemVerRangeSchema).optional(),

  /**
   * Name of the lockfile for this package manager.
   *
   * Used for guessing package manager based on presence of this file
   */
  lockfile: NonEmptyStringSchema.optional(),

  /**
   * Creates a {@link PkgManager} object.
   */
  create: PkgManagerFactorySchema,
});

export type PkgManagerDef = z.infer<typeof PkgManagerDefSchema>;
