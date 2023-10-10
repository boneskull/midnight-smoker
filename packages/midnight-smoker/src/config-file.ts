import Debug from 'debug';
import {lilconfig, type Options as LilconfigOpts} from 'lilconfig';
import {RawSmokerOptions} from './options';

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

  let opts: any = {};
  if (result?.config && !result.config.isEmpty) {
    debug('Found config at %s', result.filepath);
    opts = result.config;

    // I love ESM, really I do
    if ('default' in opts) {
      opts = opts.default;
    }
  }
  return opts;
}
