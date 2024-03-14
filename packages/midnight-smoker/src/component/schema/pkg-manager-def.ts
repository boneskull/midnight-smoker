import {ExecResultSchema, type ExecResult} from '#schema/exec-result';
import {ExecutorSchema} from '#schema/executor';
import {
  InstallManifestSchema,
  InstallManifestsSchema,
  type InstallManifest,
} from '#schema/install-manifest';
import {PkgManagerSpecSchema} from '#schema/pkg-manager-spec';
import {RunScriptManifestSchema} from '#schema/run-script-manifest';
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

export type PkgManagerAcceptsResult = z.infer<
  typeof PkgManagerAcceptsResultSchema
>;
export type PkgManagerContext<Ctx = unknown> = z.infer<
  typeof BasePkgManagerContextSchema
> &
  Ctx;
export type PkgManagerInstallContext<Ctx = unknown> = z.infer<
  typeof PkgManagerInstallContextSchema
> &
  Ctx;

/**
 * Options for a {@link PkgManagerFactory}
 */
export type PkgManagerOpts = z.infer<typeof PkgManagerOptsSchema>;
export type PkgManagerPackContext<Ctx = unknown> = z.infer<
  typeof PkgManagerPackContextSchema
> &
  Ctx;
export type PkgManagerRunScriptContext<Ctx = unknown> = z.infer<
  typeof PkgManagerRunScriptContextSchema
> &
  Ctx;

export type PkgManagerRunScriptFn = (
  ctx: SomePkgManagerRunScriptContext,
) => Promise<RunScriptResult>;
export type PkgManagerRunScriptFnOpts = z.infer<
  typeof PkgManagerRunScriptFnOptsSchema
>;
export type SomePkgManagerInstallContext = PkgManagerInstallContext;
export type SomePkgManagerPackContext = PkgManagerPackContext;
export type SomePkgManagerRunScriptContext = PkgManagerRunScriptContext;
export type SupportedVersionRange = z.infer<
  typeof PkgManagerSupportedVersionRangeSchema
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

export const PkgManagerInstallSchema = z
  .function(
    z.tuple([PkgManagerInstallContextSchema] as [
      context: typeof PkgManagerInstallContextSchema,
    ]),
    z.promise(ExecResultSchema).describe('Result of installation attempt'),
  )
  .describe('Installs packages from tarballs as specified in the manifest');
export const PkgManagerPackSchema = z
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
export const PkgManagerRunScriptSchema = z
  .function(
    z.tuple([PkgManagerRunScriptContextSchema] as [
      context: typeof PkgManagerRunScriptContextSchema,
    ]),
    z.promise(RunScriptResultSchema),
  )
  .describe(
    'Runs one or more scripts against packages installed from tarballs',
  );
export const PkgManagerSetupSchema = z.function(
  z.tuple([BasePkgManagerContextSchema] as [
    context: typeof BasePkgManagerContextSchema,
  ]),
  VoidOrPromiseVoidSchema,
);
export const PkgManagerTeardownSchema = z.function(
  z.tuple([BasePkgManagerContextSchema] as [
    context: typeof BasePkgManagerContextSchema,
  ]),
  VoidOrPromiseVoidSchema,
);

export const PkgManagerAcceptsResultSchema = z
  .union([SemVerSchema, NonEmptyStringSchema])
  .optional();

export const PkgManagerAcceptsSchema = z.function(
  z.tuple([NonEmptyStringSchema] as [
    versionOrRangeOrTag: typeof NonEmptyStringSchema,
  ]),
  PkgManagerAcceptsResultSchema,
);

export type PkgManagerAccepts = z.infer<typeof PkgManagerAcceptsSchema>;

export const PkgManagerSupportedVersionRangeSchema = NonEmptyStringSchema.or(
  SemVerRangeSchema,
).describe(
  'A semver range string; if present, displayed in list of package managers',
);

export type PkgManagerSupportedVersionRange = z.infer<
  typeof PkgManagerSupportedVersionRangeSchema
>;

export type SomePkgManagerDef = PkgManagerDef<any>;

/**
 * Schema for a package manager definition
 */
export const PkgManagerDefSchema = customSchema<SomePkgManagerDef>(
  fancyObjectSchema(
    z.object({
      /**
       * The name of the package manager's executable.
       */
      bin: NonEmptyStringSchema,

      /**
       * {@inheritDoc PkgManagerAcceptsFnSchema}
       */
      accepts: PkgManagerAcceptsSchema,

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
      setup: PkgManagerSetupSchema.optional(),

      /**
       * Optional teardown function to run after all operations
       */
      teardown: PkgManagerTeardownSchema.optional(),

      /**
       * {@inheritDoc PkgManagerInstallFnSchema}
       */
      install: PkgManagerInstallSchema,

      /**
       * {@inheritDoc PkgManagerPackFnSchema}
       */
      pack: PkgManagerPackSchema,

      /**
       * {@inheritDoc PkgManagerRunScriptFnSchema}
       */
      runScript: PkgManagerRunScriptSchema,
    }),
  ),
);

export interface PkgManagerDef<Ctx = unknown> {
  bin: string;
  accepts: PkgManagerAccepts;
  supportedVersionRange?: PkgManagerSupportedVersionRange;
  lockfile?: string;
  setup?(ctx: PkgManagerContext<Ctx>): void | Promise<void>;
  teardown?(ctx: PkgManagerContext<Ctx>): void | Promise<void>;
  install(ctx: PkgManagerInstallContext<Ctx>): Promise<ExecResult>;
  pack(ctx: PkgManagerPackContext<Ctx>): Promise<InstallManifest[]>;
  runScript(ctx: PkgManagerRunScriptContext<Ctx>): Promise<RunScriptResult>;
}
