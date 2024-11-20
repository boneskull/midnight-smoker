import type {PluginAPI} from 'midnight-smoker/plugin';

import {PACKAGE_JSON} from 'midnight-smoker/constants';

import type {NMEContext, NMETask, NMETaskResult} from './types';

import {createDebug} from '../../debug';
import {
  CONDITIONAL_EXPORT_DEFAULT,
  CONDITIONAL_EXPORT_IMPORT,
  CONDITIONAL_EXPORT_REQUIRE,
  CONDITIONAL_EXPORT_TYPES,
  EXPORTS_FIELD,
} from './constants';
import * as tasks from './tasks';

/**
 * Enqueues a method call to the task queue.
 *
 * **This function mutates `taskQueue`**
 *
 * @param task - Function to call
 * @param ctx - Context
 * @param taskQueue - The queue
 * @returns The queue with a task appended
 */
function enqueueTask(
  task: NMETask<any>,
  ctx: NMEContext,
  taskQueue: Promise<NMETaskResult>[] = [],
): Promise<NMETaskResult>[] {
  taskQueue.push(
    Promise.resolve()
      .then(() => task.call(null, ctx))
      .then((issues = []) => {
        // since we are only concerned with `package.json`, we can set a default
        // filepath
        issues.forEach(([message, options = {}]) => {
          ctx.addIssue(message, {
            ...options,
            filepath: options?.filepath ?? ctx.pkgJsonPath,
          });
        });
      }),
  );
  return taskQueue;
}

export default function noMissingExports({
  defineRule,
  SchemaUtils: schemaUtils,
  z,
}: PluginAPI) {
  const schema = z.object({
    glob: schemaUtils.DefaultTrueSchema.describe(
      'Allow glob patterns in subpath exports',
    ),
    import: schemaUtils.DefaultTrueSchema.describe(
      `Assert an "${CONDITIONAL_EXPORT_IMPORT}" conditional export references a ESM module`,
    ),
    // TODO move to new rule
    order: schemaUtils.DefaultTrueSchema.describe(
      `Assert conditional export "${CONDITIONAL_EXPORT_DEFAULT}", if present, is the last export`,
    ),
    // TODO: move to new rule
    packageJson: schemaUtils.DefaultTrueSchema.describe(
      `Assert ${PACKAGE_JSON} is exported`,
    ),
    require: schemaUtils.DefaultTrueSchema.describe(
      `Assert a "${CONDITIONAL_EXPORT_REQUIRE}" conditional export references a CJS script`,
    ),
    // TODO: move to TS-specific rule
    types: schemaUtils.DefaultTrueSchema.describe(
      `Assert a "${CONDITIONAL_EXPORT_TYPES}" conditional export references a file with a .d.ts extension`,
    ),
  });

  defineRule({
    async check(ctx, opts) {
      debug('Checking exports in %s using opts %O', ctx.pkgJsonPath, opts);

      const nmeContext: NMEContext = {
        addIssue: ctx.addIssue.bind(ctx),
        exportsValue: ctx.pkgJson[EXPORTS_FIELD],
        installPath: ctx.installPath,
        keypath: [EXPORTS_FIELD],
        pkgJson: ctx.pkgJson,
        pkgJsonPath: ctx.pkgJsonPath,
        shouldAllowGlobs: opts.glob,
        shouldCheckImportConditional: opts.import,
        shouldCheckOrder: opts.order,
        shouldCheckRequireConditional: opts.require,
        shouldCheckTypesConditional: opts.types,
        shouldExportPackageJson: opts.packageJson,
      };

      // these three operate on the root `exports` field only!
      let taskQueue = enqueueTask(tasks.checkNullExportsField, nmeContext);
      taskQueue = enqueueTask(
        tasks.checkPackageJsonExport,
        nmeContext,
        taskQueue,
      );
      taskQueue = enqueueTask(
        tasks.checkUndefinedExportsField,
        nmeContext,
        taskQueue,
      );

      taskQueue = traverseExports(nmeContext, taskQueue);
      await Promise.all(taskQueue);
    },
    description: `Checks that all files in the "${EXPORTS_FIELD}" field (if present) exist`,
    name: 'no-missing-exports',
    schema,
    url: 'https://boneskull.github.io/midnight-smoker/rules/no-missing-exports',
  });
}

/**
 * Recursive function which enqueues async checks of the `exports` field in
 * `package.json`
 *
 * This function is only async so we can recursively enqueue calls to it.
 */
function traverseExports(
  ctx: NMEContext,
  taskQueue: Promise<NMETaskResult>[] = [],
): Promise<NMETaskResult>[] {
  const {keypath} = ctx;

  // should be impossible
  /* c8 ignore next */
  if (ctx.exportsValue === undefined) {
    return taskQueue;
  }

  if (ctx.exportsValue === null || typeof ctx.exportsValue === 'string') {
    return enqueueTask(tasks.checkFile, {...ctx, keypath}, taskQueue);
  }

  if (Array.isArray(ctx.exportsValue)) {
    // recurse
    for (const [idx, value] of ctx.exportsValue.entries()) {
      const itemKeypath = [...keypath, `${idx}`] as const;
      taskQueue.push(
        ...traverseExports({
          ...ctx,
          exportsValue: value,
          keypath: itemKeypath,
        }),
      );
    }
    return taskQueue;
  }

  if (typeof ctx.exportsValue === 'object') {
    // maybe check if `default` is last
    if (ctx.shouldCheckOrder) {
      enqueueTask(
        tasks.checkDefaultConditional,
        {
          ...ctx,
          keypath: [...keypath, CONDITIONAL_EXPORT_DEFAULT] as const,
        },
        taskQueue,
      );
    }

    // recurse
    for (const [key, value] of Object.entries(ctx.exportsValue)) {
      taskQueue.push(
        ...traverseExports({
          ...ctx,
          exportsValue: value,
          keypath: [...keypath, key] as const,
        }),
      );
    }
    return taskQueue;
  }

  // I guess it could be a number!
  return enqueueTask(tasks.checkUnknownType, ctx, taskQueue);
}

const debug = createDebug(__filename);
