import {
  type KnownStaticPkgManagerSpec,
  KnownStaticPkgManagerSpecSchema,
} from '#schema/pkg-manager/static-pkg-manager-spec';

export const isKnownPkgManagerSpec = (
  value: unknown,
): value is KnownStaticPkgManagerSpec =>
  KnownStaticPkgManagerSpecSchema.safeParse(value).success;
