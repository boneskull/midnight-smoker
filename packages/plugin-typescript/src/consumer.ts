/**
 * A "Consumer" is a transient package which consumes the package under test.
 * This is how we verify compatibility
 * @packageDocumentation
 */

import Debug from 'debug';
import type {PackedPackage} from 'midnight-smoker';
import {readFile, writeFile} from 'node:fs/promises';
import {dirname, join, parse} from 'node:path';

const debug = Debug('midnight-smoker:plugin-typescript:consumer');

export interface Consumer {
  baseDir: string;
  pkgJsonTpl: string;
  tsconfigTpl: string;
  entryPointTpl: string;
  type: 'module' | 'commonjs';
  desc: string;
}

interface ConsumerContent {
  packageJson: string;
  tsconfigJson: string;
  entryPoint: string;
}

const LEGACY_ESM_CONSUMER = {
  baseDir: join(__dirname, '..', 'template', 'legacy-esm'),
  pkgJsonTpl: 'package.json.tpl',
  tsconfigTpl: 'tsconfig.json.tpl',
  entryPointTpl: 'index.js.tpl',
  type: 'module',
  desc: 'an ESM package using legacy node module resolution',
} as const satisfies Consumer;

const NODE16_ESM_CONSUMER = {
  baseDir: join(__dirname, '..', 'template', 'node16-esm'),
  pkgJsonTpl: 'package.json.tpl',
  tsconfigTpl: 'tsconfig.json.tpl',
  entryPointTpl: 'index.js.tpl',
  type: 'module',
  desc: 'an ESM package using node16 module resolution',
} as const satisfies Consumer;

const LEGACY_CJS_CONSUMER = {
  baseDir: join(__dirname, '..', 'template', 'legacy-cjs'),
  pkgJsonTpl: 'package.json.tpl',
  tsconfigTpl: 'tsconfig.json.tpl',
  entryPointTpl: 'index.js.tpl',
  type: 'commonjs',
  desc: 'a CJS package using legacy node module resolution',
} as const satisfies Consumer;

const NODE16_CJS_CONSUMER = {
  baseDir: join(__dirname, '..', 'template', 'node16-cjs'),
  pkgJsonTpl: 'package.json.tpl',
  tsconfigTpl: 'tsconfig.json.tpl',
  entryPointTpl: 'index.js.tpl',
  type: 'commonjs',
  desc: 'a CJS package using node16 module resolution',
} as const satisfies Consumer;

export const Consumers = {
  'node16-cjs': NODE16_CJS_CONSUMER,
  'node16-esm': NODE16_ESM_CONSUMER,
  'legacy-cjs': LEGACY_CJS_CONSUMER,
  'legacy-esm': LEGACY_ESM_CONSUMER,
} as const;

export async function initConsumers(packedPkg: PackedPackage) {
  return Promise.all(
    Object.values(Consumers).map(async (consumer) => {
      // tricky: the dirname of the tarball filepath is the "package root";
      // the consumer will be rendered alongside it.
      const tmpDir = dirname(packedPkg.tarballFilepath);
      await initConsumer(consumer, packedPkg, tmpDir);
      return {...consumer, tmpDir};
    }),
  );
}

/**
 *
 * @param consumer
 * @returns
 * @internal
 */
async function readConsumer(consumer: Consumer): Promise<ConsumerContent> {
  const tasks = [
    readFile(join(consumer.baseDir, consumer.pkgJsonTpl), 'utf-8').then(
      JSON.parse,
    ),
    readFile(join(consumer.baseDir, consumer.tsconfigTpl), 'utf-8').then(
      JSON.parse,
    ),
    readFile(join(consumer.baseDir, consumer.entryPointTpl), 'utf-8'),
  ];

  // note the clever assignment of `cwd`
  const [packageJson, tsconfigJson, entryPoint] = await Promise.all(tasks);

  return {packageJson, tsconfigJson, entryPoint};
}

/**
 * Applies {@link PackedPackage} data to a template string
 *
 * This replaces:
 * - `%MODULE%` with {@link PackedPackage.pkgName}. This assumes it is
 *   resolvable from the eventual destination directory
 * @param template - Template
 * @param packedPkg - Packed package
 * @returns - Contents of template with variables replaced
 * @internal
 */
function applyTemplate(template: string, packedPkg: PackedPackage) {
  return template.replace(/%MODULE%/g, packedPkg.pkgName);
}

/**
 * Given a {@link Consumer} `consumer` and associated contents `content`, write
 * the consumer to `dest`.
 * @param consumer - Consumer to write
 * @param content - Contents of consumer (file content)
 * @param dest - Destination directory
 */
async function writeConsumer(
  consumer: Consumer,
  {entryPoint, packageJson, tsconfigJson}: ConsumerContent,
  dest: string,
): Promise<void> {
  await Promise.all([
    writeFile(
      join(dest, parse(consumer.entryPointTpl).name),
      entryPoint,
      'utf-8',
    ),
    writeFile(
      join(dest, 'package.json'),
      JSON.stringify(packageJson, null, 2),
      'utf-8',
    ),
    writeFile(
      join(dest, 'tsconfig.json'),
      JSON.stringify(tsconfigJson, null, 2),
      'utf-8',
    ),
  ]);
}

/**
 * Initializes a {@link Consumer} `consumer` configured to consume a
 * {@link PackedPackage} `packedPkg`.
 *
 * {@link PackedPackage.pkgName} must be resolvable from `dest`!
 *
 * @param consumer - Consumer to initialize
 * @param packedPkg - Packed package to configure Consumer for
 * @param dest - Destination directory
 * @returns Value of `dest`
 */
export async function initConsumer(
  consumer: Consumer,
  packedPkg: PackedPackage,
  dest: string,
): Promise<string> {
  const content = await readConsumer(consumer);

  // apply template to source file
  content.entryPoint = applyTemplate(content.entryPoint, packedPkg);

  await writeConsumer(consumer, content, dest);

  debug('Consumer from %s initialized in %s', consumer.baseDir, dest);

  return dest;
}
