import {PluginAPI} from 'midnight-smoker/plugin';
import compat from './rule/compat';

export * from './consumer';

const ruleDefs = [compat] as const;

export const plugin = ({createRule}: PluginAPI) => {
  for (const ruleDef of ruleDefs) {
    createRule(ruleDef);
  }
};
