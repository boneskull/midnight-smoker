/**
 * Exports all errors which may be externally consumable.
 *
 * This should _not_ export from the following files:
 *
 * - `base-error.ts` - plugins should not build their own errors (until determined
 *   otherwise)
 * - `internal-error.ts` - plugins won't have the ability to catch any of these
 *   and should not throw them
 *
 * @packageDocumentation
 */

export * from './common-error';
export * from './exec-error';
export * from './install-error';
export * from './pack-error';
export * from './pkg-manager-error';
export * from './reporter-error';
export * from './rule-error';
export * from './script-error';
export * from './smoker-error';
