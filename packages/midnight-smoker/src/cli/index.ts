/**
 * The `smoker` CLI
 *
 * This module exports nothing. Don't try to import it.
 *
 * @module midnight-smoker/cli
 */

import {ConfigReader} from '#config/config-reader';
import {SCRIPT_NAME} from '#constants';
import {readSmokerPkgJson} from '#util/pkg-util';
import Debug from 'debug';
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

const debug = Debug('midnight-smoker:cli');

/**
 * Main entry point for the CLI script
 *
 * @param args Raw command-line arguments array
 */
async function main(args: string[]): Promise<void> {
  const y = yargs(args);

  const {name, version, homepage} = await readSmokerPkgJson();

  debug('%s v%s', name, version);

  await y
    .scriptName(SCRIPT_NAME)
    .options(GlobalOptions)
    .command(new LintCommand())
    .command(new ListCommand())
    .command(new RunScriptCommand())
    .command(new ViewCommand())
    .middleware(async (argv) => {
      const config = await ConfigReader.read(argv.config);
      // ensure "config" cannot be set using the config file.
      mergeOptions(argv, omit(config, ['config', 'c']));
    })
    .epilog(
      `RTFM at: ${terminalLink(`${homepage}`, `${homepage}`, {
        fallback: false,
      })}\n`,
    )
    .showHelpOnFail(false)
    .help()
    .strict()
    .parseAsync();
}

void main(hideBin(process.argv));
