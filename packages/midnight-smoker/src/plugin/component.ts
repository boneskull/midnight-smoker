import type {Entries} from 'type-fest';

import {type ComponentKind, type ComponentKinds} from '#constants';
import {type StaticPluginMetadata} from '#plugin/static-plugin-metadata';
import {type Executor} from '#schema/executor';
import {type PkgManager} from '#schema/pkg-manager';
import {type SomeReporter} from '#schema/reporter';
import {type SomeRule} from '#schema/rule';

export type ComponentObject<T extends ComponentKind> =
  T extends typeof ComponentKinds.Rule
    ? SomeRule
    : T extends typeof ComponentKinds.PkgManager
      ? PkgManager
      : T extends typeof ComponentKinds.Reporter
        ? SomeReporter
        : T extends typeof ComponentKinds.Executor
          ? Executor
          : never;

export type ComponentRegistry = WeakMap<
  SomeComponentObject,
  Readonly<Component>
>;

export type ComponentRegistryEntries = Entries<
  Map<SomeComponentObject, Readonly<Component>>
>;

export type SomeComponentObject = ComponentObject<any>;

// TODO: rename to ComponentMetadata
export interface Component<T extends ComponentKind = ComponentKind> {
  readonly componentName: string;
  readonly id: string;
  readonly isBlessed: boolean;
  readonly kind: T;
  readonly plugin: StaticPluginMetadata;
  readonly pluginName: string;
}
