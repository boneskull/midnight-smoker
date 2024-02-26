import {
  PkgManagerSpecSchema,
  type PkgManagerSpec,
} from '#pkg-manager/pkg-manager-spec';
import {ExecResultSchema} from '#schema/exec-result';
import {InstallManifestSchema} from '#schema/install-manifest';
import {PackOptionsSchema} from '#schema/pack-options';
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
  customSchema,
} from '#util/schema-util';
import {z} from 'zod';

export type PkgManagerInstallFn = z.infer<typeof PkgManagerInstallFnSchema>;

export type PkgManagerPackFn = z.infer<typeof PkgManagerPackFnSchema>;

export type PkgManagerRunScriptFn = (
  runScriptManifest: RunScriptManifest,
  opts?: PkgManagerRunScriptFnOpts,
) => Promise<RunScriptResult>;

export type PkgManagerRunScriptFnOpts = z.infer<
  typeof PkgManagerRunScriptFnOptsSchema
>;

export const PkgManagerInstallFnSchema = z
  .function(
    z.tuple([z.array(InstallManifestSchema)]),
    z.promise(ExecResultSchema).describe('Result of installation attempt'),
  )
  .describe('Installs packages from tarballs as specified in the manifest');

export const PkgManagerPackFnSchema = z
  .function(
    z.tuple([PackOptionsSchema] as [opts: typeof PackOptionsSchema]),
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
      z.tuple([RunScriptManifestSchema, PkgManagerRunScriptFnOptsSchema] as [
        manifest: typeof RunScriptManifestSchema,
        opts: typeof PkgManagerRunScriptFnOptsSchema,
      ]),
      z.promise(RunScriptResultSchema),
    )
    .describe(
      'Runs one or more scripts against packages installed from tarballs',
    ),
);

export interface PkgManager {
  install: PkgManagerInstallFn;
  pack: PkgManagerPackFn;
  runScript: PkgManagerRunScriptFn;
  readonly spec: PkgManagerSpec;
  readonly tmpdir: string;
}

/**
 * Schema for a package manager implementation (returned by
 * {@link PkgManagerDef.create})
 *
 * @remarks
 * Zod doesn't play well with classes; this must be the value itself--not a
 * zod-parsed copy.
 */
export const PkgManagerSchema = customSchema<PkgManager>(
  z
    .object({
      install: PkgManagerInstallFnSchema,
      pack: PkgManagerPackFnSchema,
      runScript: PkgManagerRunScriptFnSchema,
      spec: PkgManagerSpecSchema.readonly(),
      tmpdir: NonEmptyStringSchema.readonly(),
    })
    .describe(
      'Provides functionality to pack, install, and run custom scripts in packages; has an Executor',
    ),
);
