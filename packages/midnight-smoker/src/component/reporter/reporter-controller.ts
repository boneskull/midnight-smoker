import {fromUnknownError} from '#error/base-error';
import {ReporterError} from '#error/reporter-error';
import {SmokerEvent} from '#event/event-constants';
import {type SmokerEvents} from '#event/smoker-events';
import {type SmokerOptions} from '#options';
import {type PluginMetadata} from '#plugin';
import {
  ReporterListenerEventMap,
  type EventData,
  type EventKind,
  type ReporterContext,
  type ReporterDef,
  type ReporterListeners,
} from '#schema/reporter-def';
import {readSmokerPkgJson} from '#util/pkg-util';
import Debug from 'debug';
import {isFunction, pickBy} from 'lodash';
import {Console} from 'node:console';
import {type PackageJson} from 'type-fest';
import {type Smoker} from '../../smoker';
import {Reporter, type SomeReporter} from './reporter';

const debug = Debug('midnight-smoker:reporter:controller');

/**
 * This type is compatible with `StrictEventEmitter`
 */
type SmokerEventListener = (data: SmokerEvents[keyof SmokerEvents]) => void;

type ReporterStreams = {
  stderr: NodeJS.WritableStream;
  stdout: NodeJS.WritableStream;
};

export type PluginReporterDef = [
  plugin: Readonly<PluginMetadata>,
  def: ReporterDef<any>,
];

/**
 * Handles the setup, teardown, and invocation of {@link Reporter} methods
 */
export class ReporterController {
  private readonly listeners: Map<EventKind, Set<SmokerEventListener>>;

  constructor(
    private readonly smoker: Smoker,
    private readonly pluginReporterDefs: PluginReporterDef[],
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
    await Promise.all(
      this.pluginReporterDefs.map(async ([plugin, def]) => {
        const reporter = await this.initReporter(plugin, def, pkgJson);
        debug('Initialized %s', reporter);
      }),
    );
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
  private async getStreams<Ctx = unknown>(
    def: ReporterDef<Ctx>,
  ): Promise<ReporterStreams> {
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
  private async createReporterContext<Ctx = unknown>(
    def: ReporterDef<Ctx>,
    pkgJson: PackageJson,
  ): Promise<ReporterContext<Ctx>> {
    const {stderr, stdout} = await this.getStreams(def);
    const console = new Console({stdout, stderr});

    return {
      opts: this.opts,
      pkgJson,
      console,
      stdout,
      stderr,
    } as ReporterContext<Ctx>;
  }

  private bindListeners(reporter: SomeReporter): void {
    const listeners = pickBy(
      reporter.def,
      (val, key) => key in ReporterListenerEventMap && isFunction(val),
    ) as Partial<ReporterListeners>;

    const listenerNames = Object.keys(listeners);
    for (const methodName of listenerNames) {
      const event =
        ReporterListenerEventMap[
          methodName as keyof typeof ReporterListenerEventMap
        ];

      const listener: SmokerEventListener = (data) => {
        debug('%s - saw event %s', reporter, event);
        reporter
          .invokeListener({...data, event} as EventData<typeof event>)
          .catch((err: ReporterError) => {
            debug('%s - error in listener %s', reporter, event, err);
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
    debug('%s - bound listener(s) %s', reporter, listenerNames.join(', '));

    this.smoker.onBeforeExit(async () => {
      await reporter.teardown();
    });
  }

  private async initReporter<Ctx = unknown>(
    plugin: Readonly<PluginMetadata>,
    def: ReporterDef<Ctx>,
    pkgJson: PackageJson,
  ): Promise<Reporter<Ctx>> {
    const ctx = await this.createReporterContext(def, pkgJson);
    const reporter = Reporter.create(def, ctx, plugin);

    try {
      await reporter.setup();
    } catch (err) {
      throw new ReporterError(fromUnknownError(err), def);
    }

    // TODO should this happen before setup?
    this.bindListeners(reporter);

    return reporter;
  }
}
