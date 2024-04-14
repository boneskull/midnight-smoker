/**
 * Provides {@link ExitListener}
 *
 * @packageDocumentation
 */

import {type ReporterDef} from 'midnight-smoker/reporter';
import {RuleSeverities} from 'midnight-smoker/rule';
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
export const ExitListener: ReporterDef = {
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
  onRuleFailed: (_, {config}) => {
    if (config.severity === RuleSeverities.Error) {
      nonZeroExitListener();
    }
  },
  onUnknownError: nonZeroExitListener,
};
