import {
  type EventData,
  type EventKind,
  type ReporterContext,
  type ReporterDef,
  type ReporterListener,
} from '#schema/reporter-def';
import {isFunction} from 'lodash';
import {ReporterError} from '..';

const REPORTER_DEFAULTS = {
  stderr: process.stderr,
  stdout: process.stdout,
  isHidden: false,
  when: () => false,
} as const;

export class Reporter<Ctx = unknown> {
  public ctx: ReporterContext<Ctx>;
  public readonly def: ReporterDef<Ctx>;
  constructor(def: ReporterDef<Ctx>, ctx: ReporterContext<Ctx>) {
    this.def = {...REPORTER_DEFAULTS, ...def};
    this.ctx = ctx;
  }

  public async invokeListener<T extends EventKind>(data: EventData<T>) {
    await Promise.resolve();
    const listener = this.def[`on${data.event}`] as
      | ReporterListener<T, Ctx>
      | undefined;
    if (listener) {
      try {
        await listener(this.ctx, data);
      } catch (err) {
        throw new ReporterError(err as Error, this.def);
      }
    }
  }

  public async setup() {
    await Promise.resolve();
    if (isFunction(this.def.setup)) {
      try {
        await this.def.setup(this.ctx);
      } catch (err) {
        throw new ReporterError(err as Error, this.def);
      }
    }
  }

  public async teardown() {
    await Promise.resolve();
    if (isFunction(this.def.teardown)) {
      try {
        await this.def.teardown(this.ctx);
      } catch (err) {
        throw new ReporterError(err as Error, this.def);
      }
    }
  }

  public static create<Ctx = unknown>(
    def: ReporterDef<Ctx>,
    ctx: ReporterContext<Ctx>,
  ): Reporter<Ctx> {
    return new Reporter(def, ctx);
  }
}
