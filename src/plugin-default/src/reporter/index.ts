import type {PluginAPI} from 'midnight-smoker/plugin';

import {ConsoleReporter} from './console.js';
import {ExitListener} from './exit.js';
import {JSONReporter} from './json.js';
import {ProgressReporter} from './progress.js';
import {SimpleReporter} from './simple.js';

export function loadReporters(api: PluginAPI) {
  api.defineReporter(ConsoleReporter);
  api.defineReporter(JSONReporter);
  api.defineReporter(ExitListener);
  api.defineReporter(ProgressReporter);
  api.defineReporter(SimpleReporter);
}

export {
  ConsoleReporter,
  ExitListener,
  JSONReporter,
  ProgressReporter,
  SimpleReporter,
};
