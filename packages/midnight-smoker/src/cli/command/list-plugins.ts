import Debug from 'debug';
import {orderBy} from 'lodash';
import path from 'node:path';
import {ArgumentsCamelCase} from 'yargs';
import {isBlessedPlugin} from '../../plugin/blessed';
import {Smoker} from '../../smoker';
import {GlobalOptionTypes} from '../cli-options';
import {createTable} from '../cli-util';
import {BaseCommand} from './base';

const debug = Debug('midnight-smoker:cli:list-plugins');

export class ListPluginsCommand extends BaseCommand {
  override command = 'list-plugins';
  override describe = 'Show plugin information';

  override async handler(
    opts: ArgumentsCamelCase<GlobalOptionTypes>,
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
}
