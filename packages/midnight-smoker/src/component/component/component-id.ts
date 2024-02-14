import {isBlessedPlugin} from '#plugin/blessed';

/**
 * For parsing a string ID into a {@link ComponentId}
 *
 * @see {@link ComponentId.parse}
 */
const ID_REGEX = /^((?:@[^/]+\/)?(?:[^/]+))\/(.+)$/;

/**
 * Represents a unique identifier for a component and the stuff that the
 * identifier is created from
 */

export class ComponentId {
  /**
   * The actual ID.
   */
  public readonly id: string;

  /**
   * Do not use this constructor directly; use {@link ComponentId.create}
   * instead.
   *
   * @param pluginName - Plugin name
   * @param name - Component name
   */
  public constructor(
    public readonly pluginName: string,
    public readonly name: string,
  ) {
    this.id = ComponentId.toString(pluginName, name);
  }

  /**
   * Returns a string representation of the {@link ComponentId}.
   *
   * @returns The string representation of the {@link ComponentId}.
   */
  public toString(): string {
    return this.id;
  }

  /**
   * Converts the plugin name and component name into a string representation.
   * If the plugin name is a _blessed_ plugin, it returns the component name
   * only. Otherwise, it returns a string "scoped" by the plugin name.
   *
   * @param pluginName - The name of the plugin.
   * @param name - The name of the component.
   * @returns The string representation of the plugin and component names.
   */
  public static toString(pluginName: string, name: string) {
    return isBlessedPlugin(pluginName) ? name : `${pluginName}/${name}`;
  }

  /**
   * Checks if the component is _blessed_.
   *
   * @returns `true` if the component is blessed, `false` otherwise.
   * @todo Would it be helpful to have a `Blessed` type?
   */
  public get isBlessed() {
    return isBlessedPlugin(this.pluginName);
  }

  /**
   * Parses a string representation of a component ID and returns a
   * {@link ComponentId} object.
   *
   * @param id - The string representation of the component ID.
   * @returns The parsed {@link ComponentId} object, or undefined if the ID is
   *   invalid.
   */
  public static parse(id: string): ComponentId | undefined {
    let pluginId: string;
    let name: string;

    const match = id.match(ID_REGEX);
    if (match) {
      pluginId = match[1];
      name = match[2];
      return new ComponentId(pluginId, name);
    }
  }

  /**
   * Creates a new {@link ComponentId} object.
   *
   * @param pluginName - Plugin name
   * @param name - Component name
   * @returns A {@link ComponentId} object
   */
  public static create(
    pluginName: string,
    name: string,
  ): Readonly<ComponentId> {
    return Object.freeze(new ComponentId(pluginName, name));
  }
}
