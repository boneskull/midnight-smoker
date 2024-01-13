import Debug from 'debug';
import type {Options as LilconfigOpts, Loader} from 'lilconfig';
import {lilconfig} from 'lilconfig';
import {justImport, importTs as loadTs} from './loader-util';
import type {RawSmokerOptions} from './options/options';
import {toDualCasedObject} from './schema-util';

const debug = Debug('midnight-smoker:config-file');

/**
 * JavaScript loader for `lilconfig`
 *
 * @param filepath - Path to file to load
 * @returns Whatever it is
 */
const loadEsm: Loader = async (filepath): Promise<unknown> => {
  return await justImport(filepath);
};

const BASE_CFG_FILENAMES = [
  '.smokerrc',
  'smoker.config',
  '.config/smokerrc',
  '.config/smoker.config',
] as const;

const DEFAULT_OPTS: Readonly<LilconfigOpts> = Object.freeze({
  loaders: {'.mjs': loadEsm, '.js': loadEsm, '.ts': loadTs},
  searchPlaces: [
    'package.json',
    ...BASE_CFG_FILENAMES.flatMap((name) => [
      `${name}.json`,
      `${name}.js`,
      `${name}.cjs`,
      `${name}.mjs`,
      `${name}.ts`,
    ]),
  ],
});

export async function readConfigFile(
  configFile?: string,
): Promise<RawSmokerOptions> {
  const lc = lilconfig('smoker', DEFAULT_OPTS);
  const result = await (configFile ? lc.load(configFile) : lc.search());

  let opts: RawSmokerOptions = {};
  if (result?.config && !result.isEmpty) {
    debug('Found config at %s', result.filepath);
    opts = result.config as RawSmokerOptions;

    // I love ESM, really I do
    if ('default' in opts) {
      opts = opts.default as RawSmokerOptions;
    }

    return toDualCasedObject(opts);
  }
  return opts;
}
