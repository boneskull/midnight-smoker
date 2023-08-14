import createDebug from 'debug';
import {lilconfig, type Options as LilconfigOpts} from 'lilconfig';
import {castArray} from './util';

const debug = createDebug('midnight-smoker:config');

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

export interface SmokerConfig {
  add?: string[] | string;
  all?: boolean;
  bail?: boolean;
  includeRoot?: boolean;
  json?: boolean;
  linger?: boolean;
  verbose?: boolean;
  workspace?: string[] | string;
  pm?: string[] | string;
  script?: string[] | string;
  scripts?: string[] | string;
}

export interface NormalizedSmokerConfig extends SmokerConfig {
  add?: string[];
  workspace?: string[];
  pm?: string[];
  script?: string[];

  scripts?: never;
}

type KeysWithValueType<T, V> = keyof {
  [P in keyof T as T[P] extends V ? P : never]: P;
};

const ARRAY_KEYS: Set<
  KeysWithValueType<NormalizedSmokerConfig, string[] | undefined>
> = new Set(['add', 'workspace', 'pm', 'script', 'scripts']);

export async function readConfig(): Promise<NormalizedSmokerConfig> {
  const result = await lilconfig('smoker', DEFAULT_OPTS).search();

  if (result?.config && !result.config.isEmpty) {
    debug('Found config at %s', result.filepath);
    let config: SmokerConfig = result.config;

    // I love ESM, really I do
    if ('default' in config) {
      config = (config as any).default;
    }

    // TODO better validation
    for (const key of ARRAY_KEYS) {
      const value = config[key];

      if (value) {
        config[key] = castArray(value);
      }
    }

    /**
     * consolidate these two because at least one script is required by the
     * CLI, and we will stuff `script` into `process.argv` if it is present
     * to avoid the failure case of no scripts being present.
     */
    config.script = [...(config.script ?? []), ...(config.scripts ?? [])];
    delete config.scripts;

    debug('Loaded config: %O', config);
    return config as NormalizedSmokerConfig;
  }

  return {};
}
