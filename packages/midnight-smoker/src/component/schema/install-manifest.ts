import {z} from 'zod';
import {NonEmptyStringSchema} from '../../util/schema-util';
import {PkgManagerSchema} from './pkg-manager';

export const InstallManifestSchema = z
  .object({
    cwd: NonEmptyStringSchema.describe('The working directory for the install'),
    installPath: NonEmptyStringSchema.optional().describe(
      'The path to install the package to; only applicable if spec is a tarball',
    ),
    pkgName: NonEmptyStringSchema.describe(
      'The name of the package to install',
    ),
    spec: NonEmptyStringSchema.describe('The package spec to install'),
  })
  .describe('Installation manifest (what to install and where)');

export type InstallManifest = z.infer<typeof InstallManifestSchema>;

// export const zInstallManifest = customSchema<InstallManifest>(
//   InstallManifestSchema,
// );
// /**
//  * Describes which packages to install and where to install them.
//  *
//  * This is returned by {@link PkgManager.pack} and passed to
//  * {@link PkgManager.install}.
//  */
// export interface InstallManifest {
//   /**
//    * The directory in which to install the package.
//    *
//    * This is the temp directory unique to the {@link PkgManager} and package.
//    */
//   cwd: string;
//   /**
//    * The directory in which the package should be installed.
//    *
//    * {@link PkgManager.pack} leaves this empty and {@link PkgManager.install}
//    * fills it in.
//    */
//   installPath?: string;
//   /**
//    * The name of the package to install.
//    */
//   pkgName: string;
//   /**
//    * Could be a tarball path or any other package spec understood by the package
//    * manager.
//    */
//   spec: string;
// }

export const PkgManagerInstallManifestSchema = InstallManifestSchema.extend({
  isAdditional: z
    .boolean()
    .optional()
    .describe('True if this manifest was from an extra dep specified by --add'),
  pkgManager: PkgManagerSchema,
}).describe(
  'Tells a PackageManager what package to install where from which tarball',
);

export type PkgManagerInstallManifest = z.infer<
  typeof PkgManagerInstallManifestSchema
>;
