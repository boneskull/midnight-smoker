import {Range, SemVer} from 'semver';
import {z} from 'zod';
import {zScriptError} from '../../error/error-schema';
import type * as Helpers from '../../plugin/helpers';
import {
  customSchema,
  instanceofSchema,
  zAbortSignal,
  zNonEmptyString,
} from '../../util/schema-util';
import type {ExecError} from '../executor/exec-error';
import {zExecutor} from '../executor/executor';
import {
  zExecError,
  zExecResult,
  type ExecResult,
} from '../executor/executor-schema';
import type {ScriptError} from './errors/script-error';
import {zPkgManagerSpec} from './pkg-manager-spec';

export const zBaseRunScriptManifest = z.object({
  cwd: zNonEmptyString,
  pkgName: zNonEmptyString,
  script: zNonEmptyString,
});

export const zRunScriptManifest = customSchema<RunScriptManifest>(
  zBaseRunScriptManifest,
);

export interface RunScriptManifest {
  cwd: string;
  pkgName: string;
  script: string;
}

export const zRunScriptResult = customSchema<RunScriptResult>(
  z
    .object({
      cwd: zNonEmptyString.optional(),
      error: zScriptError.optional(),
      pkgName: zNonEmptyString,
      rawResult: z.union([zExecResult, zExecError]),
      script: zNonEmptyString,
      skipped: z.boolean().optional(),
    })
    .describe('The result of running a single custom script'),
);

export interface RunScriptResult {
  cwd?: string;
  error?: ScriptError;
  pkgName: string;
  rawResult: ExecError | ExecResult;
  script: string;
  skipped?: boolean;
}

export const zBaseInstallManifest = z
  .object({
    cwd: zNonEmptyString.describe('The working directory for the install'),
    installPath: zNonEmptyString
      .optional()
      .describe(
        'The path to install the package to; only applicable if spec is a tarball',
      ),
    pkgName: zNonEmptyString.describe('The name of the package to install'),
    spec: zNonEmptyString.describe('The package spec to install'),
  })
  .describe('Installation manifest (what to install and where)');

export const zInstallManifest =
  customSchema<InstallManifest>(zBaseInstallManifest);

/**
 * Describes which packages to install and where to install them.
 *
 * This is returned by {@link PkgManager.pack} and passed to
 * {@link PkgManager.install}.
 */
export interface InstallManifest {
  /**
   * The directory in which to install the package.
   *
   * This is the temp directory unique to the {@link PkgManager} and package.
   */
  cwd: string;

  /**
   * The directory in which the package should be installed.
   *
   * {@link PkgManager.pack} leaves this empty and {@link PkgManager.install}
   * fills it in.
   */
  installPath?: string;

  /**
   * The name of the package to install.
   */
  pkgName: string;

  /**
   * Could be a tarball path or any other package spec understood by the package
   * manager.
   */
  spec: string;
}

export const zInstallManifests = z.array(zInstallManifest);

export const zPackOptions = z
  .object({
    allWorkspaces: z
      .boolean()
      .optional()
      .describe('If true, pack all workspaces'),
    includeWorkspaceRoot: z
      .boolean()
      .optional()
      .describe('Include the workspace root when packing'),
    workspaces: z
      .array(zNonEmptyString)
      .optional()
      .describe('List of workspaces to pack'),
  })
  .describe('Options for a Packer component');

export type PackOptions = z.infer<typeof zPackOptions>;

export const zPkgManagerInstallMethod = customSchema<PkgManagerInstallMethod>(
  z
    .function(
      z.tuple([zInstallManifests] as [
        installManifests: typeof zInstallManifests,
      ]),
      z.promise(zExecResult).describe('Result of installation attempt'),
    )
    .describe('Installs packages from tarballs as specified in the manifest'),
);

export const zPkgManagerPackMethod = customSchema<PkgManagerPackMethod>(
  z
    .function(
      z.tuple([zPackOptions] as [opts: typeof zPackOptions]),
      z.promise(zInstallManifests),
    )
    .describe('Packs one or more packages into tarballs'),
);

export const zPkgManagerRunScriptOpts = z
  .object({
    signal: zAbortSignal.optional(),
  })
  .optional();

export const zPkgManagerRunScriptMethod =
  customSchema<PkgManagerRunScriptMethod>(
    z
      .function(
        z.tuple([zRunScriptManifest, zPkgManagerRunScriptOpts] as [
          manifest: typeof zRunScriptManifest,
          opts: typeof zPkgManagerRunScriptOpts,
        ]),
        z.promise(zRunScriptResult),
      )
      .describe(
        'Runs one or more scripts against packages installed from tarballs',
      ),
  );

export const zPackageManager = z
  .object({
    install: zPkgManagerInstallMethod,
    pack: zPkgManagerPackMethod,
    runScript: zPkgManagerRunScriptMethod,
    spec: zPkgManagerSpec.readonly(),
    tmpdir: zNonEmptyString.readonly(),
  })
  .describe(
    'Provides functionality to pack, install, and run custom scripts in packages; has an Executor',
  );

export type PkgManager = z.infer<typeof zPackageManager>;

export type PkgManagerInstallMethod = (
  installManifests: InstallManifest[],
) => Promise<ExecResult>;

export type PkgManagerPackMethod = (
  opts: PackOptions,
) => Promise<InstallManifest[]>;
export type PkgManagerRunScriptOpts = z.infer<typeof zPkgManagerRunScriptOpts>;

export type PkgManagerRunScriptMethod = (
  runScriptManifest: RunScriptManifest,
  opts?: PkgManagerRunScriptOpts,
) => Promise<RunScriptResult>;

export const zBasePkgManagerInstallManifest = zBaseInstallManifest
  .extend({
    isAdditional: z
      .boolean()
      .optional()
      .describe(
        'True if this manifest was from an extra dep specified by --add',
      ),
    pkgManager: zPackageManager,
  })
  .describe(
    'Tells a PackageManager what package to install where from which tarball',
  );

export const zPkgManagerInstallManifest =
  customSchema<PkgManagerInstallManifest>(zBasePkgManagerInstallManifest);

export const zControllerRunScriptManifest =
  customSchema<PkgManagerRunScriptManifest>(
    zBasePkgManagerInstallManifest.setKey('script', zNonEmptyString),
  );

export interface PkgManagerInstallManifest extends InstallManifest {
  isAdditional?: boolean;
  pkgManager: PkgManager;
}

export const zSemVer = instanceofSchema(SemVer);

export const zRange = instanceofSchema(Range);

export const zPkgManagerOpts = z
  .object({
    /**
     * If `true`, show STDERR/STDOUT from the package manager
     */
    verbose: z.boolean().optional(),
    /**
     * If `true`, ignore missing scripts
     */
    loose: z.boolean().optional(),
  })
  .optional();

export const zHelpers = customSchema<typeof Helpers>(z.any());

export const zPkgManagerFactory = z
  .function(z.tuple([zPkgManagerSpec, zExecutor, zHelpers, zPkgManagerOpts]))
  .returns(z.promise(zPackageManager));

export const zPkgManagerDef = z.object({
  /**
   * The name of the package manager's executable.
   */
  bin: zNonEmptyString,
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
    z
      .function(z.tuple([zSemVer] as [semver: typeof zSemVer]))
      .returns(z.boolean()),
    z.union([zNonEmptyString, zRange]),
  ]),
  lockfile: zNonEmptyString.optional(),
  /**
   * Creates a {@link PkgManager} object.
   */
  create: zPkgManagerFactory,
});

export type PkgManagerFactory = z.infer<typeof zPkgManagerFactory>;

export type PkgManagerDef = z.infer<typeof zPkgManagerDef>;

export const zPkgManagerInstallManifests = z.array(zPkgManagerInstallManifest);

export const zInstallResult = z.object({
  installManifests: zPkgManagerInstallManifests,
  rawResult: zExecResult,
});

export interface PkgManagerRunScriptManifest extends PkgManagerInstallManifest {
  script: string;
}

export type InstallResult = z.infer<typeof zInstallResult>;

export const zScriptRunnerOpts = z
  .object({
    signal: zAbortSignal.optional(),
  })
  .describe('Options for a ScriptRunner component');

export type ScriptRunnerOpts = z.infer<typeof zScriptRunnerOpts>;
