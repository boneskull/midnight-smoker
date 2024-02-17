import Debug from 'debug';
import execa from 'execa';
import {PackedPackage} from 'midnight-smoker';
import {readFileSync} from 'node:fs';
import Module from 'node:module';
import path from 'node:path';
import {Consumers} from '../src';

const debug = Debug('midnight-smoker:plugin-typescript:test:harness');

const FIXTURE_PATH = path.join(__dirname, 'fixture', 'compat');
export function getFixturePkgName(fixtureName: string) {
  if (getFixturePkgName.cache.has(fixtureName)) {
    return getFixturePkgName.cache.get(fixtureName)!;
  }
  const result = JSON.parse(
    readFileSync(path.join(FIXTURE_PATH, fixtureName, 'package.json'), 'utf-8'),
  ).name;
  getFixturePkgName.cache.set(fixtureName, result);
  return result;
}
getFixturePkgName.cache = new Map<string, string>();

export function getFixturePath(fixtureName: string) {
  return path.join(FIXTURE_PATH, fixtureName);
}

export type Fixture = Readonly<{
  name: string;
  desc: string;
  failureModes: Record<keyof typeof Consumers, boolean | RegExp>;
}>;

const COREPACK_PATH = path.resolve(
  path.dirname(require.resolve('corepack/package.json')),
  '..',
  '.bin',
  'corepack',
);

const TSC_PATH = path.resolve(
  path.dirname(require.resolve('typescript/package.json')),
  '..',
  '.bin',
  'tsc',
);

/**
 * Wrapper around {@link execa} with some debug logging
 *
 * @param command - Command to execute
 * @param args - Arguments to pass to command
 * @param opts - Options if needed
 * @returns Result from {@link execa}
 */
async function exec(
  command: string,
  opts?: execa.Options,
): Promise<execa.ExecaReturnValue<string>>;
async function exec(
  command: string,
  args: string[],
  opts?: execa.Options,
): Promise<execa.ExecaReturnValue<string>>;
async function exec(
  command: string,
  argsOrOpts?: string[] | execa.Options,
  opts?: execa.Options,
) {
  let args: string[] | undefined;
  if (Array.isArray(argsOrOpts)) {
    args = argsOrOpts;
  } else if (argsOrOpts) {
    opts = argsOrOpts;
  }

  try {
    const result = await execa(command, args, opts);
    debug('Executed command %s', result.command);
    return result;
  } catch (err) {
    debug('Executed command %s', (err as execa.ExecaError).command);
    throw err;
  }
}

/**
 * Resolves module at `moduleId` from `fromDir` dir
 * @param moduleId - Module identifier
 * @param fromDir - Dir to resolve from; defaults to CWD
 * @returns Resolved module path
 */
export function resolveFrom(moduleId: string, fromDir = process.cwd()): string {
  return Module.createRequire(path.join(fromDir, 'index.js')).resolve(moduleId);
}

/**
 * @todo use something from midnight-smoker
 * @param dest
 * @param cwd
 * @returns
 */
export async function pack(dest: string, cwd: string) {
  const {stdout: packOut} = await exec(
    COREPACK_PATH,
    ['npm', 'pack', '--json', `--pack-destination=${dest}`],
    {cwd},
  );
  const packedPkgs = JSON.parse(packOut) as [{filename: string}];
  return path.join(dest, packedPkgs[0].filename);
}

/**
 * Runs `npm install <tarballFilepath>`
 *
 * @param pkgName - Package name; needed to resolve installation dir
 * @param tarballFilepath - Path to packed tarball
 * @param cwd - Directory to run `npm install` in
 * @returns The path to the package, as installed
 */
export async function install(
  pkgName: string,
  tarballFilepath: string,
  cwd: string,
) {
  await exec(COREPACK_PATH, ['npm', 'install', '--no-save', tarballFilepath], {
    cwd,
  });

  return path.dirname(resolveFrom(`${pkgName}/package.json`, cwd));
}

export async function makePackedPackage(
  {name}: Fixture,
  destDir: string,
): Promise<PackedPackage> {
  const pkgName = getFixturePkgName(name);
  const fixturePath = getFixturePath(name);
  const tarballFilepath = await pack(destDir, fixturePath);
  const installPath = await install(pkgName, tarballFilepath, destDir);

  return {
    pkgName,
    tarballFilepath,
    installPath,
  };
}

/**
 * Runs `tsc` in `cwd`
 * @param cwd - Directory to run `tsc` in
 * @returns Result from {@link exec}
 */
export async function compile(cwd: string) {
  return exec(TSC_PATH, {cwd});
}
