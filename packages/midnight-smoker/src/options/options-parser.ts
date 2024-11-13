import {asValidationError} from '#error/validation-error';
import {type PluginRegistry} from '#plugin/registry';
import {RawRuleOptionsSchema} from '#schema/rule-options';
import {
  type RawSmokerOptions,
  type SmokerOptions,
  SmokerOptionsSchema,
} from '#schema/smoker-options';
import {createDebug} from '#util/debug';
import {isEmpty} from '#util/guard/common';
import {EmptyObjectSchema} from '#util/schema-util';
import {z} from 'zod';

import {createRuleOptionsSchema} from './create-rule-options';
import {getDefaultRuleOptions} from './default-rule-options';

export const debug = createDebug(__filename);

/**
 * Handles parsing options (CLI, config file) for `midnight-smoker`.
 *
 * Options are dynamic based on installed plugins.
 */

export class OptionsParser {
  /**
   * Hang on to the parsed options in case we try to parse them again.
   */
  #parseResultCache = new WeakSet<SmokerOptions>();

  #pluginRegistry: PluginRegistry;

  private constructor(pluginRegistry: PluginRegistry) {
    this.#pluginRegistry = pluginRegistry;
  }

  /**
   * {@link mergeRuleSchemas Merges} together the options schemas from every rule
   * in the registry, then creates a {@link mergeRuleDefaults default value}
   * based on the merged rules. This becomes the schema for
   * {@link SmokerOptions.rules}.
   *
   * @param registry Plugin registry
   * @returns The entire schema for {@link SmokerOptions.rules}
   */
  protected static buildRuleOptions(registry: PluginRegistry) {
    const MergedRuleOptionSchema = this.mergeRuleSchemas(registry);
    const defaults = this.mergeRuleDefaults(registry);
    return MergedRuleOptionSchema.default(defaults);
  }

  /**
   * Builds a schema for the "real" options, including all custom schemas from
   * plugins' rules.
   *
   * It also performs validation on mutually exclusive options.
   *
   * @remarks
   * The return type is intentionally omitted because it's heinous.
   * @param registry Plugin registry
   * @returns The real options schema
   */
  public static buildSmokerOptionsSchema(registry: PluginRegistry) {
    if (!registry.isClosed) {
      debug('Warning: registry is not yet closed');
    }
    const RuleOptionsSchema = OptionsParser.buildRuleOptions(registry);
    return SmokerOptionsSchema.extend({rules: RuleOptionsSchema}).transform(
      (cfg, ctx) => {
        // these may be expressible in Zod, but seems painful
        if (cfg.all) {
          if (cfg.workspace.length) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: 'Option "workspace" is mutually exclusive with "all"',
            });
            return z.NEVER;
          }
        } else if (cfg.loose) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Option "loose" requires "all" to be set',
          });
          return z.NEVER;
        }

        // special case for --json flag
        if (cfg.json) {
          cfg.reporter = ['json'];
        }

        return cfg;
      },
    );
  }

  /**
   * Instantiates an `OptionsParser`.
   *
   * @param pluginRegistry Plugin registry
   * @returns New `OptionsParser` instance
   */
  public static create(pluginRegistry: PluginRegistry): OptionsParser {
    return new OptionsParser(pluginRegistry);
  }

  /**
   * Merges all rule option defaults into a single object, which becomes the
   * default value of the `rules` prop of `SmokerOptions`.
   *
   * This is needed because `rules` can be `undefined`, and if it is _not_ an
   * object, then the per-option defaults will not be applied.
   *
   * @internal
   */
  protected static mergeRuleDefaults(
    registry: PluginRegistry,
  ): Record<string, unknown> {
    return registry.plugins.reduce(
      (defaults, metadata) =>
        metadata.rules.reduce((acc, anyRule) => {
          const id = registry.getComponentId(anyRule);
          const defaultOptions =
            'schema' in anyRule && anyRule.schema
              ? getDefaultRuleOptions(anyRule.schema)
              : {};
          return {
            ...acc,
            [id]: defaultOptions,
          };
        }, defaults),
      {},
    );
  }

  /**
   * Merges all rule option schemas from all loaded plugins into a single
   * schema, which becomes the `rules` prop of `SmokerOptions`.
   *
   * Zod's `catchall` is used here in the case of rules which do not define
   * options; those options will be passed into the {@link zBaseRuleOptions}
   * schema which passes options through verbatim.
   *
   * @returns A Zod schema representing the merged rule schemas--options _and_
   *   severity--of all loaded plugins
   * @internal
   */
  protected static mergeRuleSchemas(registry: PluginRegistry) {
    return registry.plugins
      .reduce(
        (pluginRuleSchema, metadata) =>
          pluginRuleSchema.merge(
            metadata.rules.reduce((ruleSchema, rule) => {
              const id = registry.getComponentId(rule);
              const schema = rule.schema
                ? createRuleOptionsSchema(rule.schema, rule.defaultSeverity)
                : createRuleOptionsSchema(
                    EmptyObjectSchema,
                    rule.defaultSeverity,
                  );
              return ruleSchema.setKey(id, schema);
            }, z.object({}).catchall(RawRuleOptionsSchema)),
          ),
        z.object({}).catchall(RawRuleOptionsSchema),
      )
      .describe('Rule configuration for automated checks');
  }

  /**
   * Parses options for `Smoker`.
   *
   * @remarks
   * The return type is intentionally omitted and must be inferred.
   * @param opts Options for `Smoker`. Could come from CLI, config file, API, or
   *   some combination thereof.
   * @returns Parsed & normalized options.
   */
  public parse(opts: RawSmokerOptions | SmokerOptions = {}): SmokerOptions {
    // TODO: check if this ever happens
    if (this.#parseResultCache.has(opts as SmokerOptions)) {
      return opts as SmokerOptions;
    }
    const schema = OptionsParser.buildSmokerOptionsSchema(this.#pluginRegistry);
    let result: SmokerOptions;
    if (isEmpty(opts)) {
      debug('No options provided; using defaults');
    } else {
      debug('Parsing raw options: %O', opts);
    }
    try {
      result = schema.parse(opts ?? {}) as SmokerOptions;
    } catch (err) {
      throw asValidationError(err);
    }

    this.#parseResultCache.add(result);
    debug('Normalized SmokerOptions: %O', result);
    return result;
  }
}
