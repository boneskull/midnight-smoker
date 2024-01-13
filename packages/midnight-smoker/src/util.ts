/**
 * Gotta have a "util" module
 *
 * @packageDocumentation
 */

import {type ExecaError} from 'execa';
import {isError, isFunction, isObject} from 'lodash';
import type {Opaque} from 'type-fest';
import z from 'zod';
import {readPackageJson} from './pkg-util';
import {instanceofSchema} from './schema-util';

/**
 * Regex string to match a package name.
 *
 * Used by {@link PKG_NAME_REGEX} and {@link PKG_NAME_WITH_SPEC_REGEX}.
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

export interface Serializable<T = unknown> {
  toJSON(): T;
}

/**
 * Type guard for an object with a `toJSON` method.
 *
 * @param value Any value
 * @returns - `true` if `value` is an object with a `toJSON` method
 */
export function isSerializable<T, U = unknown>(
  value: T,
): value is T & Serializable<U> {
  return isObject(value) && 'toJSON' in value && isFunction(value.toJSON);
}

/**
 * This is just the identity if `T` is not serializable.
 *
 * @param value - The value to be serialized.
 * @returns The original value.
 */
export function serialize<T>(value: T): T;

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
export function serialize<T extends Serializable<U>, U = unknown>(value: T): U;
export function serialize<T>(value: T) {
  if (isSerializable(value)) {
    return value.toJSON();
  }
  return value;
}

/**
 * Type guard for {@link NodeJS.ErrnoException}
 *
 * @param value - Any value
 * @returns `true` if `value` is an {@link NodeJS.ErrnoException}
 */
export function isErrnoException(
  value: unknown,
): value is NodeJS.ErrnoException {
  return isError(value) && 'code' in value;
}

const zExecaError = instanceofSchema(Error).pipe(
  z.object({
    command: z.string(),
    exitCode: z.number(),
    all: z.string().optional(),
    stderr: z.string(),
    stdout: z.string(),
    failed: z.boolean(),
  }),
);

/**
 * Type guard for an {@link ExecaError}.
 *
 * If there was a class exported, that'd be better, but there ain't.
 *
 * @param error - Any value
 * @returns `true` if `error` is an {@link ExecaError}
 */
export function isExecaError(error: unknown): error is ExecaError {
  return zExecaError.safeParse(error).success;
}
