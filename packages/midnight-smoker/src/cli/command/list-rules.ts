import Debug from 'debug';
import terminalLink from 'terminal-link';
import {ArgumentsCamelCase} from 'yargs';
import {kComponentId} from '../../component/component';
import {isBlessedPlugin} from '../../plugin/blessed';
import {Smoker} from '../../smoker';
import {GlobalOptionTypes} from '../cli-options';
import {createTable} from '../cli-util';
import {BaseCommand} from './base';

const debug = Debug('midnight-smoker:cli:list-rules');

export class ListRulesCommand extends BaseCommand {
  override command = 'list-rules';
  override describe = 'List available rules';

  override async handler(
    opts: ArgumentsCamelCase<GlobalOptionTypes>,
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
  }
}
