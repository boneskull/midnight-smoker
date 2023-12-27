import {bold, cyan, yellow} from 'chalk';
import Table from 'cli-table3';
import deepmerge from 'deepmerge';
import {isError, merge, pick} from 'lodash';
import stringWidth from 'string-width';
import {MergeDeep, Primitive} from 'type-fest';
import {ArgumentsCamelCase} from 'yargs';
import {BaseSmokerError} from '../error/base-error';
import {RawSmokerOptions} from '../options/options';

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
 * @todo Evaluate how correct this is in terms of both types and merging
 *   (especially arrays)
 */
export function mergeOptions<T extends object, U extends object>(
  argv: T,
  config: U,
): MergeDeep<T, U> {
  return Object.assign(argv, deepmerge(config, argv) as MergeDeep<T, U>);
}

export function createConfigMerge<
  Opts extends RawSmokerOptions,
  Props extends keyof Opts,
>(config: Opts, props?: Props[]) {
  const picked: Pick<Opts, Props> = props?.length
    ? pick(config, props)
    : config;

  /**
   * Merges parsed `argv` with the loaded `config` object--with `argv` taking
   * precedence--and assigns the result to `argv`.
   *
   * @template T - Type of the parsed `argv` object
   * @param argv - Parsed options from `yargs`
   */
  return async (argv: ArgumentsCamelCase<Opts>) => {
    merge(argv, picked);
  };
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
export function handleRejection(err: unknown, verbose = false, json = false) {
  if (json) {
    let output: {error: any};
    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      output = {error: (err as any).toJSON()};
    } catch {
      output = {error: BaseSmokerError.prototype.toJSON.call(err)};
    }
    // if we cannot serialize the error, just throw it, and give us an "A" for effort
    try {
      console.log(JSON.stringify(output));
    } catch {
      throw err;
    }
  } else {
    let output: any;
    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      output = (err as any).format(verbose);
    } catch {
      if (isError(err)) {
        try {
          output = BaseSmokerError.prototype.format.call(err, verbose);
        } catch {}
      }
    }
    console.error(output ?? err);
  }
}
