/**
 * All errors which aren't unique to a specific component or other area.
 *
 * Includes building blocks for other errors.
 *
 * @module midnight-smoker/error
 */

export * from './base-error';
export * from './codes';
export * from './common-error';
export * from './component-error';
export * from './create-dir-error';
export * from './exec-error';
export * from './install-error';
export * from './internal-error';
export * from './missing-pkg-json-error';
export * from './pack-error';
export * from './pkg-manager-error';
export * from './reporter-error';
export * from './rule-error';
export * from './run-script-error';
export * from './script-bailed';
export type {ScriptError} from './script-error';
export * from './script-failed-error';
export * from './smoker-error';
export * from './unknown-dist-tag-error';
export * from './unknown-script-error';
export * from './unknown-version-error';
export * from './unknown-version-range-error';
export * from './unreadable-pkg-json-error';
export * from './unsupported-pkg-manager-error';
// TODO ExecaError
