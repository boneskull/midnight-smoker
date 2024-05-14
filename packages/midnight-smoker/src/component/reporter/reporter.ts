import {ReifiedComponent} from '#component';
import {fromUnknownError} from '#error';
import {ReporterError} from '#error/reporter-error';
import {type DataForEvent, type EventName} from '#event/events';
import {type PluginMetadata} from '#plugin';
import {
  type ReporterContext,
  type ReporterDef,
  type ReporterListener,
  type ReporterListeners,
} from '#schema/reporter-def';
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

  public get name(): string {
    return this.def.name;
  }

  public get description(): string {
    return this.def.description;
  }

  public async invokeListener<T extends EventName>(data: DataForEvent<T>) {
    // await Promise.resolve();
    // XXX don't like these casts
    if (this.hasListener(data.type)) {
      try {
        const listenerName = `on${data.type}` as keyof ReporterListeners<Ctx>;
        const listener = this.def[listenerName] as ReporterListener<T, Ctx>;
        // debug('%s - invoking %s', this, listenerName);
        await listener(this.ctx, data);
        debug('%s - invoked %s', this, listenerName);
      } catch (err) {
        throw new ReporterError(err as Error, this.def);
      }
    } else {
      // debug('%s - no listener for %s', this, data.type);
    }
  }

  public hasListener<T extends EventName>(type: T): boolean {
    return `on${type}` in this.def;
  }

  public async setup(): Promise<void> {
    await Promise.resolve();
    if (isFunction(this.def.setup)) {
      try {
        await this.def.setup(this.ctx);
      } catch (err) {
        throw new ReporterError(fromUnknownError(err), this.def);
      }
    }
  }

  public async teardown(): Promise<void> {
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

  public override toString(): string {
    return `[Reporter ${this.pluginName}.${this.name}]`;
  }
}

export type SomeReporter = Reporter<any>;
