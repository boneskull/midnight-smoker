import asyncMitt, {
  type AsyncHandler,
  type Emitter,
  type EventType,
  type Handler,
} from 'async-mitt';
import Debug from 'debug';

const debug = Debug('midnight-smoker:event:bus');

export class EventBus<
  SyncEvents extends Record<EventType, unknown> = Record<EventType, unknown>,
  AsyncEvents extends Record<EventType, unknown> = Record<EventType, unknown>,
> {
  public readonly emitter: Emitter<SyncEvents, AsyncEvents>;

  public constructor(emitter = asyncMitt<SyncEvents, AsyncEvents>()) {
    this.emitter = emitter;
  }

  public static create<
    SyncEvents extends Record<EventType, unknown> = Record<EventType, unknown>,
    AsyncEvents extends Record<EventType, unknown> = Record<EventType, unknown>,
  >(emitter?: Emitter<SyncEvents, AsyncEvents>) {
    return new EventBus(emitter);
  }

  public context() {
    return new EventContext(this);
  }

  public async emit<K extends keyof AsyncEvents>(
    event: K,
    data: AsyncEvents[K],
  ): Promise<void> {
    debug('Emitting %s', event);
    await this.emitter.emitAsync(event, data);
  }

  public emitSync<K extends keyof SyncEvents>(
    event: K,
    data: SyncEvents[K],
  ): void {
    debug('Emitting %s', event);
    this.emitter.emit(event, data);
  }

  public off<K extends keyof AsyncEvents>(
    event: K,
    listener: AsyncHandler<AsyncEvents[K]>,
  ) {
    this.emitter.offAsync(event, listener);
  }

  public offSync<K extends keyof SyncEvents>(
    event: K,
    listener: Handler<SyncEvents[K]>,
  ) {
    this.emitter.off(event, listener);
  }

  public on<K extends keyof AsyncEvents>(
    event: K,
    listener: AsyncHandler<AsyncEvents[K]>,
  ) {
    this.emitter.onAsync(event, listener);
  }

  public onSync<K extends keyof SyncEvents>(
    event: K,
    listener: Handler<SyncEvents[K]>,
  ) {
    this.emitter.on(event, listener);
  }

  [Symbol.dispose]() {
    this.emitter.off('*');
  }
}

export class EventContext<
  SyncEvents extends Record<EventType, unknown> = Record<EventType, unknown>,
  AsyncEvents extends Record<EventType, unknown> = Record<EventType, unknown>,
> extends EventBus<SyncEvents, AsyncEvents> {
  #listeners = new Map<
    keyof AsyncEvents,
    Set<AsyncHandler<AsyncEvents[any]>>
  >();
  #syncListeners = new Map<keyof SyncEvents, Set<Handler<SyncEvents[any]>>>();

  public constructor(
    private readonly parent: EventBus<SyncEvents, AsyncEvents>,
  ) {
    super(parent.emitter);
  }

  public done() {
    for (const [event, listeners] of this.#listeners) {
      for (const listener of listeners) {
        this.off(event, listener);
      }
    }
    for (const [event, listeners] of this.#syncListeners) {
      for (const listener of listeners) {
        this.offSync(event, listener);
      }
    }
    this.#listeners.clear();
    this.#syncListeners.clear();
  }

  public override off<K extends keyof AsyncEvents>(
    event: K,
    listener: AsyncHandler<AsyncEvents[K]>,
  ) {
    this.parent.off(event, listener);
    this.#listeners.get(event)?.delete(listener);
  }

  public override offSync<K extends keyof SyncEvents>(
    event: K,
    listener: Handler<SyncEvents[K]>,
  ) {
    this.parent.offSync(event, listener);
    this.#syncListeners.get(event)?.delete(listener);
  }

  public override on<K extends keyof AsyncEvents>(
    event: K,
    listener: AsyncHandler<AsyncEvents[K]>,
  ) {
    const listeners = this.#listeners.get(event) ?? new Set();
    listeners.add(listener);
    this.#listeners.set(event, listeners);
    this.parent.on(event, listener);
  }

  public override onSync<K extends keyof SyncEvents>(
    event: K,
    listener: Handler<SyncEvents[K]>,
  ) {
    const listeners = this.#syncListeners.get(event) ?? new Set();
    listeners.add(listener);
    this.#syncListeners.set(event, listeners);
    this.parent.onSync(event, listener);
  }

  [Symbol.dispose]() {
    this.done();
  }
}
