import {formatKeypath} from 'midnight-smoker/util';
import path from 'node:path';

import type {
  ExportConditions,
  NMEContext,
  NMETask,
  RootNMEContext,
} from './types';

import {
  CANONICAL_PACKAGE_JSON,
  CONDITIONAL_EXPORT_DEFAULT,
  CONDITIONAL_EXPORT_IMPORT,
  CONDITIONAL_EXPORT_REQUIRE,
  CONDITIONAL_EXPORT_TYPES,
  EXPORTS_FIELD,
  MAIN_FIELD,
} from './constants';
import * as guards from './guards';

/**
 * Checks if an ESM package has no `exports` field nor `main` field. One of
 * these is required.
 */
export const checkUndefinedExportsField: NMETask = (ctx) => {
  if (
    guards.isPackageESM([], ctx) &&
    guards.packageJsonMissingField('main', ctx) &&
    guards.packageJsonMissingField('exports', ctx)
  ) {
    return [
      [`No "${EXPORTS_FIELD}" nor "${MAIN_FIELD}" field found in ES package`],
    ];
  }
};

/**
 * The `exports` field cannot be `null`.
 *
 * If this occurs, it should have also alerted in the IDE or linter or
 * something.
 */
export const checkNullExportsField: NMETask = ({exportsValue, keypath}) => {
  if (exportsValue === null) {
    const jsonField = formatKeypath(keypath);
    return [
      [
        `Field ${jsonField} cannot be a null literal`,
        {
          jsonField,
        },
      ],
    ];
  }
};

export const checkDefaultConditional: NMETask<NMEContext<ExportConditions>> = (
  ctx,
) => {
  if (
    guards.hasConditionalExport(undefined, ctx) &&
    CONDITIONAL_EXPORT_DEFAULT in ctx.exportsValue &&
    guards.isDefaultConditionalNotLast(undefined, ctx)
  ) {
    const fullName = formatKeypath(ctx.keypath);
    return [
      [
        `Conditional ${fullName} must be the last export`,
        {
          jsonField: formatKeypath(ctx.keypath),
        },
      ],
    ];
  }
};

/**
 * Checks if `./package.json` is exported at `./package.json`.
 *
 * @privateRemarks
 * TODO: This is probably broken, as conditional exports of `./package.json`
 * should be equivalent. This check would need to move into `traverseExports`.
 */
export const checkPackageJsonExport: NMETask<RootNMEContext> = (ctx) => {
  if (
    ctx?.shouldExportPackageJson &&
    guards.hasConditionalExport(undefined, ctx)
  ) {
    if (!(CANONICAL_PACKAGE_JSON in ctx.exportsValue)) {
      return [
        [
          `Expected "${CANONICAL_PACKAGE_JSON}" to be exported`,
          {
            jsonField: EXPORTS_FIELD,
          },
        ],
      ];
    }
    if (
      guards.packageJsonExportIsNotCanonical(
        ctx.exportsValue[CANONICAL_PACKAGE_JSON],
        ctx,
      )
    ) {
      return [
        [
          `Expected "${CANONICAL_PACKAGE_JSON}" to be exported`,
          {
            jsonField: EXPORTS_FIELD,
          },
        ],
      ];
    }
  }
};

/**
 * Runs checks on a single file or glob pattern referenced in the `exports`
 * field.
 *
 * Checks (in roughly this order):
 *
 * 1. If `relPath` is `null` (do nothing)
 * 2. If `relPath` is an empty string
 * 3. If `relPath` is a glob pattern and globs are not allowed
 * 4. If `relPath` is a glob pattern and matches no files
 * 5. If `relPath` is missing or un-`stat`-able
 * 6. If `key` is conditional `require` and `relPath` is not a script
 * 7. If `key` is conditional `import` and `relPath` is not a module
 * 8. If `key` is conditional `types` and `relPath` is not a declaration file
 */
export const checkFile: NMETask<NMEContext<null | string>> = async (ctx) => {
  const {exportsValue, keypath} = ctx;

  // null is allowed; it means "do not export this"
  if (exportsValue === null) {
    return;
  }

  const relPath = exportsValue;
  const jsonField = formatKeypath(keypath);

  // seems wrong to have an empty string for a path!
  if (guards.isEmptyString(relPath, ctx)) {
    return [
      [`Export field ${jsonField} contains an empty string`, {jsonField}],
    ];
  }

  if (guards.isGlobPattern(relPath, ctx)) {
    if (!ctx.shouldAllowGlobs) {
      return [
        [
          `Export ${jsonField} contains a glob pattern; glob patterns are disallowed by rule options`,
          {jsonField},
        ],
      ];
    }

    if (await guards.globPatternMatchesNothing(relPath, ctx)) {
      return [
        [
          `Export ${jsonField} matches no files using glob: ${relPath}`,
          {jsonField},
        ],
      ];
    }

    return [];
  }

  const absPath = path.resolve(ctx.installPath, relPath);

  if (await guards.isFileMissing(absPath, ctx)) {
    return [[`${relPath} unreadable at field ${jsonField}`, {jsonField}]];
  }

  const key = keypath[keypath.length - 1]!;

  switch (key) {
    case CONDITIONAL_EXPORT_IMPORT: {
      if (
        !!ctx.shouldCheckImportConditional &&
        (await guards.isFileCJS(absPath, ctx))
      ) {
        return [
          [
            `${relPath} is not an EcmaScript module at field ${jsonField}`,
            {
              jsonField,
            },
          ],
        ];
      }
      break;
    }
    case CONDITIONAL_EXPORT_REQUIRE: {
      if (
        !!ctx.shouldCheckRequireConditional &&
        (await guards.isFileESM(absPath, ctx))
      ) {
        return [
          [
            `${relPath} is not a CommonJS script at field ${jsonField}`,
            {
              jsonField,
            },
          ],
        ];
      }
      break;
    }
    case CONDITIONAL_EXPORT_TYPES: {
      if (
        !!ctx.shouldCheckTypesConditional &&
        guards.conditionalExportIsNotTsDeclaration(absPath, ctx)
      ) {
        return [
          [
            `${relPath} is not a .d.ts file at field ${jsonField}`,
            {
              jsonField,
            },
          ],
        ];
      }
      break;
    }
  }
  return [];
};

/**
 * Called when a field is of an unexpected type
 */
export const checkUnknownType: NMETask = ({keypath}) => {
  return [
    [
      `${formatKeypath(keypath)} is of an unexpected type`,
      {jsonField: formatKeypath(keypath)},
    ],
  ];
};
