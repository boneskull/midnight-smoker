/**
 * Provides {@link ExitListener}
 *
 * @packageDocumentation
 */

import * as Event from 'midnight-smoker/event';
import type * as Reporter from 'midnight-smoker/reporter';
import * as Rule from 'midnight-smoker/rule';
import {PassThrough} from 'stream';

const nullStream = new PassThrough();

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
  reporter: ({emitter}) => {
    const nonZeroExitListener = () => {
      process.exitCode = 1;
    };
    const {SmokerEvent} = Event;

    emitter
      .once(SmokerEvent.SmokeFailed, nonZeroExitListener)
      .once(SmokerEvent.PackFailed, nonZeroExitListener)
      .once(SmokerEvent.InstallFailed, nonZeroExitListener)
      .on(SmokerEvent.RuleError, nonZeroExitListener)
      .on(SmokerEvent.RunRuleFailed, ({config}) => {
        if (config.severity === Rule.RuleSeverities.Error) {
          nonZeroExitListener();
        }
      })
      .once(SmokerEvent.UnknownError, nonZeroExitListener);
  },
};
