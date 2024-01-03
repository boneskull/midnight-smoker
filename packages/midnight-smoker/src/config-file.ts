import Debug from 'debug';
import type {Loader, type Options as LilconfigOpts} from 'lilconfig';
import {lilconfig} from 'lilconfig';
import {justImport, importTs as loadTs} from './loader-util';
import type {RawSmokerOptions} from './options/options';
import {toDualCasedObject} from './schema-util';

const debug = Debug('midnight-smoker:config-file');

export const loadEsm: Loader = async (filepath): Promise<unknown> => {
  return await justImport(filepath);
};

const DEFAULT_OPTS: Readonly<LilconfigOpts> = Object.freeze({
  loaders: {'.mjs': loadEsm, '.js': loadEsm, '.ts': loadTs},
  searchPlaces: [
    'package.json',
    '.smokerrc.json',
    '.smokerrc.js',
    '.smokerrc.cjs',
    '.smokerrc.mjs',
    '.smokerrc.ts',
    'smoker.config.json',
    'smoker.config.js',
    'smoker.config.cjs',
    'smoker.config.mjs',
    'smoker.config.ts',
    '.config/smokerrc.json',
    '.config/smokerrc.js',
    '.config/smokerrc.cjs',
    '.config/smokerrc.mjs',
    '.config/smokerrc.ts',
    '.config/smoker.config.json',
    '.config/smoker.config.js',
    '.config/smoker.config.cjs',
    '.config/smoker.config.mjs',
    '.config/smoker.config.ts',
  ],
});

export async function readConfigFile(): Promise<RawSmokerOptions> {
  const result = await lilconfig('smoker', DEFAULT_OPTS).search();

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
