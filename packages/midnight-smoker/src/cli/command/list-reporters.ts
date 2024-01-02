import Debug from 'debug';
import {ArgumentsCamelCase} from 'yargs';
import {kComponentId} from '../../component/component';
import {isBlessedPlugin} from '../../plugin/blessed';
import {Smoker} from '../../smoker';
import {GlobalOptionTypes} from '../cli-options';
import {createTable} from '../cli-util';
import {BaseCommand} from './base';

const debug = Debug('midnight-smoker:cli:list-reporters');

export class ListReportersCommand extends BaseCommand {
  override command = 'list-reporters';
  override describe = 'List available reporters';

  override async handler(
    opts: ArgumentsCamelCase<GlobalOptionTypes>,
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
}
