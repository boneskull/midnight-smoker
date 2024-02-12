/**
 * Provides the `list` command, which lists available components
 *
 * @packageDocumentation
 */
import Debug from 'debug';
import {isString, orderBy} from 'lodash';
import path from 'node:path';
import terminalLink from 'terminal-link';
import {type Writable} from 'type-fest';
import type {
  ArgumentsCamelCase,
  Argv,
  InferredOptionTypes,
  PositionalOptions,
} from 'yargs';
import {kComponentId} from '../../component/component';
import {isBlessedPlugin} from '../../plugin/blessed';
import {Smoker} from '../../smoker';
import {createTable} from '../cli-util';
import {BaseCommand} from './base-cmd';
import {type GlobalOptionTypes} from './global-opts';
import {JsonOptions, type CommandOptionRecord} from './opts';

/**
 * Option types for the `list` command
 */
type ListOptionTypes = GlobalOptionTypes &
  InferredOptionTypes<Writable<typeof ListPositionals>> &
  InferredOptionTypes<Writable<typeof ListOptions>>;

export class ListCommand extends BaseCommand {
  public override aliases = ['ls'];
  public override command = 'list <component>';
  public override describe = 'List available components';

  public override builder(
    argv: Argv<GlobalOptionTypes>,
  ): Argv<ListOptionTypes> {
    return argv
      .positional('component', ListPositionals.component)
      .demandOption('component')
      .options(ListOptions);
  }

  public async handler(
    opts: ArgumentsCamelCase<ListOptionTypes>,
  ): Promise<void> {
    switch (opts.component) {
      case 'plugins':
        return ListCommand.listPlugins(opts);
      case 'pkg-managers':
        return ListCommand.listPkgManagers(opts);
      case 'reporters':
        return ListCommand.listReporters(opts);
      case 'rules':
        return ListCommand.listRules(opts);
    }
  }

  /**
   * Retrieves a list of package managers and displays them in a table format.
   * If the `json` option is provided, the list is outputted as JSON.
   *
   * @param opts - The options for listing package managers.
   * @returns A promise that resolves once the list is displayed.
   */
  private static async listPkgManagers(
    opts: ArgumentsCamelCase<ListOptionTypes>,
  ): Promise<void> {
    const pkgManagers = await Smoker.getPkgManagerDefs(opts);
    debug('Found %d pkg manager modules', pkgManagers.length);

    if (opts.json) {
      BaseCommand.writeJson(pkgManagers);
      return;
    }

    const table = createTable(
      pkgManagers.map((pm) => {
        const data: string[] = [pm.id, pm.bin];
        if (pm.supportedVersionRange) {
          if (isString(pm.supportedVersionRange)) {
            data.push(pm.supportedVersionRange);
          } else {
            data.push(pm.supportedVersionRange.raw);
          }
        }
        return data;
      }),
      ['Name', 'Executable', 'Accepts'],
    );

    BaseCommand.write(table);
  }

  /**
   * Lists the plugins based on the provided options.
   *
   * @param opts - The options for listing the plugins.
   * @returns A promise that resolves when the plugins are listed.
   */
  private static async listPlugins(
    opts: ArgumentsCamelCase<ListOptionTypes>,
  ): Promise<void> {
    const plugins = await Smoker.getPlugins(opts);
    debug('Found %d plugins', plugins.length);

    // blessed plugins first
    const sortedPlugins = orderBy(
      plugins,
      (plugin) => isBlessedPlugin(plugin.id),
      ['desc'],
    );

    if (opts.json) {
      BaseCommand.writeJson(sortedPlugins);
      return;
    }

    const table = createTable(
      sortedPlugins.map((plugin) => [
        isBlessedPlugin(plugin.id) ? '(built-in)' : plugin.id,
        plugin.version || '(n/a)',
        plugin.description || '(n/a)',
        path.relative(process.cwd(), plugin.entryPoint),
      ]),
      ['Name', 'Version', 'Description', 'Resolved'],
    );

    BaseCommand.write(table);
  }

  /**
   * Lists the available reporters.
   *
   * @param opts - The options for listing reporters.
   * @returns A promise that resolves when the reporters have been listed.
   */
  private static async listReporters(
    opts: ArgumentsCamelCase<ListOptionTypes>,
  ): Promise<void> {
    const reporters = await Smoker.getReporters(opts);
    debug('Found %d reporters', reporters.length);

    if (opts.json) {
      BaseCommand.writeJson(reporters);
      return;
    }

    const table = createTable(
      reporters.map((reporter) => [
        reporter.name,
        reporter.description,
        isBlessedPlugin(reporter[kComponentId].pluginName)
          ? '(built-in)'
          : reporter[kComponentId].pluginName,
      ]),
      ['Name', 'Description', 'Plugin'],
    );

    BaseCommand.write(table);
  }

  /**
   * Lists the rules based on the provided options.
   *
   * @param opts - The options for listing the rules.
   * @returns A promise that resolves once the rules are listed.
   */
  private static async listRules(
    opts: ArgumentsCamelCase<ListOptionTypes>,
  ): Promise<void> {
    const rules = await Smoker.getRules(opts);

    const headers =
      terminalLink.isSupported && !opts.json
        ? ['Name', 'Description', 'Plugin']
        : ['Name', 'Description', 'Plugin', 'URL'];

    debug('Found %d rules', rules.length);

    if (opts.json) {
      BaseCommand.writeJson(rules);
      return;
    }

    const data = rules.map((rule) => {
      const ruleName =
        terminalLink.isSupported && rule.url
          ? terminalLink(rule.id, rule.url)
          : rule.id;
      const row: (undefined | string)[] = [
        ruleName,
        rule.description,
        isBlessedPlugin(rule[kComponentId].pluginName)
          ? '(built-in)'
          : rule[kComponentId].pluginName,
      ];
      if (!terminalLink.isSupported) {
        row.push(rule.url);
      }
      return row;
    });

    const table = createTable(data, headers);

    BaseCommand.write(table);
  }
}

const debug = Debug('midnight-smoker:cli:list');

/**
 * Positional options for the `list` command
 */
const ListPositionals = {
  component: {
    describe: 'Type of component to query',
    choices: ['plugins', 'pkg-managers', 'reporters', 'rules'],
    type: 'string',
  },
} as const satisfies Record<string, PositionalOptions>;

/**
 * Option for the `list` command
 */
const ListOptions = {
  ...JsonOptions,
} as const satisfies CommandOptionRecord;
