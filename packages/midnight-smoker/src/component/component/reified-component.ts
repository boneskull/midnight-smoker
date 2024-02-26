import {type PluginMetadata} from '#plugin';

/**
 * A component which is created from a definition.
 *
 * @template T - The definition type
 */
export abstract class ReifiedComponent<T extends object> {
  #plugin: Readonly<PluginMetadata>;

  #def: T;

  constructor(def: T, plugin: Readonly<PluginMetadata>) {
    this.#plugin = plugin;
    this.#def = def;
  }

  public get id(): string {
    return this.plugin.getComponentId(this);
  }

  public get isBlessed(): boolean {
    return this.plugin.isBlessed;
  }

  public get pluginName(): string {
    return this.plugin.id;
  }

  public get plugin(): Readonly<PluginMetadata> {
    return this.#plugin;
  }

  public get def(): T {
    return this.#def;
  }
}
