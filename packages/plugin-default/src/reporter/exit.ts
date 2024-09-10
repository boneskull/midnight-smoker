/**
 * Provides {@link ExitListener}
 *
 * @packageDocumentation
 */

import {once} from 'lodash';
import {type Reporter} from 'midnight-smoker/reporter';

import {createDebug} from '../debug';

const debug = createDebug(__filename);

const nonZeroExitListener = once(() => {
  process.exitCode = 1;
  debug('Set process exit code to 1');
});

/**
 * "Exit" listener that sets the process exit code to 1 when certain events
 * occur.
 *
 * Does not output anything.
 *
 * @privateRemarks
 * TODO: I would like to remove this and just listen for events emitted by a
 * `Smoker` instance; it really has no business being a reporter. Once this hole
 * in the abstraction is plugged, we can remove both the `hidden` and `when`
 * properties of a {@link Reporter}
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
