import {
  PkgManagerSpecSchema,
  type PkgManagerSpec,
} from '#pkg-manager/pkg-manager-spec';
import type {PluginHelpers} from '#plugin';
import {ExecResultSchema} from '#schema/exec-result';
import {ExecutorSchema, type Executor} from '#schema/executor';
import {
  InstallManifestSchema,
  InstallManifestsSchema,
} from '#schema/install-manifest';
import {PackOptionsSchema} from '#schema/pack-options';
import {type PkgManager} from '#schema/pkg-manager';
import {
  RunScriptManifestSchema,
  type RunScriptManifest,
} from '#schema/run-script-manifest';
import {
  RunScriptResultSchema,
  type RunScriptResult,
} from '#schema/run-script-result';
import {
  AbortSignalSchema,
  NonEmptyStringSchema,
  SemVerRangeSchema,
  SemVerSchema,
  VoidOrPromiseVoidSchema,
  customSchema,
  fancyObjectSchema,
} from '#util/schema-util';
import {z} from 'zod';

export type PkgManagerRunScriptFn = (
  runScriptManifest: RunScriptManifest,
  opts?: PkgManagerRunScriptFnOpts,
) => Promise<RunScriptResult>;

export type PkgManagerRunScriptFnOpts = z.infer<
  typeof PkgManagerRunScriptFnOptsSchema
>;

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

export type PkgManagerFactory = (
  spec: PkgManagerSpec,
  executor: Executor,
  helpers: PluginHelpers,
  opts?: PkgManagerOpts,
) => Promise<PkgManager>;

export const PkgManagerContextSchema = z
  .object({
    spec: PkgManagerSpecSchema.readonly(),
    tmpdir: NonEmptyStringSchema.readonly(),
    executor: ExecutorSchema,
  })
  .passthrough();

export type PkgManagerContext<Ctx = unknown> = z.infer<
  typeof PkgManagerContextSchema
> &
  Ctx;

export const PkgManagerInstallFnSchema = z
  .function(
    z.tuple([PkgManagerContextSchema, InstallManifestsSchema] as [
      context: typeof PkgManagerContextSchema,
      manifests: typeof InstallManifestsSchema,
    ]),
    z.promise(ExecResultSchema).describe('Result of installation attempt'),
  )
  .describe('Installs packages from tarballs as specified in the manifest');

export const PkgManagerPackFnSchema = z
  .function(
    z.tuple([PkgManagerContextSchema, PackOptionsSchema] as [
      context: typeof PkgManagerContextSchema,
      opts: typeof PackOptionsSchema,
    ]),
    z.promise(z.array(InstallManifestSchema)),
  )
  .describe('Packs one or more packages into tarballs');

export const PkgManagerRunScriptFnOptsSchema = z
  .object({
    signal: AbortSignalSchema.optional(),
  })
  .optional();

export const PkgManagerRunScriptFnSchema = customSchema<PkgManagerRunScriptFn>(
  z
    .function(
      z.tuple([
        PkgManagerContextSchema,
        RunScriptManifestSchema,
        PkgManagerRunScriptFnOptsSchema,
      ] as [
        context: typeof PkgManagerContextSchema,
        manifest: typeof RunScriptManifestSchema,
        opts: typeof PkgManagerRunScriptFnOptsSchema,
      ]),
      z.promise(RunScriptResultSchema),
    )
    .describe(
      'Runs one or more scripts against packages installed from tarballs',
    ),
);

export const PkgManagerSetupFn = z.function(
  z.tuple([PkgManagerContextSchema] as [
    context: typeof PkgManagerContextSchema,
  ]),
  VoidOrPromiseVoidSchema,
);

export const PkgManagerTeardownFn = z.function(
  z.tuple([PkgManagerContextSchema] as [
    context: typeof PkgManagerContextSchema,
  ]),
  VoidOrPromiseVoidSchema,
);

export const PkgManagerAcceptsFnSchema = z.function(
  z.tuple([NonEmptyStringSchema] as [
    versionOrRangeOrTag: typeof NonEmptyStringSchema,
  ]),
  z.union([SemVerSchema, NonEmptyStringSchema]).optional(),
);

export const PkgManagerSupportedVersionRangeSchema = NonEmptyStringSchema.or(
  SemVerRangeSchema,
).describe(
  'A semver range string; if present, displayed in list of package managers',
);

/**
 * Schema for a package manager definition
 */
export const PkgManagerDefSchema = fancyObjectSchema(
  z.object({
    /**
     * The name of the package manager's executable.
     */
    bin: NonEmptyStringSchema,

    /**
     * Returns `true` if this `PackageManager` can handle the given version.
     */
    accepts: PkgManagerAcceptsFnSchema,

    supportedVersionRange: PkgManagerSupportedVersionRangeSchema.optional(),

    /**
     * Name of the lockfile for this package manager.
     *
     * Used for guessing package manager based on presence of this file
     */
    lockfile: NonEmptyStringSchema.optional(),

    setup: PkgManagerSetupFn.optional(),
    teardown: PkgManagerTeardownFn.optional(),
    install: PkgManagerInstallFnSchema,
    pack: PkgManagerPackFnSchema,
    runScript: PkgManagerRunScriptFnSchema,
  }),
);

export type PkgManagerDef = z.infer<typeof PkgManagerDefSchema>;
