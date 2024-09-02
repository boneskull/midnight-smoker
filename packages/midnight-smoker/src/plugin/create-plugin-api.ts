import {
  type ComponentKind,
  ComponentKinds,
  DEFAULT_COMPONENT_ID,
} from '#constants';
import {asValidationError} from '#error/validation-error';
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
import {PkgManagerSchema} from '#schema/pkg-manager';
import {ReporterSchema} from '#schema/reporter';
import {type Rule, RuleSchema} from '#schema/rule';
import {type RuleSchemaValue} from '#schema/rule-schema-value';
import {createDebug} from '#util/debug';
import * as SchemaUtils from '#util/schema-util';
import {z} from 'zod';

import {Helpers} from './helpers';
const debug = createDebug(__filename);

export type RegisterComponentFn = <T extends ComponentKind>(
  kind: T,
  componentObject: ComponentObject<T>,
  name: string,
) => void;

/**
 * Creates a {@link PluginAPI} object for use by a specific plugin.
 *
 * @param metadata - Plugin metadata
 * @returns A {@link PluginAPI} object for use by a specific plugin
 */
export const createPluginAPI = (
  registerComponent: RegisterComponentFn,
  metadata: Readonly<PluginMetadata>,
): Readonly<PluginAPI> => {
  const defineRule: DefineRuleFn = <
    Schema extends RuleSchemaValue | void = void,
  >(
    rule: Rule<Schema>,
  ) => {
    try {
      RuleSchema.parse(rule);
    } catch (err) {
      throw asValidationError(err);
    }
    metadata.addRule(rule);
    registerComponent(ComponentKinds.Rule, rule, rule.name);
    debug('%s: created rule "%s"', metadata, rule.name);
    return pluginApi;
  };

  const definePackageManager: DefinePackageManagerFn = (pkgManager) => {
    try {
      PkgManagerSchema.parse(pkgManager);
    } catch (err) {
      throw asValidationError(err);
    }
    metadata.addPkgManager(pkgManager);
    registerComponent(ComponentKinds.PkgManager, pkgManager, pkgManager.name);
    debug('%s: created package manager "%s"', metadata, pkgManager.name);
    return pluginApi;
  };

  const defineExecutor: DefineExecutorFn = (
    executor,
    name = DEFAULT_COMPONENT_ID,
  ) => {
    try {
      ExecutorSchema.parse(executor);
    } catch (err) {
      throw asValidationError(err);
    }
    metadata.addExecutor(name, executor);
    registerComponent(ComponentKinds.Executor, executor, name);
    debug('%s: created executor "%s"', metadata, name);
    return pluginApi;
  };

  const defineReporter: DefineReporterFn = (reporter) => {
    try {
      ReporterSchema.parse(reporter);
    } catch (err) {
      throw asValidationError(err);
    }
    metadata.addReporter(reporter);
    registerComponent(ComponentKinds.Reporter, reporter, reporter.name);
    debug('%s: created reporter "%s"', metadata, reporter.name);
    return pluginApi;
  };

  const pluginApi: PluginAPI = {
    defineExecutor,
    definePackageManager,
    defineReporter,
    defineRule,

    Helpers,

    metadata,
    SchemaUtils,
    z,
    zod: z,
  };

  return pluginApi;
};
