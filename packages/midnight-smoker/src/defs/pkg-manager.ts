/**
 * Contains the schema and type def for a {@link PkgManager}, which is a
 * component that a plugin can provide.
 *
 * A `PkgManager` is an adapter for a package manager executable at a given
 * version (or range).
 *
 * @module midnight-smoker/defs/pkg-manager
 */

import {type ExecOutput, type Executor} from '#defs/executor';
import {type RunScriptResult} from '#schema/pkg-manager/run-script-result';
import {type StaticPkgManagerSpec} from '#schema/pkg-manager/static-pkg-manager-spec';
import {type RawPkgManagerVersionData} from '#schema/pkg-manager/version-data';
import {type WorkspaceInfo} from '#schema/workspace-info';
import {type Range} from 'semver';
import {type Merge, type SetOptional, type SetRequired} from 'type-fest';

export {PkgManagerSpec} from '#pkg-manager/pkg-manager-spec';

export type {StaticPkgManagerSpec} from '#schema/pkg-manager/static-pkg-manager-spec';

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
    linger?: boolean;
    spec: StaticPkgManagerSpec;
    tmpdir: string;
    useWorkspaces?: boolean;
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
  signal?: AbortSignal;
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
  signal?: AbortSignal;
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

export type InstallManifest = Readonly<
  Merge<
    {
      cwd: string;
      installPath?: string;
      isAdditional?: boolean;
      pkgSpec: string;
    },
    SetOptional<
      WorkspaceInfo,
      'localPath' | 'pkgJson' | 'pkgJsonPath' | 'pkgJsonSource'
    >
  >
>;

/**
 * An install manifest referencing a workspace (_not_ an additional dependency)
 */

export type WorkspaceInstallManifest = Merge<
  SetRequired<
    InstallManifest,
    'installPath' | 'localPath' | 'pkgJson' | 'pkgJsonPath' | 'pkgJsonSource'
  >,
  {isAdditional?: false}
>;

export type RunScriptManifest = {
  cwd: string;
  script: string;
} & WorkspaceInfo;

export type {PkgManagerVersionData} from '#schema/pkg-manager/version-data';
