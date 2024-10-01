import {
  type StaticPkgManagerSpec,
  StaticPkgManagerSpecSchema,
} from '#schema/static-pkg-manager-spec';

export const isStaticPkgManagerSpec = (
  value: unknown,
): value is StaticPkgManagerSpec =>
  StaticPkgManagerSpecSchema.safeParse(value).success;
