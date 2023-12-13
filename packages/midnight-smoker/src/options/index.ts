/**
 * Handles parsing of options (CLI, API, or config file) for `midnight-smoker`
 *
 * @packageDocumentation
 */
import Debug from 'debug';
import z, {type ZodError} from 'zod';
import {fromZodError} from 'zod-validation-error';
import {PluginRegistry} from '../plugin/registry';
import {RawSmokerOptions, SmokerOptions, zBaseSmokerOptions} from './options';

const debug = Debug('midnight-smoker:options');

/**
 * Handles parsing options (CLI, config file) for `midnight-smoker`.
 *
 * Options are dynamic based on installed plugins.
 */
export class OptionParser {
  private parseResultCache: WeakSet<SmokerOptions>;

  private constructor(private readonly registry: PluginRegistry) {
    this.parseResultCache = new WeakSet();
  }

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
    const zSmokerOpts = OptionParser.buildSmokerOptions(this.registry);
    let result: SmokerOptions;
    try {
      result = zSmokerOpts.parse(opts ?? {});
    } catch (err) {
      throw fromZodError(err as ZodError);
    }

    this.parseResultCache.add(result);
    debug('Normalized options: %O', result);
    return result;
  }

  static buildSmokerOptions(registry: PluginRegistry) {
    const zRuleOptions = registry.buildRuleOptions();
    return zBaseSmokerOptions
      .setKey('rules', zRuleOptions)
      .transform((cfg, ctx) => {
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

        // stuff `scripts` into into `script`
        const script = [...new Set([...cfg.script, ...cfg.scripts])];

        // special case for --json flag
        if (cfg.json) {
          cfg.reporter = ['json'];
        }

        return {
          ...cfg,
          script,
        };
      });
  }

  static create(pluginRegistry: PluginRegistry) {
    return new OptionParser(pluginRegistry);
  }
}
