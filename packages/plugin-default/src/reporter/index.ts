import type {PluginAPI} from 'midnight-smoker/plugin';
import {ConsoleReporter} from './console';
import {ExitListener} from './exit';
import {JSONReporter} from './json';
import {ProgressReporter} from './progress';

export function loadReporters(api: PluginAPI) {
  api.defineReporter(ConsoleReporter);
  api.defineReporter(JSONReporter);
  api.defineReporter(ExitListener);
  api.defineReporter(ProgressReporter);
}

export {ConsoleReporter, ExitListener, JSONReporter};
