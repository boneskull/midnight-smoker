import {DEFAULT_COMPONENT_ID} from '#constants';
import * as EventNS from '#event';
import * as ExecutorNS from '#executor';
import * as PkgManagerNS from '#pkg-manager';
import {
  type DefineExecutorFn,
  type DefinePackageManagerFn,
  type DefineReporterFn,
  type DefineRuleFn,
  type DefineRuleRunnerFn,
  type DefineScriptRunnerFn,
  type PluginAPI,
} from '#plugin/plugin-api';
import {type PluginMetadata} from '#plugin/plugin-metadata';
import {type StaticPluginMetadata} from '#plugin/static-metadata';
import * as RuleNS from '#rule';
import * as RuleRunnerNS from '#rule-runner';
import {ExecutorSchema} from '#schema/executor';
import {PkgManagerDefSchema} from '#schema/pkg-manager-def';
import {ReporterDefSchema} from '#schema/reporter-def';
import {RuleDefSchema, type RuleDef} from '#schema/rule-def';
import {type RuleDefSchemaValue} from '#schema/rule-options';
import {RuleRunnerSchema} from '#schema/rule-runner';
import {ScriptRunnerSchema} from '#schema/script-runner';
import * as ScriptRunnerNS from '#script-runner';
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

  const defineScriptRunner: DefineScriptRunnerFn = (
    scriptRunner,
    name = DEFAULT_COMPONENT_ID,
  ) => {
    metadata.addScriptRunner(name, ScriptRunnerSchema.parse(scriptRunner));
    return pluginApi;
  };

  const defineRuleRunner: DefineRuleRunnerFn = (
    ruleRunner,
    name = DEFAULT_COMPONENT_ID,
  ) => {
    metadata.addRuleRunner(name, RuleRunnerSchema.parse(ruleRunner));
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
    RuleRunner: RuleRunnerNS,
    ScriptRunner: ScriptRunnerNS,
    Event: EventNS,
    z,
    zod: z,

    metadata,

    get plugins() {
      return getPlugins();
    },

    defineRule,
    definePackageManager,
    defineScriptRunner,
    defineRuleRunner,
    defineExecutor,
    defineReporter,
  };

  return pluginApi;
};
