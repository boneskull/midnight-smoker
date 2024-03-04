import type {InstallEvents} from '#event/install-events';
import {type LintEvents} from '#event/lint-events';
import type {PackEvents} from '#event/pack-events';
import {type ScriptEvents} from '#event/script-events';
import {
  type BeforeExitEventData,
  type LingeredEventData,
  type SmokeBeginEventData,
  type SmokeFailedEventData,
  type SmokeOkEventData,
  type UnknownErrorEventData,
} from '#schema/smoker-event';
import {type EventBus} from './bus';

/**
 * Describes the data emitted by each event.
 */
export type SmokerEvents = InstallEvents &
  PackEvents &
  LintEvents &
  ScriptEvents & {
    /**
     * Emitted after all other events have been emitted, and just before exit.
     *
     * This implies that {@link SmokerEvents.UnknownError} will _not_ be emitted
     * if it has not been emitted already.
     *
     * @event
     */
    BeforeExit: BeforeExitEventData;

    /**
     * Emitted only if the `--linger` option was provided; a list of temp
     * directories used by `midnight-smoker` and left on disk at user behest.
     *
     * @event
     */
    Lingered: LingeredEventData;

    /**
     * Emitted just before the initial "pack" phase begins.
     *
     * @event
     */
    SmokeBegin: SmokeBeginEventData;

    /**
     * Emitted at the end of execution if any script or automated check failed.
     *
     * @event
     */
    SmokeFailed: SmokeFailedEventData;

    /**
     * Emitted at the end of execution if no script or automated check failed.
     *
     * @event
     */
    SmokeOk: SmokeOkEventData;

    /**
     * Emitted if `smoker.smoke()` rejects, which should not happen under normal
     * operation.
     *
     * I think.
     *
     * @event
     */
    UnknownError: UnknownErrorEventData;
  };

// export type SmokerEventListeners = {
//   [K in keyof SmokerEvents as `on${K}`]?: (data: SmokerEvents[K]) => void;
// };

// export type SmokerEmitter = Readonly<StrictEmitter<SmokerEvents>>;

export type SmokerEventBus = EventBus<SmokerEvents, SmokerEvents>;
