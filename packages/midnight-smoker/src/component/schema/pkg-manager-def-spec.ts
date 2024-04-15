import {PkgManagerDefSchema} from '#schema/pkg-manager-def';
import {PkgManagerSpecSchema} from '#schema/pkg-manager-spec';
import {z} from 'zod';

export const PkgManagerDefSpecSchema = z.object({
  spec: PkgManagerSpecSchema.readonly(),
  def: PkgManagerDefSchema,
});

export type PkgManagerDefSpec = z.infer<typeof PkgManagerDefSpecSchema>;
