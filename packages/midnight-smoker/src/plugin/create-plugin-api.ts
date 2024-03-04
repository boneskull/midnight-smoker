import {DEFAULT_COMPONENT_ID} from '#constants';
import * as EventNS from '#event';
import * as ExecutorNS from '#executor';
import * as PkgManagerNS from '#pkg-manager';
import {
  type DefineExecutorFn,
  type DefinePackageManagerFn,
  type DefineReporterFn,
  type DefineRuleFn,
  type PluginAPI,
} from '#plugin/plugin-api';
import {type PluginMetadata} from '#plugin/plugin-metadata';
import {type StaticPluginMetadata} from '#plugin/static-metadata';
import * as RuleNS from '#rule';
import {ExecutorSchema} from '#schema/executor';
import {PkgManagerDefSchema} from '#schema/pkg-manager-def';
import {ReporterDefSchema} from '#schema/reporter-def';
import {RuleDefSchema, type RuleDef} from '#schema/rule-def';
import {type RuleDefSchemaValue} from '#schema/rule-options';
import * as SchemaUtils from '#util/schema-util';
import {z} from 'zod';
import {Helpers} from './helpers';

/**
 * Creates a {@link PluginAPI} object for use by a specific plugin.
 *
 * @param metadata - Plugin metadata
 * @returns A {@link PluginAPI} object for use by a specific plugin
 */
export const createPluginAPI = (
  getPlugins: () => StaticPluginMetadata[],
  metadata: Readonly<PluginMetadata>,
): Readonly<PluginAPI> => {
  const defineRule: DefineRuleFn = <
    Schema extends RuleDefSchemaValue | void = void,
  >(
    ruleDef: RuleDef<Schema>,
  ) => {
    metadata.addRuleDef(RuleDefSchema.parse(ruleDef));
    return pluginApi;
  };

  const definePackageManager: DefinePackageManagerFn = (
    pkgManagerDef,
    name = DEFAULT_COMPONENT_ID,
  ) => {
    metadata.addPkgManagerDef(name, PkgManagerDefSchema.parse(pkgManagerDef));
    return pluginApi;
  };

  const defineExecutor: DefineExecutorFn = (
    executor,
    name = DEFAULT_COMPONENT_ID,
  ) => {
    metadata.addExecutor(name, ExecutorSchema.parse(executor));
    return pluginApi;
  };

  const defineReporter: DefineReporterFn = (reporterDef) => {
    metadata.addReporterDef(ReporterDefSchema.parse(reporterDef));
    return pluginApi;
  };

  const pluginApi: PluginAPI = {
    SchemaUtils,
    Helpers,
    Rule: RuleNS,
    PkgManager: PkgManagerNS,
    Executor: ExecutorNS,
    Event: EventNS,
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
