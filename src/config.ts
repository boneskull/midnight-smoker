import {z} from 'zod';
import createDebug from 'debug';
import {lilconfig, type Options as LilconfigOpts} from 'lilconfig';
import {castArray} from './util';
import {RuleConfigSchema} from './rules';

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

export const SmokerConfigSchema = z
  .object({
    add: z
      .union([z.string(), z.array(z.string())])
      .optional()
      .describe(
        'Add an extra package to the list of packages to be installed.',
      ),
    all: z
      .boolean()
      .optional()
      .describe(
        'Operate on all workspaces. The root workspace is omitted unless `includeRoot` is `true`.',
      ),
    bail: z.boolean().optional().describe('Fail on first script failure.'),
    includeRoot: z
      .boolean()
      .optional()
      .describe(
        'Operate on the root workspace. Only has an effect if `all` is `true`.',
      ),
    json: z.boolean().optional().describe('Output JSON only.'),
    linger: z
      .boolean()
      .optional()
      .describe('Do not delete temp directories after completion.'),
    verbose: z.boolean().optional().describe('Verbose logging.'),
    workspace: z
      .union([z.string(), z.array(z.string())])
      .optional()
      .describe('One or more workspaces to run scripts in.'),
    pm: z
      .union([z.string(), z.array(z.string())])
      .optional()
      .describe('Package manager(s) to use.'),
    script: z
      .union([z.string(), z.array(z.string())])
      .optional()
      .describe('Script(s) to run. Alias of `scripts`.'),
    scripts: z
      .union([z.string(), z.array(z.string())])
      .optional()
      .describe('Script(s) to run. Alias of `script`.'),
    loose: z
      .boolean()
      .optional()
      .describe('If `true`, fail if a workspace is missing a script.'),
    checks: z
      .boolean()
      .optional()
      .describe('If `false`, run no builtin checks.'),
    rules: RuleConfigSchema.optional().describe(
      'Rule configuration for checks',
    ),
  })
  .describe('midnight-smoker configuration file schema');

export type SmokerConfig = z.infer<typeof SmokerConfigSchema>;

/**
 * After normalization, `script` and `scripts` are merged into `scripts` and
 * some other props which can be `string | string[]` become `string[]`
 * @internal
 */
export interface NormalizedSmokerConfig extends SmokerConfig {
  add?: string[];
  workspace?: string[];
  pm?: string[];
  script?: never;
  scripts?: string[];
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

    // TODO actually use zod to validate this.
    // TODO also use transform or coerce or w/e to cast to array
    for (const key of ARRAY_KEYS) {
      const value = config[key];

      if (value) {
        config[key] = castArray(value);
      }
    }

    config.scripts = [...(config.script ?? []), ...(config.scripts ?? [])];
    delete config.script;

    debug('Loaded config: %O', config);
    return config as NormalizedSmokerConfig;
  }

  return {};
}
