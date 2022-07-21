#!/usr/bin/env node

const yargs = require('yargs/yargs');
const {smoke} = require('./index.js');

const BEHAVIOR_GROUP = 'Behavior:';

/**
 *
 * @param {string[]} args
 * @returns {Promise<void>}
 */
async function main(args) {
  const y = yargs(args);
  await y
    .scriptName('smoker')
    .command(
      '* <script> [scripts..]',
      'Run tests against a package as it would be published',
      (yargs) =>
        yargs
          .positional('script', {type: 'string'})
          .positional('scripts', {type: 'string'})
          .options({
            workspace: {
              requiresArg: true,
              type: 'string',
              describe: 'One or more npm workspaces to test',
              group: BEHAVIOR_GROUP,
              array: true,
            },
            all: {
              type: 'boolean',
              describe: 'Test all workspaces',
              group: BEHAVIOR_GROUP,
            },
            'include-root': {
              type: 'boolean',
              describe: "Include the workspace root; must provide '--all'",
              group: BEHAVIOR_GROUP,
              implies: 'all',
            },
            'install-args': {
              requiresArg: true,
              describe: 'Extra arguments to pass to `npm install`',
              type: 'string',
              array: true,
              group: BEHAVIOR_GROUP,
            },
            dir: {
              requiresArg: true,
              type: 'string',
              describe: 'Working directory to use',
              defaultDescription: 'new temp dir',
              group: BEHAVIOR_GROUP,
            },
            force: {
              type: 'boolean',
              group: BEHAVIOR_GROUP,
              describe: 'Overwrite working directory if it exists',
            },
            clean: {
              type: 'boolean',
              group: BEHAVIOR_GROUP,
              describe: "Truncate working directory; must provide '--force'",
              implies: 'force',
            },
            npm: {
              type: 'string',
              requiresArg: true,
              describe: 'Path to `npm` executable',
              defaultDescription: '`npm` in PATH',
              group: BEHAVIOR_GROUP,
              normalize: true,
            },
            verbose: {
              type: 'boolean',
              describe: 'Print output from npm',
              group: BEHAVIOR_GROUP,
            },
            linger: {
              type: 'boolean',
              describe: 'Do not clean up working dir after completion',
              hidden: true,
              group: BEHAVIOR_GROUP,
            },
          })
          .check((argv) => {
            if (
              Array.isArray(argv['install-args']) &&
              argv['install-args'].length > 1
            ) {
              throw new Error('--install-args can only be provided once');
            }
            return true;
          }),
      async (argv) => {
        const scripts = [
          /** @type {string} */ (argv.script),
          ...(argv.scripts ?? []),
        ];

        await smoke(scripts, argv);
      }
    )
    .help()
    .strict()
    .parseAsync();
}

main(process.argv.slice(2));
