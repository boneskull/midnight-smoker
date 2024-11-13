import {
  type KnownStaticPkgManagerSpec,
  KnownStaticPkgManagerSpecSchema,
} from '#schema/static-pkg-manager-spec';

export const isKnownPkgManagerSpec = (
  value: unknown,
): value is KnownStaticPkgManagerSpec =>
  KnownStaticPkgManagerSpecSchema.safeParse(value).success;
