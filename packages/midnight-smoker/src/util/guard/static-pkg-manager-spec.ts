import {
  type StaticPkgManagerSpec,
  StaticPkgManagerSpecSchema,
} from '#schema/pkg-manager/static-pkg-manager-spec';

export const isStaticPkgManagerSpec = (
  value: unknown,
): value is StaticPkgManagerSpec =>
  StaticPkgManagerSpecSchema.safeParse(value).success;
