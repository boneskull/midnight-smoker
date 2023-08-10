import {lilconfig, type Options as LilconfigOpts} from 'lilconfig';

async function loadEsm(filepath: string) {
  return import(filepath);
}

const DEFAULT_OPTS: Readonly<LilconfigOpts> = Object.freeze({
  loaders: {'.mjs': loadEsm, '.js': loadEsm},
});

export interface SmokerConfig {
  add?: string[];
  all?: boolean;
  bail?: boolean;
  clean?: boolean;
  dir?: string;
  force?: boolean;
  includeRoot?: boolean;
  installArgs?: string[];
  json?: boolean;
  verbose?: boolean;
  workspace?: string[];
  pm?: string[];
  script?: string[];
}

export async function readConfig(): Promise<SmokerConfig> {
  const result = await lilconfig('smoker', DEFAULT_OPTS).search();

  if (result?.config && result.config.isEmpty) {
    return {};
  }

  if (result?.config?.default) {
    return result.config.default;
  }

  return result?.config ?? {};
}
