import {ExecResultSchema} from '#schema/exec-result';
import {ExecutorSchema} from '#schema/executor';
import {InstallManifestSchema} from '#schema/install-manifest';
import {PkgManagerSpecSchema} from '#schema/pkg-manager-spec';
import {RunScriptManifestSchema} from '#schema/run-script-manifest';
import {RunScriptResultSchema} from '#schema/run-script-result';
import {
  AbortSignalSchema,
  NonEmptyStringSchema,
  SemVerRangeSchema,
  SemVerSchema,
  VoidOrPromiseVoidSchema,
  fancyObjectSchema,
} from '#util/schema-util';
import {z} from 'zod';
import {WorkspaceInfoSchema} from './workspaces';

export type PkgManagerAcceptsResult = z.infer<
  typeof PkgManagerAcceptsResultSchema
>;

export type PkgManagerContext = z.infer<typeof PkgManagerContextSchema>;

export type PkgManagerInstallContext = z.infer<
  typeof PkgManagerInstallContextSchema
>;

/**
 * Options for a {@link PkgManagerFactory}
 */
export type PkgManagerOpts = z.infer<typeof PkgManagerOptsSchema>;

export type PkgManagerPackContext = z.infer<typeof PkgManagerPackContextSchema>;

export type PkgManagerRunScriptContext = z.infer<
  typeof PkgManagerRunScriptContextSchema
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

export const PkgManagerContextSchema = z.object({
  useWorkspaces: z.boolean().optional(),
  spec: PkgManagerSpecSchema.readonly(),
  tmpdir: NonEmptyStringSchema.readonly(),
  executor: ExecutorSchema,
  loose: z.boolean().optional(),
  verbose: z.boolean().optional(),
  workspaceInfo: z.array(WorkspaceInfoSchema),
});

export const PkgManagerPackContextSchema = PkgManagerContextSchema.merge(
  WorkspaceInfoSchema,
).extend({
  // allWorkspaces: z.boolean().optional(),
  // includeWorkspaceRoot: z.boolean().optional(),
  // workspaces: z.array(NonEmptyStringSchema).optional(),
  timeout: z.number().optional(),
  signal: AbortSignalSchema,
});

export const PkgManagerInstallContextSchema = PkgManagerContextSchema.extend({
  installManifest: InstallManifestSchema,
  signal: AbortSignalSchema,
});

export const PkgManagerRunScriptContextSchema = PkgManagerContextSchema.extend({
  runScriptManifest: RunScriptManifestSchema,
  signal: AbortSignalSchema,
});

export const PkgManagerInstallFnSchema = z
  .function(
    z.tuple([PkgManagerInstallContextSchema] as [
      context: typeof PkgManagerInstallContextSchema,
    ]),
    z.promise(ExecResultSchema).describe('Result of installation attempt'),
  )
  .describe('Installs a package');

export const PkgManagerPackFnSchema = z
  .function(
    z.tuple([PkgManagerPackContextSchema] as [
      context: typeof PkgManagerPackContextSchema,
    ]),
    z.promise(InstallManifestSchema),
  )
  .describe('Packs a single package into a tarball');

export const PkgManagerRunScriptFnOptsSchema = z
  .object({
    signal: AbortSignalSchema.optional(),
  })
  .optional();

export const PkgManagerRunScriptFnSchema = z
  .function(
    z.tuple([PkgManagerRunScriptContextSchema] as [
      context: typeof PkgManagerRunScriptContextSchema,
    ]),
    z.promise(RunScriptResultSchema),
  )
  .describe(
    'Runs one or more scripts against packages installed from tarballs',
  );

export const PkgManagerSetupFnSchema = z.function(
  z.tuple([PkgManagerContextSchema] as [
    context: typeof PkgManagerContextSchema,
  ]),
  VoidOrPromiseVoidSchema,
);

export const PkgManagerTeardownFnSchema = z.function(
  z.tuple([PkgManagerContextSchema] as [
    context: typeof PkgManagerContextSchema,
  ]),
  VoidOrPromiseVoidSchema,
);

export const PkgManagerAcceptsResultSchema = z
  .union([SemVerSchema, NonEmptyStringSchema])
  .optional();

export const PkgManagerAcceptsFnSchema = z.function(
  z.tuple([NonEmptyStringSchema] as [
    versionOrRangeOrTag: typeof NonEmptyStringSchema,
  ]),
  PkgManagerAcceptsResultSchema,
);

export type PkgManagerAccepts = z.infer<typeof PkgManagerAcceptsFnSchema>;

export const PkgManagerSupportedVersionRangeSchema = NonEmptyStringSchema.or(
  SemVerRangeSchema,
).describe(
  'A semver range string; if present, displayed in list of package managers',
);

export type PkgManagerSupportedVersionRange = z.infer<
  typeof PkgManagerSupportedVersionRangeSchema
>;

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
     * {@inheritDoc PkgManagerAcceptsFnSchema}
     */
    accepts: PkgManagerAcceptsFnSchema,

    /**
     * {@inheritDoc PkgManagerSupportedVersionRangeSchema}
     */
    supportedVersionRange: PkgManagerSupportedVersionRangeSchema.optional(),

    /**
     * Name of the lockfile for this package manager.
     *
     * Used for guessing package manager based on presence of this file
     */
    lockfile: NonEmptyStringSchema.optional(),

    /**
     * {@inheritDoc PkgManagerSetupFn}
     */
    setup: PkgManagerSetupFnSchema.optional(),

    /**
     * Optional teardown function to run after all operations
     */
    teardown: PkgManagerTeardownFnSchema.optional(),

    /**
     * {@inheritDoc PkgManagerInstallFnSchema}
     */
    install: PkgManagerInstallFnSchema,

    /**
     * {@inheritDoc PkgManagerPackFnSchema}
     */
    pack: PkgManagerPackFnSchema,

    /**
     * {@inheritDoc PkgManagerRunScriptFnSchema}
     */
    runScript: PkgManagerRunScriptFnSchema,
  }),
);

export type PkgManagerDef = z.infer<typeof PkgManagerDefSchema>;
