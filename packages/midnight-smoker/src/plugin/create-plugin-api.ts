import {DEFAULT_COMPONENT_ID} from '#constants';
import * as EventNS from '#event';
import * as ExecutorNS from '#executor';
import * as PkgManagerNS from '#pkg-manager';
import * as RuleNS from '#rule';
import * as RuleRunnerNS from '#rule-runner';
import {ExecutorSchema} from '#schema/executor.js';
import {ReporterDefSchema} from '#schema/reporter-def.js';
import {type RuleDef} from '#schema/rule-def.js';
import {type RuleDefSchemaValue} from '#schema/rule-options.js';
import {RuleRunnerSchema} from '#schema/rule-runner.js';
import {ScriptRunnerSchema} from '#schema/script-runner.js';
import * as ScriptRunnerNS from '#script-runner';
import * as SchemaUtils from '#util/schema-util.js';
import Debug from 'debug';
import {z} from 'zod';
import {Helpers} from './helpers';
import {type PluginMetadata} from './metadata';
import {
  type DefineExecutorFn,
  type DefinePackageManagerFn,
  type DefineReporterFn,
  type DefineRuleFn,
  type DefineRuleRunnerFn,
  type DefineScriptRunnerFn,
  type PluginAPI,
} from './plugin-api';
import {type StaticPluginMetadata} from './static-metadata';

const debug = Debug('midnight-smoker:plugin:create-plugin-api');

/**
 * Creates a {@link PluginAPI} object for use by a specific plugin.
 *
 * @param metadata - Plugin metadata
 * @returns A {@link PluginAPI} object for use by a specific plugin
 */
export const createPluginAPI = (
  getPlugins: () => StaticPluginMetadata[],
  metadata: PluginMetadata,
): Readonly<PluginAPI> => {
  // TODO: validate ruleDef
  const defineRule: DefineRuleFn = <
    const Name extends string,
    Schema extends RuleDefSchemaValue | void = void,
  >(
    ruleDef: RuleDef<Name, Schema>,
  ) => {
    metadata.addRule(ruleDef);
    debug('Rule with name %s defined by plugin %s', ruleDef.name, metadata.id);
    return pluginApi;
  };

  const definePackageManager: DefinePackageManagerFn = (
    pkgManagerDef,
    name = DEFAULT_COMPONENT_ID,
  ) => {
    metadata.addPkgManagerDef(name, pkgManagerDef);
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
    metadata.addReporter(ReporterDefSchema.parse(reporterDef));
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
