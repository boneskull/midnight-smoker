import {ALLOWED_DEFAULT_PKG_MANAGERS, SYSTEM} from '#constants';
import {NonEmptyStringSchema} from '#util/schema-util';
import {type LiteralUnion, type Merge, type SetRequired} from 'type-fest';
import {z} from 'zod';

export type PartialStaticPkgManagerSpec = Partial<StaticPkgManagerSpec>;

export type PartialStaticSystemPkgManagerSpec = Merge<
  PartialStaticPkgManagerSpec,
  Readonly<{requestedAs?: string; version: typeof SYSTEM}>
>;

export type StaticPkgManagerSpec = Readonly<{
  /**
   * Path to the package manager executable; if non-empty, this is considered a
   * "system" package manager
   */
  bin?: string;

  /**
   * The human readable label (with version) describing the spec
   */
  label: string;

  /**
   * The package manager name
   *
   * @defaultValue `npm`
   */
  name: string;

  /**
   * The "desired package manager spec" string
   */
  requestedAs?: string;

  /**
   * The version or dist-tag of the requested package manager.
   *
   * @defaultValue `latest`
   */
  version: LiteralUnion<typeof SYSTEM, string>;
}>;

export type SystemStaticPkgManagerSpec = SetRequired<
  StaticPkgManagerSpec,
  'bin'
>;

export type KnownStaticPkgManagerSpec = Merge<
  StaticPkgManagerSpec,
  {
    readonly name: typeof ALLOWED_DEFAULT_PKG_MANAGERS;
  }
>;

export function isPartialStaticSystemPkgManagerSpec(
  value: unknown,
): value is PartialStaticSystemPkgManagerSpec {
  return PartialStaticSystemPkgManagerSpecSchema.safeParse(value).success;
}

export function isKnownStaticPkgManagerSpec(
  value: unknown,
): value is KnownStaticPkgManagerSpec {
  return KnownStaticPkgManagerSpecSchema.safeParse(value).success;
}

export function isStaticPkgManagerSpec(
  value: unknown,
): value is StaticPkgManagerSpec {
  return StaticPkgManagerSpecSchema.safeParse(value).success;
}

export const SystemConstantSchema = z.literal(SYSTEM);

const BaseStaticPkgManagerSpecSchema = z.object({
  bin: NonEmptyStringSchema.optional(),
  label: NonEmptyStringSchema,
  name: NonEmptyStringSchema,
  requestedAs: NonEmptyStringSchema.optional(),
  version: NonEmptyStringSchema,
});

/**
 * @remarks
 * Used only for composition with other schemas.
 */
export const StaticPkgManagerSpecSchema =
  BaseStaticPkgManagerSpecSchema.readonly();

export const SystemStaticPkgManagerSpecSchema: z.ZodType<SystemStaticPkgManagerSpec> =
  BaseStaticPkgManagerSpecSchema.extend({
    bin: NonEmptyStringSchema,
    version: NonEmptyStringSchema.refine((value) => value !== SYSTEM),
  }).readonly();

export const AllowedDefaultPkgManagerNamesSchema = z.enum([
  ...ALLOWED_DEFAULT_PKG_MANAGERS,
]);

export const KnownStaticPkgManagerSpecSchema =
  BaseStaticPkgManagerSpecSchema.extend({
    name: AllowedDefaultPkgManagerNamesSchema,
  });

export const PartialStaticSystemPkgManagerSpecSchema: z.ZodType<
  Readonly<Partial<SystemStaticPkgManagerSpec>>
> = BaseStaticPkgManagerSpecSchema.partial()
  .extend({
    version: SystemConstantSchema,
  })
  .readonly();
