/**
 * Handles parsing of options (CLI, API, or config file) for `midnight-smoker`
 * @packageDocumentation
 */
import createDebug from 'debug';
import z, {type ZodError} from 'zod';
import {fromZodError} from 'zod-validation-error';
import {zCheckOptions} from './rules';
import {zFalse, zStringOrArray, zTrue} from './schema-util';

const debug = createDebug('midnight-smoker:options');

/**
 * @internal
 */
export const DEFAULT_PACKAGE_MANAGER_ID = 'npm@latest';

export const zRawSmokerOptions = z
  .object({
    add: zStringOrArray.describe(
      'Add an extra package to the list of packages to be installed.',
    ),
    all: zFalse.describe(
      'Operate on all workspaces. The root workspace is omitted unless `includeRoot` is `true`.',
    ),
    bail: zFalse.describe('Fail on first script failure.'),
    includeRoot: zFalse.describe(
      'Operate on the root workspace. Only has an effect if `all` is `true`.',
    ),
    json: zFalse.describe('Output JSON only.'),
    linger: zFalse.describe('Do not delete temp directories after completion.'),
    verbose: zFalse.describe('Verbose logging.'),
    workspace: zStringOrArray.describe(
      'One or more workspaces to run scripts in.',
    ),
    pm: zStringOrArray
      .default(DEFAULT_PACKAGE_MANAGER_ID)
      .describe('Package manager(s) to use.'),
    script: zStringOrArray.describe('Script(s) to run. Alias of `scripts`.'),
    scripts: zStringOrArray.describe('Script(s) to run. Alias of `script`.'),
    loose: zFalse.describe(
      'If `true`, fail if a workspace is missing a script.',
    ),
    checks: zTrue.describe('If `false`, run no builtin checks.'),
    rules: zCheckOptions,
  })
  .describe('midnight-smoker options schema');

/**
 * @internal
 */
export const zSmokerOptions = zRawSmokerOptions
  .transform((cfg, ctx) => {
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

    return {
      ...cfg,
      script,
    };
  })
  .brand<'SmokerOptions'>()
  .readonly();

/**
 * Options for `Smoker` as provided by a user
 */
export type RawSmokerOptions = z.input<typeof zSmokerOptions>;

/**
 * Normalized options for `Smoker`.
 */
export type SmokerOptions = z.output<typeof zSmokerOptions>;

/**
 * Parses options for `Smoker`.
 *
 * @param opts Options for `Smoker`. Could come from CLI, config file, API, or some combination thereof.
 * @returns Parsed & normalized options.
 */
export function parseOptions(
  opts?: RawSmokerOptions | SmokerOptions,
): SmokerOptions {
  if (parseOptions.cache.has(opts)) {
    return parseOptions.cache.get(opts)!;
  }
  let result: SmokerOptions;
  try {
    result = zSmokerOptions.parse(opts ?? {});
  } catch (err) {
    throw fromZodError(err as ZodError);
  }
  parseOptions.cache.set(opts, result);
  parseOptions.cache.set(result, result);
  debug('Normalized options: %O', result);
  return result;
}
parseOptions.cache = new Map<
  RawSmokerOptions | SmokerOptions | undefined,
  SmokerOptions
>();
