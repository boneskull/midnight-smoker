import {DEFAULT_PKG_MANAGER_VERSION, SYSTEM} from '#constants';
import {
  type PartialStaticSystemPkgManagerSpec,
  PartialStaticSystemPkgManagerSpecSchema,
  type StaticPkgManagerSpec,
  StaticPkgManagerSpecSchema,
  SystemConstantSchema,
} from '#schema/pkg-manager/static-pkg-manager-spec';
import {NonEmptyStringSchema} from '#schema/util/util';
import {type LiteralUnion} from 'type-fest';
import {z} from 'zod';

export type DesiredPkgManager = LiteralUnion<typeof SYSTEM, string>;

export function parseDesiredPkgManagerSpec(
  desiredSpec: `${string}@${typeof SYSTEM}` | typeof SYSTEM,
): PartialStaticSystemPkgManagerSpec;

export function parseDesiredPkgManagerSpec(
  desiredSpec: string,
): StaticPkgManagerSpec;

export function parseDesiredPkgManagerSpec(desiredSpec: DesiredPkgManager) {
  return PartialPkgManagerSpecFromDesiredSchema.parse(desiredSpec);
}

/**
 * The regex that {@link PkgManagerSpec.parse} uses to test if a string is of the
 * form `<package>@<version|tag>`
 */
const PKG_MANAGER_SPEC_REGEX = /^([^@]+?)(?:@([^@]+))?$/;

export const DesiredPkgManagerSchema = SystemConstantSchema.or(
  NonEmptyStringSchema.regex(
    PKG_MANAGER_SPEC_REGEX,
    `Must be of the form <name> or <name>@<version>`,
  ),
);

const RawDesiredPkgManagerSchema =
  NonEmptyStringSchema.or(SystemConstantSchema);

export const BaseNameAndVersionSchema = z.object({
  name: RawDesiredPkgManagerSchema,
  requestedAs: NonEmptyStringSchema,
  version: RawDesiredPkgManagerSchema.optional(),
});

export const NameAndVersionSchema = DesiredPkgManagerSchema.transform(
  (value) => {
    if (value === SYSTEM) {
      return {name: SYSTEM, requestedAs: SYSTEM};
    }
    const matches = value.match(PKG_MANAGER_SPEC_REGEX)!;
    const [name, version] = matches.slice(1, 3);
    return version
      ? {name, requestedAs: value, version}
      : {name, requestedAs: value};
  },
).pipe(BaseNameAndVersionSchema);

export const PartialPkgManagerSpecFromDesiredSchema =
  NameAndVersionSchema.transform(({name, requestedAs, version}) => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    if (name === SYSTEM) {
      const partialSystemSpec: PartialStaticSystemPkgManagerSpec = {
        requestedAs,
        version: SYSTEM,
      };
      return partialSystemSpec;
    }
    if (version === SYSTEM) {
      const partialSystemSpec: PartialStaticSystemPkgManagerSpec = {
        name,
        requestedAs,
        version,
      };
      return partialSystemSpec;
    }
    if (version) {
      const spec: StaticPkgManagerSpec = {
        label: `${name}@${version}`,
        name,
        requestedAs,
        version,
      };
      return spec;
    }
    const spec: StaticPkgManagerSpec = {
      label: `${name}@${DEFAULT_PKG_MANAGER_VERSION}`,
      name,
      requestedAs,
      version: DEFAULT_PKG_MANAGER_VERSION,
    };
    return spec;
  }).pipe(
    StaticPkgManagerSpecSchema.or(PartialStaticSystemPkgManagerSpecSchema),
  );
