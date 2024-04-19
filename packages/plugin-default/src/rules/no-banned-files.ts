/**
 * `no-banned-files` checks for banned files in the package.
 *
 * Portions of this adapted from
 * [ban-sensitive-files](https://github.com/bahmutov/ban-sensitive-files),
 * including `git-deny-patterns.json` and {@link reToRegExp}.
 *
 * @packageDocumentation
 */

import Debug from 'debug';
import type {PluginAPI} from 'midnight-smoker/plugin';
import fs from 'node:fs/promises';
import path from 'node:path';
import DenyPatterns from '../../data/git-deny-patterns.json';

const debug = Debug('midnight-smoker:no-banned-files');

/**
 * One of the items in `git-deny-patterns.json`
 *
 * @internal
 */
interface DenyPattern {
  part: 'filename' | 'extension';
  type: 'regex' | 'match';
  pattern: string;
  caption: string;
  description: string | null;
}

const denyPatterns = DenyPatterns as DenyPattern[];

/**
 * Cache of {@link RegExp} objects from the datafile(s)
 *
 * @internal
 */
const regExMap = new Map<string, RegExp>();

/**
 * Just caching some `RegExp` objects.
 *
 * @param pattern RegExp as a string
 * @returns A RegExp
 */
function getRegExp(pattern: string) {
  if (!regExMap.has(pattern)) {
    regExMap.set(pattern, new RegExp(pattern));
  }
  return regExMap.get(pattern)!;
}

/**
 * Uses a list of {@link DenyPattern} objects to check if a filename is banned
 *
 * @param filename Filename to check
 * @returns If the file is banned, a string with a description; otherwise,
 *   `undefined`
 */
function descriptionIfBanned(filename: string): string | undefined {
  // denyPatterns = await loadDenyPatterns();
  for (const {part, type, pattern, caption: description} of denyPatterns) {
    const value =
      part === 'filename'
        ? filename
        : // match an extension instead; strip leading . from path.extname()'s output
          path.extname(filename).replace(/^\./, '');

    if (
      (type === 'match' && value === pattern) ||
      (type === 'regex' && getRegExp(pattern).test(value))
    ) {
      return description;
    }
  }
}

export default function noBannedFiles({
  defineRule,
  SchemaUtils: schemaUtils,
  z,
}: PluginAPI) {
  defineRule({
    async check({installPath, addIssue}, opts) {
      const queue: string[] = [installPath];
      const allow = new Set(opts.allow);
      const deny = new Set(opts.deny);

      while (queue.length) {
        const dir = queue.pop()!;
        // debug('Reading directory %s', dir);
        const dirents = await fs.readdir(dir, {withFileTypes: true});
        for (const dirent of dirents) {
          if (dirent.isDirectory()) {
            if (path.basename(dirent.name) === 'node_modules') {
              continue;
            }
            queue.push(path.join(dir, dirent.name));
          } else {
            if (allow.has(dirent.name)) {
              continue;
            }

            const relName = path.join(
              path.relative(installPath, dir),
              dirent.name,
            );

            if (deny.has(dirent.name)) {
              addIssue(`Banned file found: ${relName} (per custom deny list)`);
            } else {
              const description = descriptionIfBanned(dirent.name);
              if (description) {
                addIssue(`Banned file found: ${relName} (${description})`);
              }
            }
          }
        }
      }
    },
    name: 'no-banned-files',
    description: `Ensures banned files won't be published to the registry`,
    url: 'https://boneskull.github.io/midnight-smoker/rules/no-banned-files',

    /**
     * @todo Add a a list of paths to ignore (e.g., `node_modules`)
     *
     * @todo Allow `RegExp` strings or glob pattern matching
     */
    schema: z.object({
      allow: schemaUtils.NonEmptyStringToArraySchema.describe(
        'Allow these banned files',
      ),
      deny: schemaUtils.NonEmptyStringToArraySchema.describe(
        'Deny these additional files',
      ),
    }),
  });
}
