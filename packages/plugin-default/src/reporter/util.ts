import {bold, cyanBright, whiteBright} from 'chalk';
import {MIDNIGHT_SMOKER} from 'midnight-smoker/constants';
import {type StaticPluginMetadata} from 'midnight-smoker/plugin';
import {type PackageJson} from 'midnight-smoker/schema';
import {formatNameAndVersion, isBlessedPlugin} from 'midnight-smoker/util';
import pluralize from 'pluralize';
import {type LiteralUnion} from 'type-fest';

export const ELLIPSIS = '…';

type Digit = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

/**
 * Mapping of single-digit integers to English words
 */
const NUM_WORDS = new Map([
  [0, 'zero'],
  [1, 'one'],
  [2, 'two'],
  [3, 'three'],
  [4, 'four'],
  [5, 'five'],
  [6, 'six'],
  [7, 'seven'],
  [8, 'eight'],
  [9, 'nine'],
] as const);

/**
 * Converts a number to an English word, or returns the number as a string if it
 * doesn't exist in {@link NUM_WORDS}
 *
 * @param num - Number to convert
 * @returns English word for `num`, or `num` as a string
 */
function numberToString(num: LiteralUnion<Digit, number>) {
  return NUM_WORDS.get(num as Digit) ?? String(num);
}

/**
 * Wrap {@link pluralize} with {@link numberToString} and the integer in parens
 *
 * @param str - String to pluralize
 * @param count - Count
 * @param withNumber - Whether to show the number
 * @returns A nice string
 */
export function plural(str: string, count: number, withNumber = false) {
  return withNumber
    ? `${numberToString(count)} (${cyanBright(count)}) ${pluralize(str, count)}`
    : pluralize(str, count);
}

export function preface(pkgJson: PackageJson, plugins: StaticPluginMetadata[]) {
  console.error(
    `💨 ${bold(formatNameAndVersion(MIDNIGHT_SMOKER, pkgJson.version))}\n`,
  );
  const extPlugins = plugins.filter(({id}) => !isBlessedPlugin(id));
  if (extPlugins.length) {
    console.error(
      '🔌 Loaded %s: %s',
      plural('external plugin', extPlugins.length, true),
      extPlugins
        .map(({id, version}) => formatNameAndVersion(whiteBright(id), version))
        .join(', '),
    );
  }
}
