import {type ComponentKind, type ComponentKinds} from '#constants';
import {type PkgManager} from '#pkg-manager';
import {isBlessedPlugin} from '#plugin/blessed';
import {type PluginMetadata} from '#plugin/plugin-metadata';
import {type StaticPluginMetadata} from '#schema';
import {type Executor} from '#schema/executor';
import {type PkgManagerDef} from '#schema/pkg-manager-def';
import {type ReporterDef} from '#schema/reporter-def';
import {type SomeRule} from '#schema/rule';
import {type SomeRuleDef} from '#schema/rule-def';
import {type SomeReporter} from '../reporter/reporter';
// import Debug from 'debug';

// const debug = Debug('midnight-smoker:component');
export type ComponentObject<T extends ComponentKind> =
  T extends typeof ComponentKinds.Rule
    ? SomeRule
    : T extends typeof ComponentKinds.RuleDef
      ? SomeRuleDef
      : T extends typeof ComponentKinds.PkgManagerDef
        ? PkgManagerDef
        : T extends typeof ComponentKinds.PkgManager
          ? PkgManager
          : T extends typeof ComponentKinds.ReporterDef
            ? ReporterDef
            : T extends typeof ComponentKinds.Reporter
              ? SomeReporter
              : T extends typeof ComponentKinds.Executor
                ? Executor
                : never;

export interface Component<T extends ComponentKind = any>
  extends StaticComponent<T> {
  readonly plugin: Readonly<PluginMetadata>;

  readonly def: ComponentObject<T>;
}

export interface StaticComponent<T extends ComponentKind = ComponentKind> {
  readonly id: string;
  readonly kind: T;
  readonly pluginName: string;
  readonly componentName: string;
  readonly isBlessed: boolean;
  readonly plugin: StaticPluginMetadata;
}

/**
 * A Component wraps a definition of kind `K` and provides a unique (per-kind)
 * identifier.
 */
export class ComponentData<T extends ComponentKind = ComponentKind>
  implements Component<T>
{
  constructor(
    public readonly kind: T,
    public readonly plugin: Readonly<PluginMetadata>,
    public readonly componentName: string,

    public readonly id: string,
    public readonly def: ComponentObject<T>,
  ) {
    // debug('Created "%s" component with ID %s', kind, this.id);
  }

  get pluginName(): string {
    return this.plugin.id;
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

  public toJSON(): StaticComponent {
    return {
      id: this.id,
      kind: this.kind,
      pluginName: this.pluginName,
      plugin: this.plugin.toJSON(),
      componentName: this.componentName,
      isBlessed: this.isBlessed,
    };
  }
}
