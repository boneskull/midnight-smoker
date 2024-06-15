import {type PluginRegistry} from '#plugin/plugin-registry';
import {isZodError} from '#util/error-util';
import Debug from 'debug';
import {z} from 'zod';
import {fromZodError} from 'zod-validation-error';
import {
  BaseSmokerOptionsSchema,
  type RawSmokerOptions,
  type SmokerOptions,
} from './options';

export const debug = Debug('midnight-smoker:options:options-parser');

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
    const RuleOptionsSchema = registry.buildRuleOptions();
    return BaseSmokerOptionsSchema.extend({rules: RuleOptionsSchema}).transform(
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
   * Parses options for `Smoker`.
   *
   * @remarks
   * The return type is intentionally omitted and must be inferred.
   * @param opts Options for `Smoker`. Could come from CLI, config file, API, or
   *   some combination thereof.
   * @returns Parsed & normalized options.
   */
  public parse(opts?: RawSmokerOptions | SmokerOptions) {
    if (this.#parseResultCache.has(opts as SmokerOptions)) {
      return opts as SmokerOptions;
    }
    const schema = OptionsParser.buildSmokerOptionsSchema(this.#pluginRegistry);
    let result: SmokerOptions;
    debug('Parsing raw options: %O', opts);
    try {
      result = schema.parse(opts ?? {});
    } catch (err) {
      throw isZodError(err) ? fromZodError(err) : err;
    }

    this.#parseResultCache.add(result);
    debug('Normalized options: %O', result);
    return result;
  }
}
