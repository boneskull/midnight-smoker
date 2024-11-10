/**
 * Provides the `list` command, which lists available components
 *
 * @packageDocumentation
 */
import {createTable} from '#cli/cli-util';
import {Smoker} from '#smoker';
import {createDebug} from '#util/debug';
import {formatUrl} from '#util/format';
import {isBlessedPlugin} from '#util/guard/blessed-plugin';
import {isString} from '#util/guard/common';
import {orderBy} from 'lodash';
import path from 'node:path';
import terminalLink from 'terminal-link';
import {type Writable} from 'type-fest';
import {
  type ArgumentsCamelCase,
  type Argv,
  type InferredOptionTypes,
  type PositionalOptions,
} from 'yargs';

import {BaseCommand} from './base-cmd';
import {type GlobalOptionTypes} from './global-opts';
import {type CommandOptionRecord, JsonOptions} from './opts';

/**
 * Option types for the `list` command
 */
type ListOptionTypes = GlobalOptionTypes &
  InferredOptionTypes<Writable<typeof ListOptions>> &
  InferredOptionTypes<Writable<typeof ListPositionals>>;

export class ListCommand extends BaseCommand {
  public override aliases = ['ls'];

  public override command = 'list <component>';

  public override describe = 'List available components';

  /**
   * Retrieves a list of package managers and displays them in a table format.
   * If the `json` option is provided, the list is outputted as JSON.
   *
   * @param rawSmokerOptions - The options for listing package managers.
   * @returns A promise that resolves once the list is displayed.
   */
  private static async listPkgManagers(
    rawSmokerOptions: ArgumentsCamelCase<ListOptionTypes>,
  ): Promise<void> {
    const smoker = await Smoker.create(rawSmokerOptions);
    const pkgManagers = smoker.getAllPkgManagers();
    debug('Found %d pkg manager components', pkgManagers.length);

    if (rawSmokerOptions.json) {
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
   * @param rawSmokerOptions - The options for listing the plugins.
   * @returns A promise that resolves when the plugins are listed.
   */
  private static async listPlugins(
    rawSmokerOptions: ArgumentsCamelCase<ListOptionTypes>,
  ): Promise<void> {
    const smoker = await Smoker.create(rawSmokerOptions);
    const plugins = smoker.getAllPlugins();
    debug('Found %d plugins', plugins.length);

    // blessed plugins first
    const sortedPlugins = orderBy(
      plugins,
      (plugin) => isBlessedPlugin(plugin.id),
      ['desc'],
    );

    if (rawSmokerOptions.json) {
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
    const smoker = await Smoker.create(opts);
    const reporters = smoker
      .getAllReporters()
      .filter((reporter) => !reporter.isHidden);
    debug('Found %d visible reporters', reporters.length);

    if (opts.json) {
      BaseCommand.writeJson(reporters);
      return;
    }

    const table = createTable(
      reporters.map((reporter) => {
        const pluginName = reporter.isBlessed
          ? '(built-in)'
          : reporter.pluginName;
        return [reporter.name, reporter.description, pluginName];
      }),
      ['Name', 'Description', 'Plugin'],
    );

    BaseCommand.write(table);
  }

  /**
   * Lists the rules based on the provided options.
   *
   * @param rawSmokerOptions - The options for listing the rules.
   * @returns A promise that resolves once the rules are listed.
   */
  private static async listRules(
    rawSmokerOptions: ArgumentsCamelCase<ListOptionTypes>,
  ): Promise<void> {
    const smoker = await Smoker.create(rawSmokerOptions);
    const rules = smoker.getAllRules();

    debug('Found %d rules', rules.length);

    if (smoker.smokerOptions.json) {
      BaseCommand.writeJson(rules);
      return;
    }

    const headers = terminalLink.isSupported
      ? ['Name', 'Description', 'Plugin']
      : ['Name', 'Description', 'Plugin', 'URL'];
    const data = rules.map((rule) => {
      const ruleName = formatUrl(rule.id, rule.url, {fallback: false});
      const pluginName = rule.isBlessed ? '(built-in)' : rule.pluginName;
      const row: (string | undefined)[] = [
        ruleName,
        rule.description,
        pluginName,
      ];
      if (!terminalLink.isSupported) {
        row.push(rule.url);
      }
      return row;
    });

    const table = createTable(data, headers);

    BaseCommand.write(table);
  }

  public override builder(
    argv: Argv<GlobalOptionTypes>,
  ): Argv<ListOptionTypes> {
    return argv
      .positional('component', ListPositionals.component)
      .options(ListOptions);
  }

  public override async handler(
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
}

const debug = createDebug(__filename);

/**
 * Positional options for the `list` command
 */
const ListPositionals = {
  component: {
    choices: ['plugins', 'pkg-managers', 'reporters', 'rules'],
    demandOption: true,
    describe: 'Type of component to query',
    type: 'string',
  },
} as const satisfies Record<string, PositionalOptions>;

/**
 * Option for the `list` command
 */
const ListOptions = {
  ...JsonOptions,
} as const satisfies CommandOptionRecord;
