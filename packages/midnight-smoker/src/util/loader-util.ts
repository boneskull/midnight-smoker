import {isErrnoException} from '#util/error-util';
import {isError, isObject} from 'lodash';
import fs from 'node:fs/promises';
import {Module} from 'node:module';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import type {PackageJson} from 'type-fest';
import type {TranspileOptions} from 'typescript';

// eslint-disable-next-line @typescript-eslint/consistent-type-imports
let ts: typeof import('typescript');

function resolveTsConfig(directory: string): TranspileOptions | undefined {
  const filePath = ts.findConfigFile(directory, (fileName) => {
    return ts.sys.fileExists(fileName);
  });
  if (filePath !== undefined) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const {config, error} = ts.readConfigFile(filePath, (path) =>
      ts.sys.readFile(path),
    );
    if (error) {
      // eslint-disable-next-line @typescript-eslint/no-base-to-string
      throw new Error(`Error in ${filePath}: ${error.messageText.toString()}`);
    }
    return config as TranspileOptions;
  }
}

export const importTs = async (
  filepath: string,
  source?: string,
): Promise<unknown> => {
  if (ts === undefined) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    ts = require('typescript') as typeof ts;
  }

  source ??= await fs.readFile(filepath, 'utf8');

  const compiledFilepath = `${filepath.slice(0, -2)}mjs`;
  let transpiledContent;
  try {
    try {
      const config = resolveTsConfig(path.dirname(filepath)) ?? {};
      config.compilerOptions = {
        ...config.compilerOptions,
        module: ts.ModuleKind.ES2022,
        moduleResolution: ts.ModuleResolutionKind.Bundler,
        target: ts.ScriptTarget.ES2022,
        noEmit: false,
      };
      transpiledContent = ts.transpileModule(source, config).outputText;
      await fs.writeFile(compiledFilepath, transpiledContent);
    } catch (err) {
      if (isError(err)) {
        err.message = `TypeScript Error in ${filepath}:\n${err.message}`;
      }
      throw err;
    }
    return await justImport(compiledFilepath);
  } finally {
    await fs.rm(compiledFilepath, {force: true});
  }
};

/**
 * Attempts to gracefully load an unknown module.
 *
 * `await import()` on a CJS module will always return an object with a
 * `default` export. Modules which have been, say, compiled with TS into CJS and
 * _also_ have a default export will be wrapped in _another_ `default` property.
 * That sucks, but it can be avoided by just `require`-ing the CJS module
 * instead. We will still need to unwrap the `default` property if it exists.
 *
 * The `pkgJson` parameter is used to help us guess at the type of module we're
 * importing.
 *
 * @param moduleId - Resolved module identifier
 * @param pkgJson - `package.json` associated with the module, if any
 * @returns Hopefully, whatever is exported
 */
export async function justImport(
  moduleId: string | URL,
  pkgJson?: PackageJson,
) {
  // no zalgo here
  await Promise.resolve();
  if (moduleId instanceof URL) {
    moduleId = fileURLToPath(moduleId);
  }
  if (!path.isAbsolute(moduleId)) {
    // TODO throw SmokeError
    throw new TypeError('moduleId must be resolved');
  }

  if (path.extname(moduleId) === '.ts') {
    return await importTs(moduleId);
  }

  const maybeIsScript =
    pkgJson?.type !== 'module' || path.extname(moduleId) === '.cjs';

  let raw: unknown;
  if (maybeIsScript) {
    try {
      raw = require(moduleId);
    } catch (err) {
      if (isErrnoException(err)) {
        if (err.code !== 'ERR_REQUIRE_ESM') {
          throw err;
        }
      } else {
        throw err;
      }
    }
  }
  raw ??= await import(moduleId);
  // this catches the case where we `await import()`ed a CJS module despite our best efforts
  if (isErsatzESModule(raw) && 'default' in raw) {
    ({default: raw} = raw);
  }
  return raw;
}

/**
 * Type guard for a CJS module with an `__esModule` property
 *
 * @param value - Any value
 * @returns `true` if the value is an object with an `__esModule` property
 */

export function isErsatzESModule(value: unknown): value is {__esModule: true} {
  return isObject(value) && '__esModule' in value;
}

/**
 * Resolves module at `moduleId` from `fromDir` dir
 *
 * @param moduleId - Module identifier
 * @param fromDir - Dir to resolve from; defaults to CWD
 * @returns Resolved module path
 */

export function resolveFrom(
  moduleId: string | URL,
  fromDir: string | URL = process.cwd(),
): string {
  if (moduleId instanceof URL) {
    moduleId = fileURLToPath(moduleId);
  }
  if (fromDir instanceof URL) {
    fromDir = fileURLToPath(fromDir);
  }
  return Module.createRequire(path.join(fromDir, 'index.js')).resolve(moduleId);
}
