import {StaticPkgManagerSpecSchema} from '#schema/static-pkg-manager-spec';
import {NonNegativeIntSchema} from '#util/schema-util';
import {z} from 'zod';

export type PkgManagerEventBase = z.infer<typeof PkgManagerEventBaseSchema>;

export const PkgManagerEventBaseSchema = z.object({
  currentPkgManager: NonNegativeIntSchema,
  totalPkgManagers: NonNegativeIntSchema,
  pkgManager: StaticPkgManagerSpecSchema,
});
