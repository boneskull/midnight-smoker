import {type ComponentKind} from '#constants';
import {ComponentCollisionError} from '#error';
import {isBlessedPlugin} from '#plugin/blessed';
import {inspect} from 'util';
import {ComponentData, type Component} from './component';

export class ComponentRegistry {
  private componentsByKind: Map<ComponentKind, Map<string, Component>>;

  private componentMap: WeakMap<object, Component>;

  private constructor() {
    this.componentMap = new WeakMap();
    this.componentsByKind = new Map();
  }

  public static create(): ComponentRegistry {
    return new ComponentRegistry();
  }

  public clear(kind?: ComponentKind): void {
    if (kind) {
      this.componentsByKind.get(kind)?.clear();
    } else {
      this.componentsByKind.clear();
    }
    this.componentMap = new WeakMap();
  }

  public toString() {
    return `[ComponentRegistry] ${inspect(this.componentsByKind, {
      depth: null,
    })}`;
  }

  /**
   * Retrieves a {@link ComponentData} instance based on the provided definition
   * object.
   *
   * @param def The definition object used to retrieve the `Component`.
   * @returns The `Component` instance
   */
  public getComponent(def: object): Component {
    if (!this.componentMap.has(def)) {
      // eslint-disable-next-line @typescript-eslint/no-base-to-string
      throw new ReferenceError(`No such component for definition: ${def}`);
    }
    return this.componentMap.get(def)!;
  }

  /**
   * Retrieves the ID of a component definition from the component map.
   *
   * @param def - The component definition.
   * @returns The ID of the component
   */
  public getId(def: object): string {
    return this.getComponent(def).id;
  }

  public isRetained(kind: ComponentKind, id: string): boolean {
    return Boolean(this.componentsByKind.get(kind)?.has(id));
  }

  public registerComponent(
    kind: ComponentKind,
    pluginName: string,
    componentName: string,
    def: object,
  ): Component {
    if (!this.componentMap.has(def)) {
      const id = this.toId(pluginName, componentName);
      if (this.isRetained(kind, id)) {
        throw new ComponentCollisionError(
          `Component ID collision for kind ${kind}: ${id}`,
          pluginName,
          componentName,
        );
      }
      const component = new ComponentData(kind, pluginName, componentName, id);
      this.retain(kind, id, component);
      this.componentMap.set(def, component);
      return component;
    }
    return this.componentMap.get(def)!;
  }

  public retain(kind: ComponentKind, id: string, component: Component): void {
    const componentsForKind =
      this.componentsByKind.get(kind) ?? new Map<string, Component>();
    componentsForKind.set(id, component);
    this.componentsByKind.set(kind, componentsForKind);
  }

  /**
   * Converts a plugin name and component name into an ID.
   *
   * If the plugin name is a blessed plugin, the component name is returned
   * as-is. Otherwise, the ID is constructed by concatenating the plugin name
   * and component name with a slash (`/`).
   *
   * @param pluginName - The name of the plugin.
   * @param componentName - The name of the component.
   * @returns The ID of the component.
   */
  public toId(pluginName: string, componentName: string): string {
    const id = isBlessedPlugin(pluginName)
      ? componentName
      : `${pluginName}/${componentName}`;
    return id;
  }
}
