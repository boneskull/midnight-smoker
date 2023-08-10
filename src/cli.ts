import {blue, red, white, yellow} from 'chalk';
import ora from 'ora';
import pluralize from 'pluralize';
import {hideBin} from 'yargs/helpers';
import yargs from 'yargs/yargs';
import {readConfig} from './config';
import {Events, type SmokerEvents} from './events';
import {Smoker} from './smoker';
import {readPackageJson} from './util';

const BEHAVIOR_GROUP = 'Behavior:';

/**
 * Output of the CLI script when `json` flag is `true`
 */
type SmokerJsonOutput =
  | SmokerEvents['RunScriptsFailed']
  | SmokerEvents['RunScriptsOk'];

/**
 * Main entry point for the CLI script
 * @param args Raw command-line arguments array
 */
async function main(args: string[]): Promise<void> {
  const y = yargs(args);

  const result = await readPackageJson({cwd: __dirname});
  if (!result) {
    throw new Error(
      'midnight-smoker could not find its own package.json! bogus',
    );
  }
  const {packageJson} = result;
  const {version, homepage} = packageJson;

  const config = await readConfig();

  try {
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
              add: {
                array: true,
                describe: 'Additional dependency to provide to smoke tests',
                group: BEHAVIOR_GROUP,
                requiresArg: true,
                type: 'string',
              },
              all: {
                describe: 'Test all workspaces',
                group: BEHAVIOR_GROUP,
                type: 'boolean',
              },
              bail: {
                describe: 'When running scripts, halt on first error',
                group: BEHAVIOR_GROUP,
                type: 'boolean',
              },
              'include-root': {
                describe: "Include the workspace root; must provide '--all'",
                group: BEHAVIOR_GROUP,
                implies: 'all',
                type: 'boolean',
              },
              json: {
                describe: 'Output JSON only',
                group: BEHAVIOR_GROUP,
                type: 'boolean',
              },
              linger: {
                describe: 'Do not clean up working dir after completion',
                group: BEHAVIOR_GROUP,
                hidden: true,
                type: 'boolean',
              },
              verbose: {
                describe: 'Print output from npm',
                group: BEHAVIOR_GROUP,
                type: 'boolean',
              },
              workspace: {
                array: true,
                describe: 'One or more npm workspaces to test',
                group: BEHAVIOR_GROUP,
                requiresArg: true,
                type: 'string',
              },
              pm: {
                describe:
                  'Run script(s) with a specific package manager; <npm|yarn|pnpm>[@version]',
                array: true,
                requiresArg: true,
                type: 'string',
                group: BEHAVIOR_GROUP,
                default: ['npm@latest'],
              },
            })
            .config(config)
            .epilog(`For more info, see ${homepage}`)
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
          const scripts = [argv.script as string, ...(argv.scripts ?? [])];

          // squelch some output if `json` is true
          argv.verbose = argv.json ? false : argv.verbose;

          let smoker: Smoker;
          try {
            smoker = await Smoker.init(scripts, argv);
          } catch (err) {
            console.error(red((err as Error).message));
            process.exitCode = 1;
            return;
          }

          if (argv.json) {
            let output: SmokerJsonOutput;
            const setResult = (result: SmokerJsonOutput) => {
              smoker
                .removeAllListeners(Events.RUN_SCRIPTS_OK)
                .removeAllListeners(Events.RUN_SCRIPTS_FAILED);
              output = result;
            };
            const cleanup = () => {
              smoker
                .removeAllListeners(Events.SMOKE_OK)
                .removeAllListeners(Events.SMOKE_FAILED);
            };
            const writeOk = () => {
              cleanup();
              console.log(JSON.stringify(output, null, 2));
            };
            const writeFailed = () => {
              cleanup();
              console.log(JSON.stringify(output, null, 2));
              process.exitCode = 1;
            };
            smoker
              .once(Events.RUN_SCRIPTS_OK, setResult)
              .once(Events.RUN_SCRIPTS_FAILED, setResult)
              .once(Events.SMOKE_FAILED, writeFailed)
              .once(Events.SMOKE_OK, writeOk);
            await smoker.smoke();
          } else {
            const spinner = ora();
            const scriptFailedEvts: SmokerEvents['RunScriptFailed'][] = [];
            smoker
              .on(Events.SMOKE_BEGIN, () => {
                console.error(
                  `💨 ${blue('midnight-smoker')} ${white(`v${version}`)}`,
                );
              })
              .on(Events.PACK_BEGIN, () => {
                let what: string;
                if (argv.workspace?.length) {
                  what = pluralize('workspace', argv.workspace.length, true);
                } else if (argv.all) {
                  what = 'all workspaces';
                  if (argv.includeRoot) {
                    what += ' (and the workspace root)';
                  }
                } else {
                  what = 'current project';
                }
                spinner.start(`Packing ${what}...`);
              })
              .on(Events.PACK_OK, ({uniquePkgs, packageManagers}) => {
                let msg = `Packed ${pluralize(
                  'unique package',
                  uniquePkgs.length,
                  true,
                )} using `;
                if (packageManagers.length > 1) {
                  msg += `${pluralize(
                    'package manager',
                    packageManagers.length,
                    true,
                  )}`;
                } else {
                  msg += `${packageManagers[0]}`;
                }
                msg += '…';
                spinner.succeed(msg);
              })
              .on(Events.PACK_FAILED, (err) => {
                spinner.fail(err.message);
                process.exitCode = 1;
              })
              .on(
                Events.INSTALL_BEGIN,
                ({uniquePkgs, packageManagers, additionalDeps}) => {
                  let msg = `Installing ${pluralize(
                    'unique package',
                    uniquePkgs.length,
                    true,
                  )} from tarball`;
                  if (additionalDeps.length) {
                    msg += ` with ${pluralize(
                      'additional dependency',
                      additionalDeps.length,
                      true,
                    )}`;
                  }
                  if (packageManagers.length > 1) {
                    msg += ` using ${pluralize(
                      'package manager',
                      packageManagers.length,
                      true,
                    )}`;
                  } else {
                    msg += ` using ${packageManagers[0]}`;
                  }
                  msg += '…';
                  spinner.start(msg);
                },
              )
              .on(Events.INSTALL_FAILED, (err) => {
                spinner.fail(err.message);
                process.exitCode = 1;
              })
              .on(Events.INSTALL_OK, ({uniquePkgs}) => {
                spinner.succeed(
                  `Installed ${pluralize(
                    'unique package',
                    uniquePkgs.length,
                    true,
                  )} from tarball`,
                );
              })
              .on(Events.RUN_SCRIPTS_BEGIN, ({total}) => {
                spinner.start(`Running script 0/${total}...`);
              })
              .on(Events.RUN_SCRIPT_BEGIN, ({current, total}) => {
                spinner.text = `Running script ${current}/${total}...`;
              })
              .on(Events.RUN_SCRIPT_FAILED, (evt) => {
                scriptFailedEvts.push(evt);
                process.exitCode = 1;
              })
              .on(Events.RUN_SCRIPTS_OK, ({total}) => {
                spinner.succeed(
                  `Successfully ran ${pluralize('script', total, true)}`,
                );
              })
              .on(Events.RUN_SCRIPTS_FAILED, ({total, failures}) => {
                spinner.fail(
                  `${failures} of ${total} ${pluralize(
                    'script',
                    total,
                  )} failed`,
                );
                for (const evt of scriptFailedEvts) {
                  console.error(
                    `\n${red('Error details')} for failed package ${yellow(
                      evt.pkgName,
                    )}:\n`,
                  );
                  console.error(evt.error.message);
                }
                process.exitCode = 1;
              })
              .on(Events.SMOKE_FAILED, (err) => {
                spinner.fail(err?.message ?? err);
                process.exitCode = 1;
              })
              .on(Events.SMOKE_OK, () => {
                spinner.succeed('Lovey-dovey! 💖');
              })
              .on(Events.LINGERED, (dirs) => {
                console.error(
                  `Lingering ${pluralize('temp directory', dirs.length)}:\n`,
                );
                for (const dir of dirs) {
                  console.error(`  ${yellow(dir)}`);
                }
              });
            await smoker.smoke();
          }
        },
      )
      .showHelpOnFail(false)
      .help()
      .strict()
      .parseAsync();
  } catch (err) {
    console.error(red(err));
    process.exitCode = 1;
  }
}

main(hideBin(process.argv));
