import Debug from 'debug';
import {lilconfig, type Options as LilconfigOpts} from 'lilconfig';
import {RawSmokerOptions} from './options/options';
import {toDualCasedObject} from './schema-util';

const debug = Debug('midnight-smoker:config');

async function loadEsm(filepath: string) {
  return import(filepath);
}

const DEFAULT_OPTS: Readonly<LilconfigOpts> = Object.freeze({
  loaders: {'.mjs': loadEsm, '.js': loadEsm},
  searchPlaces: [
    'package.json',
    '.smokerrc.json',
    '.smokerrc.js',
    '.smokerrc.cjs',
    '.smokerrc.mjs',
    'smoker.config.json',
    'smoker.config.js',
    'smoker.config.cjs',
    'smoker.config.mjs',
    '.config/smokerrc.json',
    '.config/smokerrc.js',
    '.config/smokerrc.cjs',
    '.config/smokerrc.mjs',
    '.config/smoker.config.json',
    '.config/smoker.config.js',
    '.config/smoker.config.cjs',
    '.config/smoker.config.mjs',
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
