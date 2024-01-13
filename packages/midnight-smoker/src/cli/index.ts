import Debug from 'debug';
import {omit} from 'lodash';
import terminalLink from 'terminal-link';
import {hideBin} from 'yargs/helpers';
import yargs from 'yargs/yargs';
import {readConfigFile} from '../config-file';
import {readSmokerPkgJson} from '../pkg-util';
import {GlobalOptions, handleRejection, mergeOptions} from './cli-util';
import {LintCommand, ListCommand, RunScriptCommand} from './command';

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
    .scriptName('smoker')
    .options(GlobalOptions)
    .command(new LintCommand())
    .command(new ListCommand())
    .command(new RunScriptCommand())
    .middleware(async (argv) => {
      const config = await readConfigFile(argv.config);
      // ensure "config" cannot be set using the config file.
      mergeOptions(argv, omit(config, ['config', 'c']));
    })
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

main(hideBin(process.argv)).catch((err) => {
  process.exitCode = 1;
  handleRejection(err);
});
