import Debug from 'debug';
import terminalLink from 'terminal-link';
import type {ArgumentsCamelCase, Argv} from 'yargs';
import {hideBin} from 'yargs/helpers';
import yargs from 'yargs/yargs';
import {createTable, mergeOptions} from './cli-util';
import {kComponentId} from './component/component';
import {readConfigFile} from './config-file';
import {DEFAULT_PACKAGE_MANAGER_SPEC} from './constants';
import {isSmokerError} from './error/base-error';
import {NotImplementedError} from './error/common-error';
import {isBlessedPlugin} from './plugin/blessed';
import {Smoker} from './smoker';
import {readSmokerPkgJson} from './util';

const debug = Debug('midnight-smoker:cli');

const BEHAVIOR_GROUP = 'Behavior:';

/**
 * Reusable config for array-type options
 */
const ARRAY_OPT_CFG = {
  requiresArg: true,
  array: true,
  type: 'string',
} as const;

/**
 * The `plugin` option is needed by all commands
 */
const PLUGIN_OPT = {
  alias: ['P', 'plugins'],
  describe: 'Plugin(s) to use',
  group: BEHAVIOR_GROUP,
  ...ARRAY_OPT_CFG,
} as const;

/**
 * Main entry point for the CLI script
 *
 * @param args Raw command-line arguments array
 */
async function main(args: string[]): Promise<void> {
  const y = yargs(args);
  const [pkgJson, config] = await Promise.all([
    readSmokerPkgJson(),
    readConfigFile(),
  ]);

  /**
   * Merges parsed `argv` with the loaded `config` object--with `argv` taking
   * precedence--and assigns the result to `argv`.
   *
   * @template T - Type of the parsed `argv` object
   * @param argv - Parsed options from `yargs`
   */
  const mergeOpts = <T extends ArgumentsCamelCase<any>>(argv: T) => {
    mergeOptions(argv, config);
  };

  /**
   * A {@link yargs.CommandBuilder} which adds the `--plugin` option.
   *
   * @remarks
   * This is here because the `@types/yargs` does not understand "global"
   * options; we have to add it to each command.
   * @param yargs - Yargs instance
   * @returns The modified `yargs` instance
   */
  const builderWithPlugins = <T extends Argv<U>, U>(yargs: T) =>
    yargs.options({
      plugin: PLUGIN_OPT,
    });

  await y
    .scriptName('smoker')
    .command(
      '* [scripts..]',
      'Run tests against a package as it would be published',
      (yargs) =>
        yargs
          .positional('scripts', {
            describe: 'Custom script(s) to run (from package.json)',
            type: 'string',
          })
          // WARNING: do not use yargs' default values. they will override
          // any settings in config files.
          .options({
            add: {
              describe: 'Additional dependency to provide to script(s)',
              group: BEHAVIOR_GROUP,
              ...ARRAY_OPT_CFG,
            },
            all: {
              describe: 'Run in all workspaces',
              group: BEHAVIOR_GROUP,
              type: 'boolean',
            },
            bail: {
              alias: ['fail-fast'],
              describe: 'When running scripts, halt on first error',
              group: BEHAVIOR_GROUP,
              type: 'boolean',
            },
            'include-root': {
              describe: "Include the workspace root; must provide '--all'",
              group: BEHAVIOR_GROUP,
              implies: 'all',
              type: 'boolean',
            },
            json: {
              describe: 'Output JSON only. Alias for "--reporter=json"',
              group: BEHAVIOR_GROUP,
              type: 'boolean',
            },
            linger: {
              describe: 'Do not clean up temp dir(s) after completion',
              group: BEHAVIOR_GROUP,
              hidden: true,
              type: 'boolean',
            },
            'pkg-manager': {
              alias: ['p', 'pm'],
              describe: 'Use a specific package manager',
              group: BEHAVIOR_GROUP,
              defaultDescription: DEFAULT_PACKAGE_MANAGER_SPEC,
              ...ARRAY_OPT_CFG,
            },
            loose: {
              alias: 'if-present',
              describe: 'Ignore missing scripts (used with --all)',
              type: 'boolean',
              group: BEHAVIOR_GROUP,
              implies: 'all',
            },
            workspace: {
              alias: ['w'],
              describe: 'Run script in a specific workspace or workspaces',
              group: BEHAVIOR_GROUP,
              ...ARRAY_OPT_CFG,
            },
            checks: {
              alias: 'check',
              describe: 'Run built-in checks',
              group: BEHAVIOR_GROUP,
              type: 'boolean',
              defaultDescription: 'true',
            },
            reporter: {
              alias: ['r'],
              describe: 'Reporter(s) to use',
              group: BEHAVIOR_GROUP,
              defaultDescription: 'console',
              ...ARRAY_OPT_CFG,
            },
            plugin: PLUGIN_OPT,
            verbose: {
              describe: 'Enable verbose output',
              type: 'boolean',
              default: Debug.enabled('midnight-smoker'),
              global: true,
            },
          }),
      async (opts) => {
        if (opts.pkgManager?.some((pm) => pm.startsWith('pnpm'))) {
          throw new NotImplementedError('pnpm is currently unsupported');
        }

        debug('Final raw options: %O', opts);

        // opts should _not_ be used after this.
        let smoker: Smoker;
        try {
          smoker = await Smoker.create(opts);
          debug('Final options: %O', smoker.opts);
        } catch (err) {
          if (isSmokerError(err)) {
            if (opts.json || opts.reporter?.includes('json')) {
              console.log(err.toJSON());
            } else {
              console.error(err.format(opts.verbose));
            }
            process.exitCode = 1;
            return;
          } else {
            throw err;
          }
        }
        await smoker.smoke();
      },
      [mergeOpts],
    )
    .command(
      'list-reporters',
      'List available reporters',
      builderWithPlugins,
      async (opts) => {
        const reporters = await Smoker.getReporters(opts);

        const table = createTable(
          reporters.map((reporter) => [
            reporter.name,
            reporter.description,
            isBlessedPlugin(reporter[kComponentId].pluginName)
              ? '(builtin)'
              : reporter[kComponentId].pluginName,
          ]),
          ['Name', 'Description', 'Plugin'],
        );

        console.log(`${table}`);
      },
      [mergeOpts],
    )
    .command(
      'list-rules',
      'List available rules',
      builderWithPlugins,
      async (opts) => {
        const rules = await Smoker.getRules(opts);

        const headers = terminalLink.isSupported
          ? ['Name', 'Description', 'Plugin']
          : ['Name', 'Description', 'Plugin', 'URL'];

        const data = rules.map((rule) => {
          const row: (undefined | string)[] = [
            rule.toString(),
            rule.description,
            isBlessedPlugin(rule[kComponentId].pluginName)
              ? '(builtin)'
              : rule[kComponentId].pluginName,
          ];
          if (!terminalLink.isSupported) {
            row.push(rule.url);
          }
          return row;
        });

        const table = createTable(data, headers);

        console.log(`${table}`);
      },
      [mergeOpts],
    )
    .epilog(`For more info, visit ${pkgJson.homepage}\n`)
    .showHelpOnFail(false)
    .help()
    .strict()
    .parseAsync();
}

main(hideBin(process.argv)).catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
