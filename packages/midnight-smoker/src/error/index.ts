/**
 * All errors which aren't unique to a specific component or other area.
 *
 * Includes building blocks for other errors.
 *
 * @module midnight-smoker/error
 */

export * from '#schema/script-error';

export * from './base-error';

export * from './codes';

export * from './component-collision-error';

export * from './create-dir-error';

export * from './disallowed-plugin-error';

export * from './duplicate-plugin-error';

export * from './exec-error';

export * from './install-error';

export * from './invalid-arg-error';

export * from './invalid-component-error';

export * from './invalid-plugin-error';

export * from './missing-pkg-json-error';

export * from './not-implemented-error';

export * from './pack-error';

export * from './pkg-manager-error';

export * from './plugin-conflict-error';

export * from './plugin-import-error';

export * from './plugin-init-error';

export * from './plugin-resolution-error';

export * from './reporter-error';

export * from './rule-error';

export * from './run-script-error';

export * from './script-bailed';

export * from './script-failed-error';

export * from './smoker-error';

export * from './smoker-reference-error';

export * from './unknown-dist-tag-error';

export * from './unknown-script-error';

export * from './unknown-version-error';

export * from './unknown-version-range-error';

export * from './unreadable-pkg-json-error';

export * from './unresolvable-plugin-error';

export * from './unsupported-pkg-manager-error';

export * from './from-unknown-error';
