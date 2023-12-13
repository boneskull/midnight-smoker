import {z} from 'zod';
import {zScriptError} from '../../error/error-schema';
import {ExecError} from '../../error/exec-error';
import {ScriptError} from '../../error/script-error';
import {customSchema, zAbortSignal, zNonEmptyString} from '../../schema-util';
import {ExecResult, zExecError, zExecResult} from './executor-schema';

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

export interface InstallManifest {
  cwd: string;
  installPath?: string;
  pkgName: string;
  spec: string;
}

export const zInstallManifests = z.array(zInstallManifest);
export const zPackOptions = customSchema<PackOptions>(
  z
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
    .describe('Options for a Packer component'),
);

export interface PackOptions {
  allWorkspaces?: boolean;
  includeWorkspaceRoot?: boolean;
  workspaces?: string[];
}

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

export const zPkgManagerRunScriptOpts = z.object({
  signal: zAbortSignal,
});

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

export const zInternalPackageManager = z
  .object({
    install: zPkgManagerInstallMethod,
    pack: zPkgManagerPackMethod,
    runScript: zPkgManagerRunScriptMethod,
    spec: zNonEmptyString.readonly(),
    tmpdir: zNonEmptyString.readonly(),
  })
  .describe(
    'Provides functionality to pack, install, and run custom scripts in packages; has an Executor',
  );

export const zPackageManager = customSchema<PackageManager>(
  zInternalPackageManager,
);

export type PkgManagerInstallMethod = (
  installManifests: InstallManifest[],
) => Promise<ExecResult>;

export type PkgManagerPackMethod = (
  opts: PackOptions,
) => Promise<InstallManifest[]>;
export type PkgManagerRunScriptOpts = z.infer<typeof zPkgManagerRunScriptOpts>;

export type PkgManagerRunScriptMethod = (
  runScriptManifest: RunScriptManifest,
  opts: PkgManagerRunScriptOpts,
) => Promise<RunScriptResult>;

export interface PackageManager {
  install: PkgManagerInstallMethod;
  pack: PkgManagerPackMethod;
  runScript: PkgManagerRunScriptMethod;
  spec: string;
  tmpdir: string;
}

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
  pkgManager: PackageManager;
}

export const zPkgManagerInstallManifests = z.array(zPkgManagerInstallManifest);

export const zInstallResult = z.object({
  installManifests: zPkgManagerInstallManifests,
  rawResult: zExecResult,
});

export interface PkgManagerRunScriptManifest extends PkgManagerInstallManifest {
  script: string;
}
export type InstallResult = z.infer<typeof zInstallResult>;
