import * as assert from '#util/assert';
import {formatStackTrace} from '#util/format';
import {isError} from '#util/guard/common';
import {isSomeSmokerError} from '#util/guard/some-smoker-error';
import {serialize} from '#util/serialize';
import {bold, cyan, yellow} from 'chalk';
import Table from 'cli-table3';
import {mergeWith, omit} from 'lodash';
import stringWidth from 'string-width';
import {type Jsonifiable, type MergeDeep, type Primitive} from 'type-fest';

/**
 * Creates a table (for display in the console) with the given items and
 * headers.
 *
 * @param items - The items to be displayed in the table.
 * @param headers - The headers of the table.
 * @param padding - The padding between the content and the table borders.
 *   Default is 1.
 * @returns The created table.
 */
export function createTable(
  items: Primitive[][],
  headers: Primitive[],
  padding = 1,
) {
  const termCols = process.stdout.columns;
  // we must take padding into account
  const headerWidths = headers.map((h) => stringWidth(String(h)) + padding * 2);
  const extraTableWidth = headers.length + 1;

  const colWidths = items.reduce<number[]>(
    (widths, item) => {
      item.forEach((col, i) => {
        widths[i] = Math.max(
          widths[i] ?? 0,
          stringWidth(String(col)) + padding * 2,
          headerWidths[i] ?? 0,
        );
      });
      return widths;
    },
    headers.map(() => 0),
  );

  const maxCol = Math.max(...colWidths);
  const totalWidth = extraTableWidth + colWidths.reduce((a, b) => a + b, 0);
  if (totalWidth > termCols) {
    const diff = totalWidth - termCols;
    const colIdx = colWidths.indexOf(maxCol);
    assert.ok(colWidths[colIdx]);
    colWidths[colIdx] -= diff;
  }

  return items.reduce(
    (table, item) => {
      const strItems = item.map(String);
      table.push([yellow(bold(item[0])), ...strItems.slice(1)]);
      return table;
    },
    new Table({
      colWidths,
      head: headers.map((header) => cyan(header)),
      style: {head: [], 'padding-left': padding, 'padding-right': padding},
      wordWrap: true,
    }),
  );
}

/**
 * Merges the given `argv` object into the `config` object, assigning the result
 * onto `argv`.
 *
 * **Mutates `argv`**.
 *
 * @param argv - Command-line args, parsed by `yargs`
 * @param config - Configuration file contents, as loaded by `lilconfig`
 * @returns The mutated object
 */
export function mergeOptions<T extends object, U extends object>(
  argv: T,
  config: U,
): MergeDeep<T, U, {recurseIntoArrays: true}> {
  return mergeWith(argv, config, (objValue, srcValue) => {
    if (Array.isArray(objValue) && Array.isArray(srcValue)) {
      return [...(objValue as unknown[]), ...(srcValue as unknown[])];
    }
  }) as MergeDeep<T, U, {recurseIntoArrays: true}>;
}

/**
 * Used by {@link handleRejection} if we are outputting JSON.
 *
 * @param err - Error thrown somewhere in the command handlers
 * @param verbose - If `true`, output stack trace
 */
function handleJsonRejection(err: unknown, verbose = false): void {
  let error: Jsonifiable;
  if (isSomeSmokerError(err)) {
    const serialized = serialize(err);
    error = verbose
      ? serialized
      : omit(serialized, ['stack', 'context', 'id', 'cause']);
  } else if (isError(err)) {
    error = verbose
      ? {message: err.message, name: err.name, stack: err.stack}
      : {message: err.message, name: err.name};
  } else {
    error = `${err}`;
  }

  console.log(JSON.stringify({error}));
}

/**
 * Error reporter of last resort.
 *
 * Does not set `process.exitCode`.
 *
 * @param err - Error thrown somewhere in the command handlers
 * @param verbose - If `true`, output more information
 * @param json - If `true`, _only_ output JSON and output to STDOUT instead of
 *   STDERR
 */
export function handleRejection(
  err: unknown,
  verbose = false,
  json = false,
): void {
  if (json) {
    handleJsonRejection(err, verbose);
    return;
  }

  let output: string | undefined;
  if (isSomeSmokerError(err)) {
    output = err.format(verbose);
  } else if (isError(err)) {
    output = formatStackTrace(err);
  }
  console.error(output ?? err);
}
