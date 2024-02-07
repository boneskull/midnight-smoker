import {bold, cyan, yellow} from 'chalk';
import Table from 'cli-table3';
import {isError, isFunction, isObject, mergeWith} from 'lodash';
import stringWidth from 'string-width';
import type {MergeDeep, Primitive} from 'type-fest';
import {BaseSmokerError} from '../error/base-error';
import {isSerializable} from '../util/util';

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
          widths[i],
          stringWidth(String(col)) + padding * 2,
          headerWidths[i],
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
    colWidths[colIdx] -= diff;
  }

  return items.reduce(
    (table, item) => {
      const strItems = item.map(String);
      table.push([yellow(bold(item[0])), ...strItems.slice(1)]);
      return table;
    },
    new Table({
      style: {head: [], 'padding-left': padding, 'padding-right': padding},
      head: headers.map((header) => cyan(header)),
      wordWrap: true,
      colWidths,
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
 */
function handleJsonRejection(err: unknown): void {
  const output: {error: unknown} = isSerializable(err)
    ? {error: err.toJSON()}
    : {error: BaseSmokerError.prototype.toJSON.call(err)};

  // if we cannot serialize the error, just throw it, and give us an "A" for effort
  try {
    console.log(JSON.stringify(output));
  } catch {
    throw err;
  }
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
    handleJsonRejection(err);
    return;
  }

  let output: string | undefined;
  // TODO add a Formattable type like Serializable + type guard
  if (isObject(err) && 'format' in err && isFunction(err.format)) {
    output = `${err.format(verbose)}`;
  } else {
    if (isError(err)) {
      try {
        output = BaseSmokerError.prototype.format.call(err, verbose);
      } catch {}
    }
  }
  console.error(output ?? err);
}
