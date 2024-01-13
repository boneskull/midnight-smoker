import Debug from 'debug';
import {isFunction, orderBy} from 'lodash';
import path from 'node:path';
import terminalLink from 'terminal-link';
import type {ArgumentsCamelCase, Argv} from 'yargs';
import {kComponentId} from '../../component/component';
import {isBlessedPlugin} from '../../plugin/blessed';
import {Smoker} from '../../smoker';
import type {CommonOptionTypes, GlobalOptionTypes} from '../cli-options';
import {CommonOptions} from '../cli-options';
import {createTable} from '../cli-util';
import {BaseCommand} from './base';

const debug = Debug('midnight-smoker:cli:list');

export class ListCommand extends BaseCommand {
  override aliases = ['ls'];
  override command = 'list <component>';
  override describe = 'Show available components';

  override builder(argv: Argv<GlobalOptionTypes>): Argv<CommonOptionTypes> {
    return argv
      .positional('component', {
        describe: 'Type of component to query',
        choices: ['plugins', 'pkg-managers', 'reporters', 'rules'],
        type: 'string',
      })
      .demandOption('component')
      .options(CommonOptions);
  }

  async handler(opts: ArgumentsCamelCase<CommonOptionTypes>): Promise<void> {
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

  static async listPkgManagers(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    opts: ArgumentsCamelCase<CommonOptionTypes>,
  ): Promise<void> {
    const pkgManagers = await Smoker.getPkgManagerDefs(opts);
    debug('Found %d pkg manager modules', pkgManagers.length);
    const table = createTable(
      pkgManagers.map((pm) => {
        const data: string[] = [pm.id, pm.bin];
        if (!isFunction(pm.accepts)) {
          // eslint-disable-next-line @typescript-eslint/no-base-to-string
          data.push(`${pm.accepts}`);
        }
        return data;
      }),
      ['Name', 'Executable', 'Accepts'],
    );

    console.log(`${table}`);
  }

  static async listReporters(
    opts: ArgumentsCamelCase<CommonOptionTypes>,
  ): Promise<void> {
    const reporters = await Smoker.getReporters(opts);
    debug('Found %d reporters', reporters.length);
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

    console.log(`${table}`);
  }

  static async listPlugins(
    opts: ArgumentsCamelCase<CommonOptionTypes>,
  ): Promise<void> {
    const plugins = await Smoker.getPlugins(opts);
    debug('Found %d plugins', plugins.length);

    // blessed plugins first
    const sortedPlugins = orderBy(
      plugins,
      (plugin) => isBlessedPlugin(plugin.id),
      ['desc'],
    );

    const table = createTable(
      sortedPlugins.map((plugin) => [
        isBlessedPlugin(plugin.id) ? '(built-in)' : plugin.id,
        plugin.version || '(n/a)',
        plugin.description || '(n/a)',
        path.relative(process.cwd(), plugin.entryPoint),
      ]),
      ['Name', 'Version', 'Description', 'Resolved'],
    );

    console.log(`${table}`);
  }

  static async listRules(
    opts: ArgumentsCamelCase<CommonOptionTypes>,
  ): Promise<void> {
    const rules = await Smoker.getRules(opts);

    const headers = terminalLink.isSupported
      ? ['Name', 'Description', 'Plugin']
      : ['Name', 'Description', 'Plugin', 'URL'];

    debug('Found %d rules', rules.length);

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

    console.log(`${table}`);
  }
}
