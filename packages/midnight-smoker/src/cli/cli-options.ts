import Debug from 'debug';
import type {InferredOptionTypes, Options} from 'yargs';
import {DEFAULT_PACKAGE_MANAGER_SPEC} from '../constants';

export const OUTPUT_GROUP = 'Output:';
export const INPUT_GROUP = 'Input:';

/**
 * Reusable config for array-type options
 */
export const ARRAY_OPT_CFG = {
  requiresArg: true,
  nargs: 1,
  array: true,
  string: true,
} as const;

/**
 * The `plugin` option is needed by all commands
 */
export const PLUGIN_OPT = {
  alias: ['P', 'plugins'],
  describe: 'Plugin(s) to use',
  ...ARRAY_OPT_CFG,
  global: true,
  requiresArg: true,
  nargs: 1,
} as const;

export const GlobalOptions = {plugin: PLUGIN_OPT} as const satisfies Record<
  string,
  Options
>;

export const CommonOptions = {
  all: {
    describe: 'Run in all workspaces',
    group: INPUT_GROUP,
    boolean: true,
  },
  'include-root': {
    describe: "Include the workspace root; must provide '--all'",
    implies: 'all',
    group: INPUT_GROUP,
    type: 'boolean',
  },
  json: {
    describe: 'Output JSON only. Alias for "--reporter=json"',
    group: OUTPUT_GROUP,
    boolean: true,
  },
  linger: {
    describe: 'Do not clean up temp dir(s) after completion',
    group: OUTPUT_GROUP,
    hidden: true,
    boolean: true,
  },
  workspace: {
    alias: ['w'],
    describe: 'Run script in a specific workspace or workspaces',
    group: INPUT_GROUP,
    ...ARRAY_OPT_CFG,
  },
  'pkg-manager': {
    alias: ['p', 'pm'],
    describe: 'Use a specific package manager',
    group: INPUT_GROUP,
    defaultDescription: DEFAULT_PACKAGE_MANAGER_SPEC,
    ...ARRAY_OPT_CFG,
  },
  reporter: {
    alias: ['r'],
    describe: 'Reporter(s) to use',
    group: OUTPUT_GROUP,
    defaultDescription: 'console',
    ...ARRAY_OPT_CFG,
  },
  verbose: {
    describe: 'Enable verbose output',
    boolean: true,
    default: Debug.enabled('midnight-smoker'),
    group: OUTPUT_GROUP,
  },
} as const satisfies Record<string, Options>;

export type GlobalOptionTypes = InferredOptionTypes<typeof GlobalOptions>;

export type CommonOptionTypes = GlobalOptionTypes &
  InferredOptionTypes<typeof CommonOptions>;
