/**
 * `no-banned-files` checks for banned files in the package.
 *
 * Portions of this adapted from [ban-sensitive-files](https://github.com/bahmutov/ban-sensitive-files), including `git-deny-patterns.json` and {@linkcode reToRegExp}.
 * @module
 */

import createDebug from 'debug';
import fs from 'node:fs/promises';
import path from 'node:path';
import {z} from 'zod';
import {zNonEmptyStringArray} from '../../schema-util';
import {findDataDir} from '../../util';
import type {CheckFailure} from '../result';
import {createRule} from '../rule';

const debug = createDebug('midnight-smoker:rule:no-banned-files');

/**
 * One of the items in `git-deny-patterns.json`
 */
interface DenyPattern {
  part: 'filename' | 'extension';
  type: 'regex' | 'match';
  pattern: string;
  caption: string;
  description: string | null;
}

let denyPatterns: DenyPattern[];
/**
 * Load and cache the deny patterns
 */
async function loadDenyPatterns() {
  if (denyPatterns) {
    return denyPatterns;
  }
  const dataDir = await findDataDir();
  const patterns = await fs.readFile(
    path.join(dataDir, 'git-deny-patterns.json'),
    'utf-8',
  );
  denyPatterns = JSON.parse(patterns);
  return denyPatterns;
}

const regExMap = new Map<string, RegExp>();
/**
 * Just caching some `RegExp` objects.
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
 * Uses a list of {@linkcode DenyPattern} objects to check if a filename is banned
 * @param filename Filename to check
 * @returns If the file is banned, a string with a description; otherwise, `undefined`
 */
async function isBannedFilename(filename: string): Promise<string | undefined> {
  denyPatterns = await loadDenyPatterns();
  for (const {part, type, pattern, caption} of denyPatterns) {
    const value =
      part === 'filename'
        ? filename
        : path.extname(filename).replace(/^\./, '');

    if (
      (type === 'match' && value === pattern) ||
      (type === 'regex' && getRegExp(pattern).test(value))
    ) {
      return caption;
    }
  }
}

const noBannedFiles = createRule({
  async check({pkgPath, fail}, opts) {
    const queue: string[] = [pkgPath];
    const failed: CheckFailure[] = [];
    const allow = new Set(opts.allow);
    const deny = new Set(opts.deny);

    while (queue.length) {
      const dir = queue.pop()!;
      debug('Reading directory %s', dir);
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
          if (deny.has(dirent.name)) {
            failed.push(
              fail(`Banned file found: ${dirent.name} (per custom deny list)`),
            );
          } else {
            const banned = await isBannedFilename(dirent.name);
            if (banned) {
              failed.push(
                fail(`Banned file found: ${dirent.name} (${banned})`),
              );
            }
          }
        }
      }
    }

    return failed;
  },
  name: 'no-banned-files',
  description: 'Bans certain files from being published',
  schema: z.object({
    allow: zNonEmptyStringArray.describe('Allow these banned files'),
    deny: zNonEmptyStringArray.describe('Deny these additional files'),
  }),
});

export default noBannedFiles;
