/**
 * Provides {@link ExitListener}
 *
 * @packageDocumentation
 */

import Debug from 'debug';
import {once} from 'lodash';
import {type Reporter} from 'midnight-smoker/reporter';

const debug = Debug('midnight-smoker:plugin-default:reporter:exit');

const nonZeroExitListener = once(() => {
  process.exitCode = 1;
  debug('Set process exit code to 1');
});

/**
 * "Exit" listener that sets the process exit code to 1 when certain events
 * occur.
 *
 * Does not output anything.
 */
export const ExitListener: Reporter = {
  description: 'Determines when to set the process exit code to 1',
  isHidden: true,
  name: 'exit',
  onInstallFailed: nonZeroExitListener,
  onPackFailed: nonZeroExitListener,
  onRunScriptsFailed: nonZeroExitListener,
  onSmokeError: nonZeroExitListener,
  onSmokeFailed: (_, {success}) => {
    if (!success) {
      nonZeroExitListener();
    }
  },
  when: () => true,
};
