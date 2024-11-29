import {
  type PkgManagerContext,
  type PkgManagerInstallContext,
  type PkgManagerInstallFn,
  type PkgManagerPackContext,
  type PkgManagerPackFn,
  type PkgManagerRunScriptContext,
  type PkgManagerRunScriptFn,
  type PkgManagerSetupFn,
  type PkgManagerTeardownFn,
} from '#defs/pkg-manager';
import {ExecOutputSchema} from '#schema/exec/exec-output';
import {ExecutorSchema} from '#schema/pkg-manager/executor';
import {InstallManifestSchema} from '#schema/pkg-manager/install-manifest';
import {RunScriptManifestSchema} from '#schema/pkg-manager/run-script-manifest';
import {RunScriptResultSchema} from '#schema/pkg-manager/run-script-result';
import {StaticPkgManagerSpecSchema} from '#schema/pkg-manager/static-pkg-manager-spec';
import {AbortSignalSchema} from '#schema/util/abort-signal';
import {NonEmptyStringSchema} from '#schema/util/util';
import {RangeSchema} from '#schema/util/version';
import {
  BaseWorkspaceInfoSchema,
  WorkspaceInfoSchema,
} from '#schema/workspace-info';
import {asObjectSchema, multiColorFnSchema} from '#util/schema-util';
import z from 'zod';

/**
 * Base package manager context schema
 */
export const BasePkgManagerContextSchema = z.object({
  executor: ExecutorSchema,
  linger: z.boolean().optional(),
  loose: z.boolean().optional(),
  spec: StaticPkgManagerSpecSchema,
  tmpdir: NonEmptyStringSchema.readonly(),
  useWorkspaces: z.boolean().optional(),
  verbose: z.boolean().optional(),
  workspaces: z.array(WorkspaceInfoSchema),
});

/**
 * User-facing package manager context schema
 */
export const PkgManagerContextSchema: z.ZodType<PkgManagerContext> =
  BasePkgManagerContextSchema;

/**
 * Schema for a {@link PkgManagerPackContext}
 */
export const PkgManagerPackContextSchema: z.ZodType<PkgManagerPackContext> =
  BasePkgManagerContextSchema.merge(BaseWorkspaceInfoSchema)
    .extend({
      signal: AbortSignalSchema,
      timeout: z.number().optional(),
    })
    .readonly();

/**
 * Schema for a {@link PkgManagerInstallContext}
 */
export const PkgManagerInstallContextSchema: z.ZodType<PkgManagerInstallContext> =
  BasePkgManagerContextSchema.extend({
    installManifest: InstallManifestSchema,
    signal: AbortSignalSchema,
  });

/**
 * Schema for a {@link PkgManagerRunScriptContext}
 */
export const PkgManagerRunScriptContextSchema: z.ZodType<PkgManagerRunScriptContext> =
  BasePkgManagerContextSchema.extend({
    manifest: RunScriptManifestSchema,
    signal: AbortSignalSchema,
  });

/**
 * Schema for a {@link PkgManagerInstallFn}
 */
export const PkgManagerInstallFnSchema: z.ZodType<PkgManagerInstallFn> = z
  .function(
    z.tuple([PkgManagerInstallContextSchema] as [
      context: typeof PkgManagerInstallContextSchema,
    ]),
    z.promise(ExecOutputSchema).describe('Result of installation attempt'),
  )
  .describe('Installs a package');

/**
 * Schema for a {@link PkgManagerPackFn}
 */
export const PkgManagerPackFnSchema: z.ZodType<PkgManagerPackFn> = z
  .function(
    z.tuple([PkgManagerPackContextSchema] as [
      context: typeof PkgManagerPackContextSchema,
    ]),
    z.promise(InstallManifestSchema),
  )
  .describe('Packs a single package into a tarball');

/**
 * Schema for a {@link PkgManagerRunScriptFn}
 */
export const PkgManagerRunScriptFnSchema: z.ZodType<PkgManagerRunScriptFn> = z
  .function(
    z.tuple([PkgManagerRunScriptContextSchema] as [
      context: typeof PkgManagerRunScriptContextSchema,
    ]),
    z.promise(RunScriptResultSchema),
  )
  .describe(
    'Runs one or more scripts against packages installed from tarballs',
  );

/**
 * Schema for a {@link PkgManagerSetupFn}
 */
export const PkgManagerSetupFnSchema: z.ZodType<PkgManagerSetupFn> =
  multiColorFnSchema(
    z.function(
      z.tuple([PkgManagerContextSchema] as [
        context: typeof PkgManagerContextSchema,
      ]),
      z.void(),
    ),
  );

/**
 * Schema for a {@link PkgManagerTeardownFn}
 */
export const PkgManagerTeardownFnSchema: z.ZodType<PkgManagerTeardownFn> =
  multiColorFnSchema(
    z.function(
      z.tuple([PkgManagerContextSchema] as [
        context: typeof PkgManagerContextSchema,
      ]),
      z.void(),
    ),
  );

/**
 * Base schema for a package manager.
 */
const BasePkgManagerSchema = z
  .object({
    /**
     * The name of the package manager's executable.
     */
    bin: NonEmptyStringSchema.describe(
      `The name of the package manager's executable.`,
    ),

    /**
     * Description of the package manager
     */
    description: NonEmptyStringSchema.optional().describe(
      'Description of the package manager',
    ),

    /**
     * {@inheritDoc PkgManagerInstallFnSchema}
     */
    install: PkgManagerInstallFnSchema.describe(
      'Installs a package; resolves with an ExecResult',
    ),

    /**
     * Name of the lockfile for this package manager.
     *
     * Used for guessing package manager based on presence of this file
     */
    lockfile: NonEmptyStringSchema.optional().describe(
      'Name of the lockfile; used for guessing package manager based on presence of this file',
    ),

    /**
     * The name of the package manager. Must be unique to the
     * {@link PkgManager PkgManagers} defined by a plugin.
     */
    name: NonEmptyStringSchema.describe(
      'The name of the package manager. Must be unique to the PkgManagers defined by a plugin.',
    ),

    /**
     * {@inheritDoc PkgManagerPackFnSchema}
     */
    pack: PkgManagerPackFnSchema.describe(
      'Packs a workspace; resolves with an InstallManifest',
    ),

    /**
     * {@inheritDoc PkgManagerRunScriptFnSchema}
     */
    runScript: PkgManagerRunScriptFnSchema.describe(
      'Runs a custom script; resolves with a RunScriptResult',
    ),

    /**
     * {@inheritDoc PkgManagerSetupFn}
     */
    setup: PkgManagerSetupFnSchema.optional().describe(
      'Optional setup function to run before all operations',
    ),

    /**
     * The range of versions supported by this package manager; used to
     * determine if the `PkgManager` component can handle a given version of the
     * package manager.
     */
    supportedVersionRange: RangeSchema.describe(
      'A range of versions supported by this PkgManager; may be a string or SemVer Range instance',
    ),

    /**
     * Optional teardown function to run after all operations
     */
    teardown: PkgManagerTeardownFnSchema.optional().describe(
      'Optional teardown function to run after all operations',
    ),
  })
  .passthrough();

/**
 * User-facing schema for a package manager, which allows class instances
 */
export const PkgManagerSchema = asObjectSchema(BasePkgManagerSchema);
