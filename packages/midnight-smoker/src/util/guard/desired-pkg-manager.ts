import {
  type DesiredPkgManager,
  DesiredPkgManagerSchema,
} from '#schema/pkg-manager/desired-pkg-manager';

export function isDesiredPkgManager(
  value: unknown,
): value is DesiredPkgManager {
  return DesiredPkgManagerSchema.safeParse(value).success;
}
