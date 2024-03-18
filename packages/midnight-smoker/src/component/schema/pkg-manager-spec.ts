import {PkgManagerSpec} from '#pkg-manager/pkg-manager-spec';
import {instanceofSchema} from '#util/schema-util';

/**
 * Schema for {@link PkgManagerSpec}
 */
export const PkgManagerSpecSchema = instanceofSchema(PkgManagerSpec);
