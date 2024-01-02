import Debug from 'debug';
import terminalLink from 'terminal-link';
import type {ArgumentsCamelCase} from 'yargs';
import {hideBin} from 'yargs/helpers';
import yargs from 'yargs/yargs';
import {readConfigFile} from '../config-file';
import {readSmokerPkgJson} from '../pkg-util';
import {GlobalOptions} from './cli-options';
import {handleRejection, mergeOptions} from './cli-util';
import {
  LintCommand,
  ListPluginsCommand,
  ListReportersCommand,
  ListRulesCommand,
  RunScriptCommand,
} from './command';

const debug = Debug('midnight-smoker:cli');

/**
 * Main entry point for the CLI script
 *
 * @param args Raw command-line arguments array
 */
async function main(args: string[]): Promise<void> {
  const y = yargs(args);
  const [pkgJson, config] = await Promise.all([
    readSmokerPkgJson(),
    readConfigFile(),
  ]);

  debug('%s v%s', pkgJson.name, pkgJson.version);

  /**
   * Merges parsed args `argv` with the loaded `config` object--with args taking
   * precedence--and assigns the result to `argv`.
   *
   * @template T - Type of the parsed `argv` object
   * @param argv - Parsed options from `yargs`
   */
  const mergeOpts = <T>(argv: ArgumentsCamelCase<T>): void => {
    mergeOptions(argv, config);
  };

  const epilog = terminalLink.isSupported
    ? `Maybe you should read the docs at: ${terminalLink(
        `${pkgJson.homepage}`,
        `${pkgJson.homepage}`,
      )}\n`
    : `Maybe you should read the docs at: ${pkgJson.homepage}\n`;

  await y
    .scriptName('smoker')
    .options(GlobalOptions)
    .command(new LintCommand())
    .command(new ListPluginsCommand())
    .command(new ListReportersCommand())
    .command(new ListRulesCommand())
    .command(new RunScriptCommand())
    .middleware(mergeOpts)
    .epilog(epilog)
    .showHelpOnFail(false)
    .help()
    .strict()
    .parseAsync();
}

main(hideBin(process.argv)).catch((err) => {
  process.exitCode = 1;
  handleRejection(err);
});
