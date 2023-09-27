import {z} from 'zod';
import noBannedFiles from './builtin/no-banned-files';
import noMissingEntryPoint from './builtin/no-missing-entry-point';
import noMissingExports from './builtin/no-missing-exports';
import noMissingPkgFiles from './builtin/no-missing-pkg-files';

/**
 * Default options for rule behavior (the `rules` prop in `SmokerOptions`).
 *
 * Dynamically created by each rule's `defaultOptions` property.
 *
 * @internal
 */
export const DEFAULT_CHECK_OPTIONS = {
  [noMissingPkgFiles.name]: noMissingPkgFiles.defaultOptions,
  [noBannedFiles.name]: noBannedFiles.defaultOptions,
  [noMissingEntryPoint.name]: noMissingEntryPoint.defaultOptions,
  [noMissingExports.name]: noMissingExports.defaultOptions,
} as const;

/**
 * @internal
 */
export const zCheckOptions = z
  .object({
    [noBannedFiles.name]: noBannedFiles.zRuleSchema,
    [noMissingPkgFiles.name]: noMissingPkgFiles.zRuleSchema,
    [noMissingEntryPoint.name]: noMissingEntryPoint.zRuleSchema,
    [noMissingExports.name]: noMissingExports.zRuleSchema,
  })
  .default(DEFAULT_CHECK_OPTIONS)
  .describe('Rule configuration for checks');

/**
 * The input type for {@linkcode zCheckOptions}
 * @internal
 */
export type RawCheckOptions = z.input<typeof zCheckOptions>;

/**
 * The parsed and normalized type for {@linkcode zCheckOptions}
 */
export type CheckOptions = z.infer<typeof zCheckOptions>;
