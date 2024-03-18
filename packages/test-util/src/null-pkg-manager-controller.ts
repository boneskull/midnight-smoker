/**
 * Provides a "null" {@link NullPkgManagerController PkgManagerController} which
 * can be provided as in `SmokerCapabilities` to ensure no packing,
 * installation, or custom scripts get run.
 *
 * @packageDocumentation
 */

import {type PluginRegistry} from 'midnight-smoker';
import {
  PkgManagerController,
  type PkgManagerControllerOpts,
} from 'midnight-smoker/controller';
import {type SmokerEventBus} from 'midnight-smoker/event';
import {type PkgManagerOpts} from 'midnight-smoker/pkg-manager';
import sinon from 'sinon';

/* eslint-disable @typescript-eslint/no-unused-vars */

export class NullPkgManagerController extends PkgManagerController {
  public static override create(
    pluginRegistry: PluginRegistry,
    eventBus: SmokerEventBus,
    desiredPkgManagers: string[],
    opts: PkgManagerControllerOpts & PkgManagerOpts = {},
  ) {
    return sinon.createStubInstance(PkgManagerController);
  }
}
