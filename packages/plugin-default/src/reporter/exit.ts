/**
 * Provides {@link ExitListener}
 *
 * @packageDocumentation
 */

import type * as Reporter from 'midnight-smoker/reporter';
import * as Rule from 'midnight-smoker/rule';
import {PassThrough} from 'stream';

const nullStream = new PassThrough();

function nonZeroExitListener() {
  process.exitCode = 1;
}

/**
 * "Exit" listener that sets the process exit code to 1 when certain events
 * occur.
 *
 * Does not output anything.
 */
export const ExitListener: Reporter.ReporterDef = {
  name: 'exit',
  when: () => true,
  isHidden: true,
  stdout: nullStream, // should never write to stdout
  stderr: nullStream, // should never write to stderr
  description: 'Determines when to set the process exit code to 1',
  onSmokeFailed: nonZeroExitListener,
  onPackFailed: nonZeroExitListener,
  onInstallFailed: nonZeroExitListener,
  onRuleError: nonZeroExitListener,
  onRunRuleFailed: (_, {config}) => {
    if (config.severity === Rule.RuleSeverities.Error) {
      nonZeroExitListener();
    }
  },
  onUnknownError: nonZeroExitListener,
};
