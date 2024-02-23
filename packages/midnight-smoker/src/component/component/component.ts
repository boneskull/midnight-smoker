import {type ComponentKind} from '#constants';
import {isBlessedPlugin} from '#plugin/blessed';
import Debug from 'debug';

const debug = Debug('midnight-smoker:component');

export interface Component {
  readonly id: string;
  readonly kind: ComponentKind;
  readonly pluginName: string;
  readonly componentName: string;
  isBlessed: boolean;
}

/**
 * A Component wraps a definition of kind `K` and provides a unique (per-kind)
 * identifier.
 */
export class ComponentData implements Component {
  constructor(
    public readonly kind: ComponentKind,
    public readonly pluginName: string,
    public readonly componentName: string,

    public readonly id: string,
  ) {
    debug('Created "%s" component with ID %s', kind, this.id);
  }

  /**
   * Determines if the component is "blessed".
   *
   * Blessed components do not have prefixed IDs.
   *
   * @returns `true` if the component is blessed, `false` otherwise.
   */
  public get isBlessed(): boolean {
    return isBlessedPlugin(this.pluginName);
  }

  public toString(): string {
    return this.id;
  }

  public toJSON(): Component {
    return {
      id: this.id,
      kind: this.kind,
      pluginName: this.pluginName,
      componentName: this.componentName,
      isBlessed: this.isBlessed,
    };
  }
}
