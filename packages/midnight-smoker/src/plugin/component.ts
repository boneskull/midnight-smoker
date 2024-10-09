import type {Entries} from 'type-fest';

import {type ComponentKind, type ComponentKinds} from '#constants';
import {type Executor} from '#defs/executor';
import {type PkgManager} from '#defs/pkg-manager';
import {type StaticPluginMetadata} from '#defs/plugin';
import {type SomeRule} from '#defs/rule';

import {type SomeReporter} from '../defs/reporter';

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
  Readonly<ComponentMetadata>
>;

export type ComponentRegistryEntries = Entries<
  Map<SomeComponentObject, Readonly<ComponentMetadata>>
>;

export type SomeComponentObject = ComponentObject<any>;

export interface ComponentMetadata<T extends ComponentKind = ComponentKind> {
  readonly componentName: string;
  readonly id: string;
  readonly isBlessed: boolean;
  readonly kind: T;
  readonly plugin: StaticPluginMetadata;
  readonly pluginName: string;
}

export type Component<T extends ComponentKind> = ComponentMetadata<T> &
  ComponentObject<T>;
