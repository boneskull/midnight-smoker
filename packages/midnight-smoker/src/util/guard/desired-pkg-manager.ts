import {
  type DesiredPkgManager,
  DesiredPkgManagerSchema,
} from '#schema/desired-pkg-manager';

export function isDesiredPkgManager(
  value: unknown,
): value is DesiredPkgManager {
  return DesiredPkgManagerSchema.safeParse(value).success;
}
