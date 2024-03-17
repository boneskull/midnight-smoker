import {ReifiedComponent} from '#component';
import {fromUnknownError} from '#error';
import {ReporterError} from '#error/reporter-error';
import {type PluginMetadata} from '#plugin';
import {
  type ReporterContext,
  type ReporterDef,
  type ReporterListener,
  type ReporterListeners,
} from '#schema/reporter-def';
import {type EventData, type EventKind} from '#schema/smoker-event';
import Debug from 'debug';
import {isFunction} from 'lodash';

const debug = Debug('midnight-smoker:reporter');

const REPORTER_DEFAULTS = {
  stderr: process.stderr,
  stdout: process.stdout,
  isHidden: false,
  when: () => false,
} as const;

export class Reporter<Ctx = unknown> extends ReifiedComponent<
  ReporterDef<Ctx>
> {
  constructor(
    id: string,
    def: ReporterDef<Ctx>,
    plugin: Readonly<PluginMetadata>,
    public readonly ctx: ReporterContext<Ctx>,
  ) {
    Object.assign(def, {...REPORTER_DEFAULTS, ...def});
    super(id, def, plugin);
  }

  public get name() {
    return this.def.name;
  }

  public get description() {
    return this.def.description;
  }

  public async invokeListener<T extends EventKind>(data: EventData<T>) {
    await Promise.resolve();
    // XXX don't like these casts
    const listenerName = `on${data.event}` as keyof ReporterListeners<Ctx>;
    if (listenerName in this.def) {
      const listener = this.def[listenerName] as ReporterListener<T, Ctx>;
      try {
        debug('%s - invoking listener for %s', this, data.event);
        await listener(this.ctx, data);
        debug('%s - listener %s invoked', this, listenerName);
      } catch (err) {
        throw new ReporterError(err as Error, this.def);
      }
    } else {
      debug('%s - no listener for %s', this, data.event);
    }
  }

  public async setup() {
    await Promise.resolve();
    if (isFunction(this.def.setup)) {
      try {
        await this.def.setup(this.ctx);
      } catch (err) {
        throw new ReporterError(fromUnknownError(err), this.def);
      }
    }
  }

  public async teardown() {
    await Promise.resolve();
    if (isFunction(this.def.teardown)) {
      try {
        await this.def.teardown(this.ctx);
      } catch (err) {
        throw new ReporterError(fromUnknownError(err), this.def);
      }
    }
  }

  public static create<Ctx = unknown>(
    id: string,
    def: ReporterDef<Ctx>,
    plugin: Readonly<PluginMetadata>,
    ctx: ReporterContext<Ctx>,
  ): Reporter<Ctx> {
    return new Reporter(id, def, plugin, ctx);
  }

  public override toString() {
    return `[Reporter] ${this.def.name}`;
  }
}

export type SomeReporter = Reporter<any>;
