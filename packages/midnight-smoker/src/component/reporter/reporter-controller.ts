import {fromUnknownError} from '#error/base-error';
import {ReporterError} from '#error/reporter-error';
import {SmokerEvent} from '#event/event-constants';
import {type SmokerEvents} from '#event/smoker-events';
import {type SmokerOptions} from '#options';
import {
  ReporterListenerEventMap,
  type EventData,
  type EventKind,
  type ReporterContext,
  type ReporterDef,
  type ReporterListeners,
} from '#schema/reporter-def';
import {readSmokerPkgJson} from '#util/pkg-util';
import {isFunction, pickBy} from 'lodash';
import {Console} from 'node:console';
import {type PackageJson} from 'type-fest';
import {type Smoker} from '../../smoker';
import {Reporter} from './reporter';

/**
 * This type is compatible with `StrictEventEmitter`
 */
type SmokerEventListener = (data: SmokerEvents[keyof SmokerEvents]) => void;

/**
 * Handles the setup, teardown, and invocation of {@link Reporter} methods
 */
export class ReporterController {
  private readonly listeners: Map<EventKind, Set<SmokerEventListener>>;

  constructor(
    private readonly smoker: Smoker,
    private readonly reporterDefs: ReporterDef[],
    private readonly opts: Readonly<SmokerOptions>,
  ) {
    this.listeners = new Map();

    this.smoker.onBeforeExit(() => this.destroy());
  }

  public async destroy() {
    for (const [event, listeners] of this.listeners) {
      for (const listener of listeners) {
        this.smoker.off(event, listener);
      }
    }
    this.listeners.clear();
  }

  /**
   * Instantiates {@link Reporter Reporters} from all the
   * {@link ReporterDef ReporterDefs}
   */
  public async init() {
    const pkgJson = await readSmokerPkgJson();
    await Promise.all([
      this.reporterDefs.map(async (def) => {
        await this.initReporter(def, pkgJson);
      }),
    ]);
  }

  /**
   * Retrieves the stdout and stderr streams based on the provided
   * `ReporterDef`.
   *
   * If the `stdout` or `stderr` properties of the `ReporterDef` are functions,
   * they will be executed and the returned streams will be used. If the
   * `stdout` or `stderr` properties of the `ReporterDef` are not functions, the
   * provided streams will be used.
   *
   * @param def The `ReporterDef` object containing the `stdout` and `stderr`
   *   properties.
   * @returns An object containing the `stdout` and `stderr` streams.
   */
  private async getStreams(def: ReporterDef) {
    let stdout: NodeJS.WritableStream = process.stdout;
    let stderr: NodeJS.WritableStream = process.stderr;
    if (def.stdout) {
      if (isFunction(def.stdout)) {
        stdout = await def.stdout();
      } else {
        stdout = def.stdout;
      }
    }
    if (def.stderr) {
      if (isFunction(def.stderr)) {
        stderr = await def.stderr();
      } else {
        stderr = def.stderr;
      }
    }
    return {stdout, stderr};
  }

  /**
   * Creates a {@link ReporterContext} for the reporter
   *
   * @param def - The reporter definition.
   * @param pkgJson - `midnight-smoker`'s `package.json`
   * @returns A promise that resolves to a `ReporterContext` object.
   */
  private async createReporterContext(
    def: ReporterDef,
    pkgJson: PackageJson,
  ): Promise<ReporterContext<unknown>> {
    const {stderr, stdout} = await this.getStreams(def);
    const console = new Console({stdout, stderr});

    return {
      opts: this.opts,
      pkgJson,
      console,
      stdout,
      stderr,
    };
  }

  private bindListeners(reporter: Reporter) {
    const listeners = pickBy(
      reporter.def,
      (val, key) => key in ReporterListenerEventMap && isFunction(val),
    ) as Partial<ReporterListeners>;

    for (const methodName of Object.keys(listeners)) {
      const event =
        ReporterListenerEventMap[
          methodName as keyof typeof ReporterListenerEventMap
        ];

      const listener: SmokerEventListener = (data) => {
        reporter
          .invokeListener(data as EventData<typeof event>)
          .catch((err: ReporterError) => {
            // XXX: I don't like this
            this.smoker.emit(SmokerEvent.UnknownError, {
              error: err,
            });
          });
      };

      // XXX: StrictEventEmitter isn't strict enough; this allows any defined
      // event data to be emitted on any event
      this.smoker.on(event, listener);

      const listenersForEvent = this.listeners.get(event) ?? new Set();
      listenersForEvent.add(listener);
      this.listeners.set(event, listenersForEvent);
    }

    this.smoker.onBeforeExit(async () => {
      await reporter.teardown();
    });
  }

  private async initReporter(def: ReporterDef, pkgJson: PackageJson) {
    const ctx = await this.createReporterContext(def, pkgJson);
    const reporter = Reporter.create(def, ctx);

    try {
      await reporter.setup();
    } catch (err) {
      throw new ReporterError(fromUnknownError(err), def);
    }

    // TODO should this happen before setup?
    this.bindListeners(reporter);
  }
}
