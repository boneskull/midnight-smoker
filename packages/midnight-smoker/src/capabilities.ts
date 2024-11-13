/**
 * "Capabilities" are kind of like DI "services", except that there's no service
 * locator. Instead, various functions may accept `capabilities` objects. Yeah,
 * the usual way.
 *
 * This is mainly useful for testing, but may find use by third parties.
 *
 * @packageDocumentation
 * @see `ExecFn` should also be used in this manner
 */

import type fs from 'node:fs';
import type os from 'node:os';

/**
 * A filesystem capabilities object.
 *
 * This should contain everything that `midnight-smoker` uses from `node:fs`.
 * This includes everything `midnight-smoker`'s _dependencies_ use from `fs` and
 * implies that those dependencies should accept `FsCapabilities` objects as
 * well (`glob` does!).
 *
 * @see `FileManager` for most usage (it should be _all_ usage)
 */
export type FsCapabilities = {
  promises: Pick<
    typeof fs.promises,
    | 'lstat'
    | 'mkdir'
    | 'mkdtemp'
    | 'readdir'
    | 'readFile'
    | 'readlink'
    | 'realpath'
    | 'rm'
    | 'stat'
    | 'writeFile'
  >;
} & Pick<typeof fs, 'existsSync' | 'readFileSync' | 'writeFileSync'>;

/**
 * An operating system capabilities object.
 *
 * This should contain everything that `midnight-smoker` uses from `node:os`.
 */
export type OsCapabilties = Pick<typeof os, 'homedir' | 'tmpdir'>;

/**
 * A function which resolves a module.
 *
 * Similar to `NodeRequire`
 */
export type ResolveFn = (moduleId: string, from?: string) => string;

/**
 * This should contain everything that `midnight-smoker` uses from `node:path`.
 *
 * @privateRemarks
 * Unfortunately, it doesn't. TODO: use this
 */
export type PathCapabilities = {
  dirname: DirnameFn;
  isAbsolute: IsAbsoluteFn;
};

export type IsAbsoluteFn = (path: string) => boolean;

export type DirnameFn = (path: string) => string;

/**
 * Loader capabilities. Used for dynamically loading modules (plugins, mostly or
 * entirely)
 */
export type LoaderCapabilities<T = unknown> = {
  importer?: ImportFn<T>;
  resolve?: ResolveFn;
};

/**
 * A function that imports a module asynchronously (like `import()`)
 */

export type ImportFn<T = unknown> = (moduleId: string | URL) => Promise<T>;
