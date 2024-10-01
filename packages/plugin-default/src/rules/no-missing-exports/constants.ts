/**
 * The name of the field in `package.json` that contains the exports
 */

import {PACKAGE_JSON} from 'midnight-smoker/constants';

export const EXPORTS_FIELD = 'exports';

/**
 * An ESM package must provide `main` if it does not contain `exports`.
 */

export const MAIN_FIELD = 'main';

/**
 * The name of the `default` in a conditional export
 */

export const CONDITIONAL_EXPORT_DEFAULT = 'default';

/**
 * The key (and expected value) of a `package.json` export
 */
export const CANONICAL_PACKAGE_JSON = `./${PACKAGE_JSON}`;

/**
 * The name of the `import` export in a conditional export
 */

export const CONDITIONAL_EXPORT_REQUIRE = 'require';

/**
 * The name of the `require` export in a conditional export
 */

export const CONDITIONAL_EXPORT_IMPORT = 'import';

/**
 * The name of the `types` export in a conditional export
 */

export const CONDITIONAL_EXPORT_TYPES = 'types';

/**
 * Potential value of the `type` field in `package.json`
 */
export const TYPE_MODULE = 'module';

/**
 * Potential value of the `type` field in `package.json`
 */
export const TYPE_COMMONSEJS = 'commonjs';

export const TS_DECLARATION_EXTENSIONS = ['.d.ts', '.d.cts', '.d.mts'] as const;
