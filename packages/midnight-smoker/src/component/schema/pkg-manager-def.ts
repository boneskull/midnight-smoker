import {ExecResultSchema} from '#schema/exec-result';
import {ExecutorSchema} from '#schema/executor';
import {
  InstallManifestSchema,
  InstallManifestsSchema,
  type InstallManifest,
} from '#schema/install-manifest';
import {PkgManagerSpecSchema} from '#schema/pkg-manager-spec';
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

export const BasePkgManagerContextSchema = z
  .object({
    spec: PkgManagerSpecSchema.readonly(),
    tmpdir: NonEmptyStringSchema.readonly(),
    executor: ExecutorSchema,
    loose: z.boolean().optional(),
    verbose: z.boolean().optional(),
    signal: AbortSignalSchema.optional(),
  })
  .passthrough();

export const PkgManagerPackContextSchema = BasePkgManagerContextSchema.extend({
  allWorkspaces: z.boolean().optional(),
  includeWorkspaceRoot: z.boolean().optional(),
  workspaces: z.array(NonEmptyStringSchema).optional(),
  timeout: z.number().optional(),
});

export const PkgManagerInstallContextSchema =
  BasePkgManagerContextSchema.extend({
    installManifests: InstallManifestsSchema,
  });

export const PkgManagerRunScriptContextSchema =
  BasePkgManagerContextSchema.extend({
    runScriptManifest: RunScriptManifestSchema,
  });

export type PkgManagerContext<Ctx = unknown> = z.infer<
  typeof BasePkgManagerContextSchema
> &
  Ctx;

export type PkgManagerPackContext<Ctx = unknown> = PkgManagerContext<Ctx> & {
  allWorkspaces: boolean;
  includeWorkspaceRoot: boolean;
  workspaces: string[];
  timeout: number;
};

export type PkgManagerInstallContext<Ctx = unknown> = PkgManagerContext<Ctx> & {
  installManifests: InstallManifest[];
};

export type PkgManagerRunScriptContext<Ctx = unknown> =
  PkgManagerContext<Ctx> & {runScriptManifests: RunScriptManifest[]};

export const PkgManagerInstallFnSchema = z
  .function(
    z.tuple([PkgManagerInstallContextSchema] as [
      context: typeof PkgManagerInstallContextSchema,
    ]),
    z.promise(ExecResultSchema).describe('Result of installation attempt'),
  )
  .describe('Installs packages from tarballs as specified in the manifest');

export const PkgManagerPackFnSchema = z
  .function(
    z.tuple([PkgManagerPackContextSchema] as [
      context: typeof PkgManagerPackContextSchema,
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
      z.tuple([PkgManagerRunScriptContextSchema] as [
        context: typeof PkgManagerRunScriptContextSchema,
      ]),
      z.promise(RunScriptResultSchema),
    )
    .describe(
      'Runs one or more scripts against packages installed from tarballs',
    ),
);

export const PkgManagerSetupFn = z.function(
  z.tuple([BasePkgManagerContextSchema] as [
    context: typeof BasePkgManagerContextSchema,
  ]),
  VoidOrPromiseVoidSchema,
);

export const PkgManagerTeardownFn = z.function(
  z.tuple([BasePkgManagerContextSchema] as [
    context: typeof BasePkgManagerContextSchema,
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

export type SupportedVersionRange = z.infer<
  typeof PkgManagerSupportedVersionRangeSchema
>;

export type PkgManagerDef = z.infer<typeof PkgManagerDefSchema>;
