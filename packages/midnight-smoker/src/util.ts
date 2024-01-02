/**
 * Gotta have a "util" module
 *
 * @packageDocumentation
 */

import {isFunction, isObject} from 'lodash';
import type {Opaque} from 'type-fest';
import {readPackageJson} from './pkg-util';

/**
 * Regex string to match a package name.
 *
 * Used by {@linkcode PKG_NAME_REGEX} and {@linkcode PKG_NAME_WITH_SPEC_REGEX}.
 */
const PKG_NAME_REGEX_STR =
  '^(@[a-z0-9-~][a-z0-9-._~]*/)?[a-z0-9-~][a-z0-9-._~]*';

/**
 * Regex to match a package name without a spec
 */
const PKG_NAME_REGEX = new RegExp(`${PKG_NAME_REGEX_STR}$`);

/**
 * Regex to match a package name with a spec.
 *
 * @remarks
 * This does not attempt to validate a semver string, though it could. If it
 * did, it'd also need to allow any valid package tag. I'm not sure what the
 * latter is, but the former can be found on
 * {@link https://stackoverflow.com/a/72900791|StackOverflow}.
 */
const PKG_NAME_WITH_SPEC_REGEX = new RegExp(`${PKG_NAME_REGEX_STR}@.+$`);

/**
 * Fields in `package.json` that might have a dependency we want to install as
 * an isolated package to help run smoke tests.
 *
 * @remarks
 * Order is important; changing this should be a breaking change
 */
const DEP_FIELDS = [
  'devDependencies',
  'dependencies',
  'optionalDependencies',
  'peerDependencies',
] as const;

/**
 * Try to pick a version for a package to install.
 *
 * Given an `installable` which is both a) a valid npm package name and b) has
 * no version specifier, determine the version to install.
 *
 * If the `package.json` within `cwd` contains the package of the same name, we
 * will use that version; otherwise we will use the `latest` tag. If
 * `installable` is not a package name at all, it passes thru verbatim.
 *
 * @param installable The `thing` in `npm install <thing>`
 * @param cwd Where the command would be run
 */
export async function pickPackageVersion(
  installable: string,
  cwd = process.cwd(),
): Promise<string> {
  if (PKG_NAME_WITH_SPEC_REGEX.test(installable)) {
    // we were given a package name with a version spec. just use it
    return installable;
  }

  if (PKG_NAME_REGEX.test(installable)) {
    // we were given a package name, no version.
    // try to see if it's in the package.json
    const pkgName = installable;

    const {packageJson} = (await readPackageJson({cwd})) ?? {};
    if (packageJson) {
      for (const field of DEP_FIELDS) {
        const deps = packageJson[field];
        if (deps && pkgName in deps) {
          return `${pkgName}@${deps[pkgName]}`;
        }
      }
    }
    return `${pkgName}@latest`;
  }

  // could be a path or url
  return installable;
}

/**
 * A branded string referring to a unique identifier.
 */
export type UniqueId = Opaque<string, 'UniqueId'>;

/**
 * A function which generates a {@link UniqueId}
 */
export type UniqueIdFactory = () => UniqueId;

/**
 * Returns a {@link UniqueIdFactory}, which generates a unique ID each time it is
 * called.
 *
 * @param prefix - A prefix to prepend to each ID
 * @returns The unique ID factory, which makes this function factory factory.
 */
export function uniqueIdFactoryFactory(prefix = ''): UniqueIdFactory {
  let nextId = 0;

  return function generateId(): UniqueId {
    return `${prefix}${nextId++}` as UniqueId;
  };
}

function isSerializable<T>(value: T): value is T & {toJSON: () => unknown} {
  return isObject(value) && 'toJSON' in value && isFunction(value.toJSON);
}

/**
 * Serializes a value to JSON-able if it is serializable.
 *
 * This should be used where we have a `ThingOne` and a `ThingTwo implements
 * ThingOne` and `ThingTwo.toJSON()` returns a `ThingOne`, and we want the
 * `ThingOne` only. Yes, this is a convention.
 *
 * @param value - The value to be serialized.
 * @returns The serialized value if it is serializable, otherwise the original
 *   value.
 */
export function serialize<T>(value: T) {
  const serializableValue = value as T & {toJSON: () => T};
  if (isSerializable(value)) {
    return serializableValue.toJSON();
  }
  return value;
}
