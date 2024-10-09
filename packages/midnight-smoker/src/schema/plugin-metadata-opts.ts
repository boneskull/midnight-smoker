import {TRANSIENT} from '#constants';
import {NonEmptyStringSchema} from '#util/schema-util';
import path from 'node:path';
import {type LiteralUnion, type SetRequired} from 'type-fest';
import {z} from 'zod';

import {NormalizedPackageJsonSchema, type PackageJson} from './package-json';

export type PluginMetadataOpts = {
  description?: string;

  /**
   * Path to plugin entry point. If a `string`, it should be absolute
   */
  entryPoint: LiteralUnion<typeof TRANSIENT, string>;
  id?: string;
  pkgJson?: PackageJson;
  requestedAs?: string;
  version?: string;
};

export type NormalizedPluginMetadataOpts = SetRequired<
  PluginMetadataOpts,
  'id'
>;

export const PluginMetadataOptsSchema = z
  .object({
    description: NonEmptyStringSchema.optional(),
    entryPoint: z.literal(TRANSIENT).or(
      NonEmptyStringSchema.refine((value) => path.isAbsolute(value), {
        message: 'entryPoint must be an absolute path',
      }),
    ),
    id: NonEmptyStringSchema.optional(),
    pkgJson: NormalizedPackageJsonSchema.optional(),
    requestedAs: NonEmptyStringSchema.optional(),
    version: NonEmptyStringSchema.optional(),
  })
  .transform((opts) => ({
    ...opts,
    id: opts.id ?? opts.pkgJson?.name ?? path.basename(opts.entryPoint),
  }));
