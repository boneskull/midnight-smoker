import type {PluginRegistry} from '#plugin/plugin-registry';
import {isZodError} from '#util/error-util';
import Debug from 'debug';
import {z} from 'zod';
import {fromZodError} from 'zod-validation-error';
import {
  BaseSmokerOptionsSchema,
  type RawSmokerOptions,
  type SmokerOptions,
} from './options';

export const debug = Debug('midnight-smoker:options');

/**
 * Handles parsing options (CLI, config file) for `midnight-smoker`.
 *
 * Options are dynamic based on installed plugins.
 */

export class OptionParser {
  private parseResultCache: WeakSet<SmokerOptions> = new WeakSet();

  private constructor(private readonly registry: PluginRegistry) {}

  /**
   * Parses options for `Smoker`.
   *
   * @param opts Options for `Smoker`. Could come from CLI, config file, API, or
   *   some combination thereof.
   * @returns Parsed & normalized options.
   */
  parse(opts?: RawSmokerOptions | SmokerOptions): SmokerOptions {
    if (this.parseResultCache.has(opts as SmokerOptions)) {
      return opts as SmokerOptions;
    }
    const schema = OptionParser.buildSmokerOptionsSchema(this.registry);
    let result: SmokerOptions;
    try {
      result = schema.parse(opts ?? {});
    } catch (err) {
      throw isZodError(err) ? fromZodError(err) : err;
    }

    this.parseResultCache.add(result);
    debug('Normalized options: %O', result);
    return result;
  }

  static buildSmokerOptionsSchema(registry: PluginRegistry) {
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

  static create(pluginRegistry: PluginRegistry) {
    return new OptionParser(pluginRegistry);
  }
}
