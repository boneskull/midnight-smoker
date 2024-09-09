#!/usr/bin/env tsx

/**
 * This script dumps historical version and dist-tag data for npm, yarn, and
 * pnpm into the `../data` dir.
 *
 * This attempts to be transactional as possible; no writing occurs unless all
 * read operations succeed.
 */

import stringify from 'json-stable-stringify';
import {NL} from 'midnight-smoker/util';
import {exec} from 'node:child_process';
import {writeFile} from 'node:fs/promises';
import {normalize, relative} from 'node:path';
import {promisify} from 'node:util';

const execAsync = promisify(exec);

/**
 * The directory where the data files live
 */
const DATA_DIR = normalize(`${__dirname}/../data`);

/**
 * The package managers we pull data for (from the npm registry)
 */
const PKG_MANAGERS = ['npm', 'yarn', 'pnpm'] as const;

/**
 * The URL for yarn v2's tags
 */
const YARN_TAGS_URL = 'https://repo.yarnpkg.com/tags';

export async function main() {
  const toWrite: (readonly [filepath: string, data: string])[] =
    await Promise.all([
      // get versions
      ...PKG_MANAGERS.map(async (pm) => {
        console.error(`Getting ${pm} versions...`);
        const {stdout: versions} = await execAsync(
          `npm info --json ${pm} versions`,
        );
        return [
          normalize(`${DATA_DIR}/${pm}-versions.json`),
          versions,
        ] as const;
      }),
      // get dist-tags
      ...PKG_MANAGERS.map(async (pm) => {
        console.error(`Getting ${pm} dist-tags...`);
        const {stdout: distTags} = await execAsync(
          `npm info --json ${pm} dist-tags`,
        );
        return [
          normalize(`${DATA_DIR}/${pm}-dist-tags.json`),
          distTags,
        ] as const;
      }),
      // yarn stores its data elsewhere because it's special
      (async () => {
        console.error(`Getting yarn v2+ tags & versions...`);
        // the extra JSON parsing is for both safety and to trim cruft from
        // response
        const yarnTags = (await fetch(YARN_TAGS_URL).then((res) =>
          res.json(),
        )) as {
          [k: string]: unknown;
          latest: Record<string, string>;
          tags: string[];
        };
        return [
          normalize(`${DATA_DIR}/yarn-tags.json`),
          stringify(
            {latest: yarnTags.latest, tags: yarnTags.tags},
            {space: 2},
          ) + NL,
        ] as const;
      })(),
    ]);

  console.error('Read success; writing...');

  await Promise.all(
    toWrite.map(async ([path, data]) => {
      await writeFile(path, data, 'utf-8');
      console.error(`Wrote data to ${relative(process.cwd(), path)}`);
    }),
  );
}

if (require.main === module) {
  main()
    .then(() => {
      console.error('Done');
    })
    .catch((err) => {
      console.error(err);
      process.exitCode = 1;
    });
}
