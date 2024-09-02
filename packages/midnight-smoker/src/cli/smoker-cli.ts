/**
 * The `smoker` CLI
 *
 * This module exports nothing. Don't try to import it.
 *
 * @module midnight-smoker/cli
 */

import {ConfigReader} from '#config/config-reader';
import {SCRIPT_NAME} from '#constants';
import {createDebug} from '#util/debug';
import {FileManager} from '#util/filemanager';
import {omit} from 'lodash';
import terminalLink from 'terminal-link';
import {hideBin} from 'yargs/helpers';
import yargs from 'yargs/yargs';

import {mergeOptions} from './cli-util';
import {
  LintCommand,
  ListCommand,
  RunScriptCommand,
  ViewCommand,
} from './command';
import {GlobalOptions} from './command/global-opts';

const debug = createDebug('cli');

/**
 * Main entry point for the CLI script
 *
 * @param args Raw command-line arguments array
 */
async function main(args: string[]): Promise<void> {
  const y = yargs(args);

  const {homepage, name, version} =
    await FileManager.create().readSmokerPkgJson();

  debug('%s v%s', name, version);

  await y
    .scriptName(SCRIPT_NAME)
    .options(GlobalOptions)
    .command(new LintCommand())
    .command(new ListCommand())
    .command(new RunScriptCommand())
    .command(new ViewCommand())
    .middleware(async (argv) => {
      const config = await ConfigReader.read({configFile: argv.config});
      // ensure "config" cannot be set using the config file.
      mergeOptions(argv, omit(config, ['config', 'c']));
    })
    // this is the USA dammit
    .epilog(
      `RTFM at: ${terminalLink(`${homepage}`, `${homepage}`, {
        fallback: false,
      })}\n`,
    )
    .showHelpOnFail(true)
    .help()
    .strict()
    .parseAsync();
}

void main(hideBin(process.argv)).catch((err) => {
  debug(err);
  throw err;
});