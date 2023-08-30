import {blue, cyan, red, white, yellow} from 'chalk';
import createDebug from 'debug';
import deepMerge from 'deepmerge';
import {error, info, warning} from 'log-symbols';
import ora from 'ora';
import pluralize from 'pluralize';
import {hideBin} from 'yargs/helpers';
import yargs from 'yargs/yargs';
import {readConfigFile} from './config-file';
import {NotImplementedError} from './error';
import {Event, type SmokerEvent} from './event';
import {DEFAULT_PACKAGE_MANAGER_ID} from './options';
import type {CheckFailure} from './rules/result';
import {Smoker} from './smoker';
import type {SmokerJsonOutput, SmokerStats} from './types';
import {readPackageJson} from './util';

const debug = createDebug('midnight-smoker:cli');

const BEHAVIOR_GROUP = 'Behavior:';

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

  let verbose = false;
  try {
    const config = await readConfigFile();

    await y
      .scriptName('smoker')
      .command(
        '* [scripts..]',
        'Run tests against a package as it would be published',
        (yargs) => {
          /**
           * Reusable config for array-type options
           */
          const arrayOptConfig = {
            requiresArg: true,
            array: true,
            type: 'string',
          } as const;

          return yargs
            .positional('scripts', {
              describe: 'Script(s) in package.json to run',
              type: 'string',
            })
            .options({
              add: {
                describe: 'Additional dependency to provide to script(s)',
                group: BEHAVIOR_GROUP,
                ...arrayOptConfig,
              },
              all: {
                describe: 'Run script in all workspaces',
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
                describe: 'Do not clean up temp dir(s) after completion',
                group: BEHAVIOR_GROUP,
                hidden: true,
                type: 'boolean',
              },
              pm: {
                describe:
                  'Run script(s) with a specific package manager; <npm|yarn|pnpm>[@version]',
                group: BEHAVIOR_GROUP,
                default: [DEFAULT_PACKAGE_MANAGER_ID],
                ...arrayOptConfig,
              },
              loose: {
                describe: 'Ignore missing scripts (used with --all)',
                type: 'boolean',
                group: BEHAVIOR_GROUP,
                implies: 'all',
              },
              workspace: {
                describe: 'Run script in a specific workspace or workspaces',
                group: BEHAVIOR_GROUP,
                ...arrayOptConfig,
              },
              checks: {
                describe: 'Run built-in checks',
                group: BEHAVIOR_GROUP,
                type: 'boolean',
              },
            });
        },
        async (argv) => {
          const opts = deepMerge(config, argv);
          if (opts.pm?.some((pm) => pm.startsWith('pnpm'))) {
            throw new NotImplementedError('pnpm is currently unsupported');
          }
          verbose = Boolean(
            opts.verbose || createDebug.enabled('midnight-smoker'),
          );
          if (verbose) {
            createDebug.enable('midnight-smoker');
          }
          debug('Final options: %O', opts);

          const smoker = await Smoker.init(opts);

          if (opts.json) {
            // if we don't have any scripts, the script-related ones will remain null
            let totalPackages = null;
            let totalScripts = null;
            let totalPackageManagers = null;
            let failedScripts = null;
            let passedScripts = null;
            let totalChecks = null;
            let failedChecks = null;
            let passedChecks = null;

            smoker
              .once(Event.INSTALL_BEGIN, ({uniquePkgs, packageManagers}) => {
                totalPackages = uniquePkgs.length;
                totalPackageManagers = packageManagers.length;
              })
              .once(Event.INSTALL_FAILED, () => {
                process.exitCode = 1;
              })
              .once(Event.RUN_SCRIPTS_BEGIN, ({total}) => {
                totalScripts = total;
              })
              .once(Event.RUN_SCRIPTS_FAILED, ({failed, passed}) => {
                failedScripts = failed;
                passedScripts = passed;
                smoker.removeAllListeners(Event.RUN_SCRIPTS_OK);
                process.exitCode = 1;
              })
              .once(Event.RUN_SCRIPTS_OK, ({passed}) => {
                passedScripts = passed;
                failedScripts = 0;
                smoker.removeAllListeners(Event.RUN_SCRIPTS_FAILED);
              })
              .once(Event.RUN_CHECKS_BEGIN, ({total}) => {
                totalChecks = total;
              })
              .once(Event.RUN_CHECKS_FAILED, ({failed, passed}) => {
                failedChecks = failed.length;
                passedChecks = passed.length;
                smoker.removeAllListeners(Event.RUN_CHECKS_OK);
              })
              .on(Event.RUN_CHECK_FAILED, ({config}) => {
                if (config.severity === 'error') {
                  process.exitCode = 1;
                }
              })
              .once(Event.RUN_CHECKS_OK, ({passed}) => {
                passedChecks = passed.length;
                failedChecks = 0;
                smoker.removeAllListeners(Event.RUN_CHECKS_FAILED);
              })
              .once(Event.SMOKE_OK, () => {
                smoker.removeAllListeners();
              })
              .once(Event.SMOKE_FAILED, () => {
                smoker.removeAllListeners();
              });

            let output: SmokerJsonOutput;
            try {
              const results = await smoker.smoke();

              const stats: SmokerStats = {
                totalPackages,
                totalPackageManagers,
                totalScripts,
                failedScripts,
                passedScripts,
                totalChecks,
                failedChecks,
                passedChecks,
              };

              output = {results, stats};
            } catch (err) {
              const stats: SmokerStats = {
                totalPackages,
                totalPackageManagers,
                totalScripts,
                failedScripts,
                passedScripts,
                totalChecks,
                failedChecks,
                passedChecks,
              };

              output = {error: (err as Error).message, stats};
            } finally {
              smoker.removeAllListeners();
            }

            console.log(JSON.stringify(output, null, 2));
          } else {
            const spinner = ora();
            const scriptFailedEvts: SmokerEvent['RunScriptFailed'][] = [];
            const checkFailedEvts: SmokerEvent['RunCheckFailed'][] = [];

            smoker
              .once(Event.SMOKE_BEGIN, () => {
                console.error(
                  `💨 ${blue('midnight-smoker')} ${white(`v${version}`)}`,
                );
              })
              .once(Event.PACK_BEGIN, () => {
                let what: string;
                if (opts.workspace?.length) {
                  what = pluralize('workspace', opts.workspace.length, true);
                } else if (opts.all) {
                  what = 'all workspaces';
                  if (opts.includeRoot) {
                    what += ' (and the workspace root)';
                  }
                } else {
                  what = 'current project';
                }
                spinner.start(`Packing ${what}…`);
              })
              .once(Event.PACK_OK, ({uniquePkgs, packageManagers}) => {
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
              .once(Event.PACK_FAILED, (err) => {
                spinner.fail(err.message);
                process.exitCode = 1;
              })
              .once(
                Event.INSTALL_BEGIN,
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
              .once(Event.INSTALL_FAILED, (err) => {
                spinner.fail(err.message);
                process.exitCode = 1;
              })
              .once(Event.INSTALL_OK, ({uniquePkgs}) => {
                spinner.succeed(
                  `Installed ${pluralize(
                    'unique package',
                    uniquePkgs.length,
                    true,
                  )} from tarball`,
                );
              })
              .once(Event.RUN_CHECKS_BEGIN, ({total}) => {
                spinner.start(`Running 0/${total} checks…`);
              })
              .on(Event.RUN_CHECK_BEGIN, ({current, total}) => {
                spinner.text = `Running check ${current}/${total}…`;
              })
              .on(Event.RUN_CHECK_FAILED, (evt) => {
                checkFailedEvts.push(evt);
                if (evt.config.severity === 'error') {
                  process.exitCode = 1;
                }
              })
              .once(Event.RUN_CHECKS_OK, ({total}) => {
                spinner.succeed(
                  `Successfully ran ${pluralize('check', total, true)}`,
                );
              })
              .once(Event.RUN_CHECKS_FAILED, ({total, failed}) => {
                spinner.fail(
                  `${pluralize(
                    'check',
                    failed.length,
                    true,
                  )} of ${total} failed`,
                );

                // TODO: move this crunching somewhere else
                const failedByPackage = checkFailedEvts
                  .map((evt) => evt.failed)
                  .flat()
                  .reduce(
                    (acc, failed) => {
                      const pkgName =
                        failed.context.pkgJson.name ?? failed.context.pkgPath;
                      acc[pkgName] = [...(acc[pkgName] ?? []), failed];
                      return acc;
                    },
                    {} as Record<string, CheckFailure[]>,
                  );

                for (const [pkgName, failed] of Object.entries(
                  failedByPackage,
                )) {
                  let text = `Check failures in package ${cyan(pkgName)}:\n`;
                  for (const {message, severity} of failed) {
                    if (severity === 'error') {
                      text += `» ${error} ${red(message)}\n`;
                    } else {
                      text += `» ${warning} ${yellow(message)}\n`;
                    }
                  }
                  spinner.info(text);
                }
              })
              .on(Event.RULE_ERROR, (err) => {
                spinner.fail(err.message);
                process.exitCode = 1;
              })
              .once(Event.RUN_SCRIPTS_BEGIN, ({total}) => {
                spinner.start(`Running script 0/${total}…`);
              })
              .on(Event.RUN_SCRIPT_BEGIN, ({current, total}) => {
                spinner.text = `Running script ${current}/${total}…`;
              })
              .on(Event.RUN_SCRIPT_FAILED, (evt) => {
                scriptFailedEvts.push(evt);
                process.exitCode = 1;
              })
              .once(Event.RUN_SCRIPTS_OK, ({total}) => {
                spinner.succeed(
                  `Successfully ran ${pluralize('script', total, true)}`,
                );
              })
              .once(Event.RUN_SCRIPTS_FAILED, ({total, failed: failures}) => {
                spinner.fail(
                  `${failures} of ${total} ${pluralize(
                    'script',
                    total,
                  )} failed`,
                );
                for (const evt of scriptFailedEvts) {
                  spinner.info(
                    `${red('Script failure')} details for package "${cyan(
                      evt.pkgName,
                    )}":\n» ${yellow(evt.error)}\n`,
                  );
                }
                process.exitCode = 1;
              })
              .once(Event.SMOKE_FAILED, (err) => {
                spinner.fail(err?.message ?? err);
              })
              .once(Event.SMOKE_OK, () => {
                spinner.succeed('Lovey-dovey! 💖');
              })
              .once(Event.LINGERED, (dirs) => {
                console.error(
                  `${info} Lingering ${pluralize(
                    'temp directory',
                    dirs.length,
                  )}:\n`,
                );
                for (const dir of dirs) {
                  console.error(`» ${yellow(dir)}`);
                }
              });
            await smoker.smoke();
          }
        },
      )
      .options({
        verbose: {
          describe: 'Verbose output',
          type: 'boolean',
          global: true,
        },
      })
      .epilog(`For more info, see ${homepage}\n`)
      .showHelpOnFail(false)
      .help()
      .strict()
      .parseAsync();
  } catch (err) {
    if (verbose) {
      throw err;
    }
    console.error(error, red(err));
    process.exitCode = 1;
  }
}

main(hideBin(process.argv));
