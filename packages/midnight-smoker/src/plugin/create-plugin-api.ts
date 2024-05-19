import {
  ComponentKinds,
  DEFAULT_COMPONENT_ID,
  type ComponentKind,
} from '#constants';
import {type ComponentObject} from '#plugin/component';
import {
  type DefineExecutorFn,
  type DefinePackageManagerFn,
  type DefineReporterFn,
  type DefineRuleFn,
  type PluginAPI,
} from '#plugin/plugin-api';
import {type PluginMetadata} from '#plugin/plugin-metadata';
import {ExecutorSchema} from '#schema/executor';
import {PkgManagerDefSchema} from '#schema/pkg-manager-def';
import {ReporterDefSchema} from '#schema/reporter-def';
import {RuleDefSchema, type RuleDef} from '#schema/rule-def';
import {type RuleDefSchemaValue} from '#schema/rule-def-schema-value';
import {type StaticPluginMetadata} from '#schema/static-plugin-metadata';
import * as SchemaUtils from '#util/schema-util';
import {z, type ZodError} from 'zod';
import {fromZodError} from 'zod-validation-error';
import {Helpers} from './helpers';

// import Debug from 'debug';
// const debug = Debug('midnight-smoker:plugin:api');

/**
 * Creates a {@link PluginAPI} object for use by a specific plugin.
 *
 * @param metadata - Plugin metadata
 * @returns A {@link PluginAPI} object for use by a specific plugin
 */
export const createPluginAPI = (
  registerComponent: <T extends ComponentKind>(
    kind: T,
    def: ComponentObject<T>,
    name: string,
  ) => void,
  getPlugins: () => StaticPluginMetadata[],
  metadata: Readonly<PluginMetadata>,
): Readonly<PluginAPI> => {
  const defineRule: DefineRuleFn = <
    Schema extends RuleDefSchemaValue | void = void,
  >(
    ruleDef: RuleDef<Schema>,
  ) => {
    try {
      RuleDefSchema.parse(ruleDef);
    } catch (err) {
      throw fromZodError(err as ZodError);
    }
    metadata.addRuleDef(ruleDef);
    registerComponent(ComponentKinds.RuleDef, ruleDef, ruleDef.name);
    return pluginApi;
  };

  const definePackageManager: DefinePackageManagerFn = (
    pkgManagerDef,
    name = DEFAULT_COMPONENT_ID,
  ) => {
    try {
      PkgManagerDefSchema.parse(pkgManagerDef);
    } catch (err) {
      throw fromZodError(err as ZodError);
    }
    metadata.addPkgManagerDef(name, pkgManagerDef);
    registerComponent(ComponentKinds.PkgManagerDef, pkgManagerDef, name);
    return pluginApi;
  };

  const defineExecutor: DefineExecutorFn = (
    executor,
    name = DEFAULT_COMPONENT_ID,
  ) => {
    try {
      ExecutorSchema.parse(executor);
    } catch (err) {
      throw fromZodError(err as ZodError);
    }
    metadata.addExecutor(name, executor);
    registerComponent(ComponentKinds.Executor, executor, name); //?
    return pluginApi;
  };

  const defineReporter: DefineReporterFn = (reporterDef) => {
    try {
      ReporterDefSchema.parse(reporterDef);
    } catch (err) {
      throw fromZodError(err as ZodError);
    }
    metadata.addReporterDef(reporterDef);
    registerComponent(
      ComponentKinds.ReporterDef,
      reporterDef,
      reporterDef.name,
    );
    return pluginApi;
  };

  const pluginApi: PluginAPI = {
    SchemaUtils,
    Helpers,
    z,
    zod: z,

    metadata,

    get plugins() {
      return getPlugins();
    },

    defineRule,
    definePackageManager,
    defineExecutor,
    defineReporter,
  };

  return pluginApi;
};
