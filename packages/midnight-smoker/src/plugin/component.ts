import {type ComponentKind, type ComponentKinds} from '#constants';
import {type Executor} from '#schema/executor';
import {type PkgManagerDef} from '#schema/pkg-manager-def';
import {type SomeReporterDef} from '#schema/reporter-def';
import {type SomeRuleDef} from '#schema/rule-def';
import {type StaticPluginMetadata} from '#schema/static-plugin-metadata';
// import Debug from 'debug';

// const debug = Debug('midnight-smoker:component');
export type ComponentObject<T extends ComponentKind> =
  T extends typeof ComponentKinds.RuleDef
    ? SomeRuleDef
    : T extends typeof ComponentKinds.PkgManagerDef
      ? PkgManagerDef
      : T extends typeof ComponentKinds.ReporterDef
        ? SomeReporterDef
        : T extends typeof ComponentKinds.Executor
          ? Executor
          : never;

export interface Component<T extends ComponentKind = ComponentKind> {
  readonly id: string;
  readonly kind: T;
  readonly pluginName: string;
  readonly componentName: string;
  readonly isBlessed: boolean;
  readonly plugin: StaticPluginMetadata;
}

export type SomeComponentObject = ComponentObject<any>;

export type SomeComponent = Component<any>;
