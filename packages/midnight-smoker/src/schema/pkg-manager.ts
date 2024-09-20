import {type ExecOutput, ExecOutputSchema} from '#schema/exec-result';
import {type Executor, ExecutorSchema} from '#schema/executor';
import {
  type InstallManifest,
  InstallManifestSchema,
} from '#schema/install-manifest';
import {
  type RunScriptManifest,
  RunScriptManifestSchema,
} from '#schema/run-script-manifest';
import {
  type RunScriptResult,
  RunScriptResultSchema,
} from '#schema/run-script-result';
import {type WorkspaceInfo, WorkspaceInfoSchema} from '#schema/workspace-info';
import {
  asObjectSchema,
  multiColorFnSchema,
  NonEmptyStringSchema,
} from '#util/schema-util';
import {type Range} from 'semver';
import {type Merge} from 'type-fest';
import {z} from 'zod';

import {AbortSignalSchema} from './abort-signal';
import {
  type StaticPkgManagerSpec,
  StaticPkgManagerSpecSchema,
} from './static-pkg-manager-spec';
import {RangeSchema, type RawPkgManagerVersionData} from './version';

/**
 * The context for a package manager.
 *
 * This is the base chunk of state that a {@link PkgManager} gets to work with.
 * Each operation function will receive this context object or a more specific
 * one which extends this.
 */
export type PkgManagerContext = Merge<
  {
    executor: Executor;
    spec: StaticPkgManagerSpec;
    tmpdir: string;
    useWorkspaces?: boolean;
    workspaceInfo: WorkspaceInfo[];
  },
  PkgManagerOpts
>;

/**
 * A Package Manager definition which is an adapter for a package manager
 * executable.
 *
 * `midnight-smoker` only cares about a select few operations (packing,
 * installation, and running a script), but they all must be provided.
 *
 * A `PkgManager` is defined via a plugin, and is considered a Component. Its
 * `ComponentKind` is `PkgManager`.
 *
 * This can be a plain object or a singleton-like instance of some class. If a
 * class is used, it's the responsibility of the plugin author to instantiate.
 */
export type PkgManager = {
  /**
   * Whatever else the plugin author needs in here is fine; it is ignored by
   * `midnight-smoker`
   */
  [x: string]: unknown;

  /**
   * The name of the package manager's executable. End-users will refer to this
   * when choosing a package manager
   */
  bin: string;

  /**
   * Description of the package manager
   */
  description?: string;

  /**
   * A function that installs a package. It receives a context object and
   * returns a the raw {@link ExecResult}, returned by its
   * {@link PkgManagerContext.executor Executor}.
   */
  install: PkgManagerInstallFn;

  /**
   * The name of the lockfile for this package manager. Used for auto-detection
   * of package manager
   */
  lockfile?: string;

  /**
   * The human-readable name for display
   */
  name: string;

  /**
   * A function that packs a package into a tarball into a
   * {@link PkgManagerContext.tmpdir temp dir} (the path to which is determined
   * by `midnight-smoker`). It receives a context object and returns an
   * {@link InstallManifest}.
   */
  pack: PkgManagerPackFn;

  /**
   * A function that runs a script against a package. It receives a context
   * object and returns a {@link RunScriptResult}.
   */
  runScript: PkgManagerRunScriptFn;

  /**
   * A "setup" lifecycle function which is called before any operations are run.
   * It receives the context object, which it can mutate.
   */
  setup?: PkgManagerSetupFn;

  /**
   * The range of versions supported by this package manager; used to determine
   * if the `PkgManager` can handle a given version
   */
  supportedVersionRange: PkgManagerSupportedVersionRange;

  /**
   * A "teardown" lifecycle function which is called after all operations are
   * run. It receives the context object, which it can mutate.
   */
  teardown?: PkgManagerTeardownFn;

  /**
   * An array of versions or an object containing versions and tags,
   * representing known package manager versions
   *
   * This is needed to validate user input.
   */
  versions: RawPkgManagerVersionData;
};

/**
 * The context object for {@link PkgManagerInstallFn}.
 *
 * The `PkgManagerInstallFn` will use the
 * {@link PkgManagerInstallContext.installManifest installManifest property} to
 * determine what to install. Usually, this will be a tarball which was created
 * by {@link PkgManagerPackFn}.
 */
export type PkgManagerInstallContext = {
  installManifest: InstallManifest;
  signal: AbortSignal;
} & PkgManagerContext;

/**
 * Installs a package given the {@link PkgManagerInstallContext context object}.
 */
export type PkgManagerInstallFn = (
  context: PkgManagerInstallContext,
) => Promise<ExecOutput>;

/**
 * Extra options for package manager operations.
 */
export type PkgManagerOpts = {
  /**
   * If `true`, ignore missing scripts in {@link PkgManagerRunScriptFn}.
   */
  loose?: boolean;

  /**
   * If `true`, the package manager should pipe its STDERR/STDOUT to the console
   */
  verbose?: boolean;
};

/**
 * The context object for {@link PkgManagerPackFn}.
 *
 * The `PkgManagerPackFn` will use the properties from {@link WorkspaceInfo} to
 * determine what to pack; {@link PkgManagerContext.tmpdir tmpdir} is the target
 * directory.
 */
export type PkgManagerPackContext = {
  signal: AbortSignal;
  timeout?: number;
} & PkgManagerContext &
  WorkspaceInfo;

/**
 * Packs a package into a tarball given a {@link PkgManagerPackContext context}
 * object
 */
export type PkgManagerPackFn = (
  context: PkgManagerPackContext,
) => Promise<InstallManifest>;

/**
 * The context object for {@link PkgManagerRunScriptFn}.
 *
 * The `PkgManagerRunScriptFn` will use the
 * {@link PkgManagerRunScriptContext.manifest RunScriptManifest} to determine
 * what scripts to run within the installed packages (and where).
 */
export type PkgManagerRunScriptContext = {
  manifest: RunScriptManifest;
  signal: AbortSignal;
} & PkgManagerContext;

/**
 * Runs a script against a package given a {@link PkgManagerRunScriptContext}
 * object.
 */
export type PkgManagerRunScriptFn = (
  context: PkgManagerRunScriptContext,
) => Promise<RunScriptResult>;

/**
 * A "lifeycle" function that sets up a package manager.
 */
export type PkgManagerSetupFn =
  | ((context: PkgManagerContext) => Promise<void>)
  | ((context: PkgManagerContext) => void);

/**
 * A value which indicates what version or versions a package manager can
 * support.
 *
 * Must be parseable by `semver`.
 */
export type PkgManagerSupportedVersionRange = Range | string;

/**
 * A "lifeycle" function that tears down a package manager.
 *
 * Use this to dispose of resources or clean up after a package manager.
 * `midnight-smoker` will handle the temporary directory.
 */
export type PkgManagerTeardownFn =
  | ((context: PkgManagerContext) => Promise<void>)
  | ((context: PkgManagerContext) => void);

/**
 * Base package manager context schema
 */
const BasePkgManagerContextSchema = z.object({
  executor: ExecutorSchema,
  loose: z.boolean().optional(),
  spec: StaticPkgManagerSpecSchema,
  tmpdir: NonEmptyStringSchema.readonly(),
  useWorkspaces: z.boolean().optional(),
  verbose: z.boolean().optional(),
  workspaceInfo: z.array(WorkspaceInfoSchema),
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
  BasePkgManagerContextSchema.merge(WorkspaceInfoSchema).extend({
    signal: AbortSignalSchema,
    timeout: z.number().optional(),
  });

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
