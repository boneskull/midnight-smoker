import {fromUnknownError} from '#error/base-error';
import {ReporterError} from '#error/reporter-error';
import {type EventBus, type EventContext} from '#event/bus';
import {SmokerEvent} from '#event/event-constants';
import {type SmokerEvents} from '#event/smoker-events';
import {type SmokerOptions} from '#options';
import {type PluginMetadata} from '#plugin';
import {Reporter, type SomeReporter} from '#reporter/reporter';
import {
  ReporterListenerEventMap,
  type ReporterContext,
  type ReporterDef,
  type ReporterListeners,
} from '#schema/reporter-def';
import {type EventData} from '#schema/smoker-event';
import {once} from '#util';
import {readSmokerPkgJson} from '#util/pkg-util';
import {type AsyncHandler} from 'async-mitt';
import Debug from 'debug';
import {isFunction, pickBy} from 'lodash';
import {Console} from 'node:console';
import {type PackageJson} from 'type-fest';
import {type Controller} from './controller';

export type PluginReporterDef = [
  plugin: Readonly<PluginMetadata>,
  def: ReporterDef<any>,
];

type ReporterStreams = {
  stderr: NodeJS.WritableStream;
  stdout: NodeJS.WritableStream;
};

/**
 * Handles the setup, teardown, and invocation of {@link Reporter} methods
 */
export class ReporterController implements Controller {
  private readonly eventCtx: EventContext<SmokerEvents, SmokerEvents>;

  constructor(
    private readonly eventBus: EventBus<SmokerEvents, SmokerEvents>,
    private readonly pluginReporterDefs: PluginReporterDef[],
    private readonly opts: Readonly<SmokerOptions>,
  ) {
    this.eventCtx = eventBus.context();
  }

  public static async loadReporters(
    this: void,
    pluginReporterDefs: PluginReporterDef[],
    opts: SmokerOptions,
  ): Promise<SomeReporter[]> {
    return Promise.all(
      pluginReporterDefs.map(([plugin, def]) =>
        ReporterController.loadReporter(plugin, def, opts),
      ),
    );
  }

  [Symbol.dispose]() {
    this.eventCtx.done();
  }

  /**
   * Instantiates {@link Reporter Reporters} from all the
   * {@link ReporterDef ReporterDefs}
   */
  @once
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
   * Creates a {@link ReporterContext} for the reporter
   *
   * @param def - The reporter definition.
   * @param pkgJson - `midnight-smoker`'s `package.json`
   * @returns A promise that resolves to a `ReporterContext` object.
   */
  private static async createReporterContext<Ctx = unknown>(
    this: void,
    def: ReporterDef<Ctx>,
    opts: SmokerOptions,
    pkgJson: PackageJson,
  ): Promise<ReporterContext<Ctx>> {
    const {stderr, stdout} = await ReporterController.getStreams(def);
    const console = new Console({stdout, stderr});

    return {
      opts,
      pkgJson,
      console,
      stdout,
      stderr,
    } as ReporterContext<Ctx>;
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
  private static async getStreams<Ctx = unknown>(
    this: void,
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

  private static async loadReporter<Ctx = unknown>(
    plugin: Readonly<PluginMetadata>,
    def: ReporterDef<Ctx>,
    opts: SmokerOptions,
    pkgJson?: PackageJson,
    ctx?: ReporterContext<Ctx>,
  ): Promise<Reporter<Ctx>> {
    await Promise.resolve();
    pkgJson ??= await readSmokerPkgJson();
    ctx ??= await ReporterController.createReporterContext(def, opts, pkgJson);
    const reporter = Reporter.create(def, ctx, plugin);
    debug('Loaded %s', reporter);
    return reporter;
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

      const listener: AsyncHandler<SmokerEvents[typeof event]> = async (
        data,
      ) => {
        debug('%s - saw event %s', reporter, event);
        try {
          await reporter.invokeListener({...data, event} as EventData<
            typeof event
          >);
        } catch (err) {
          debug('%s - error in listener %s', reporter, event, err);
          // XXX: I don't like this
          await this.eventBus.emit(SmokerEvent.UnknownError, {
            error: fromUnknownError(err),
          });
        }
      };

      this.eventCtx.on(event, listener);
    }
    debug('%s - bound listener(s) %s', reporter, listenerNames.join(', '));

    this.eventCtx.on(SmokerEvent.BeforeExit, async () => {
      await reporter.teardown();
      debug('%s - teardown complete', reporter);
    });
  }

  private async initReporter<Ctx = unknown>(
    plugin: Readonly<PluginMetadata>,
    def: ReporterDef<Ctx>,
    pkgJson: PackageJson,
  ): Promise<Reporter<Ctx>> {
    const reporter = await ReporterController.loadReporter(
      plugin,
      def,
      this.opts,
      pkgJson,
    );

    try {
      await reporter.setup();
    } catch (err) {
      throw new ReporterError(fromUnknownError(err), def);
    }

    // TODO should this happen before setup?
    this.bindListeners(reporter);

    return reporter;
  }

  public static create(
    eventBus: EventBus<SmokerEvents, SmokerEvents>,
    pluginReporterDefs: PluginReporterDef[],
    opts: SmokerOptions,
  ): ReporterController {
    return new ReporterController(eventBus, pluginReporterDefs, opts);
  }
}

const debug = Debug('midnight-smoker:reporter:controller');
