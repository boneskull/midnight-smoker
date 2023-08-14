import {blue, red, white, yellow} from 'chalk';
import ora from 'ora';
import pluralize from 'pluralize';
import {hideBin} from 'yargs/helpers';
import yargs from 'yargs/yargs';
import {SmokerConfig, readConfig} from './config';
import {Events, type SmokerEvents} from './events';
import {Smoker} from './smoker';
import {normalizeStringArray, readPackageJson} from './util';

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

  /**
   * These options can be specified more than once.
   *
   * Unfortunately, the typing gets hinky if we try to define the options object outside of the `options()` call, so we cannot programmatically gather these.
   */
  const arrayOptNames: Readonly<Set<string>> = new Set([
    'add',
    'workspace',
    'pm',
    'script',
    'scripts',
  ]);

  try {
    const config = await readConfig();

    if (config.script) {
      args.unshift(...config.script);
    }

    await y
      .scriptName('smoker')
      .command(
        '* <script> [scripts..]',
        'Run tests against a package as it would be published',
        (yargs) => {
          /**
           * Reusable config for array-type options
           */
          const arrayOptConfig = {
            requiresArg: true,
            array: true,
            type: 'string',
            coerce: normalizeStringArray,
          } as const;

          return yargs
            .positional('script', {
              describe: 'Script in package.json to run',
              type: 'string',
              coerce: normalizeStringArray,
              default: config.script,
            })
            .positional('scripts', {
              describe: 'Additional script(s) to run',
              type: 'string',
              // no default here since if the config file is used, everything is
              // thrown into `script`.
              coerce: normalizeStringArray,
            })
            .options({
              add: {
                describe: 'Additional dependency to provide to script(s)',
                group: BEHAVIOR_GROUP,
                default: config.add,
                ...arrayOptConfig,
              },
              all: {
                describe: 'Run script in all workspaces',
                group: BEHAVIOR_GROUP,
                default: config.all,
                type: 'boolean',
              },
              bail: {
                describe: 'When running scripts, halt on first error',
                group: BEHAVIOR_GROUP,
                default: config.bail,
                type: 'boolean',
              },
              'include-root': {
                describe: "Include the workspace root; must provide '--all'",
                group: BEHAVIOR_GROUP,
                default: config.includeRoot,
                implies: 'all',
                type: 'boolean',
              },
              json: {
                describe: 'Output JSON only',
                default: config.json,
                group: BEHAVIOR_GROUP,
                type: 'boolean',
              },
              linger: {
                describe: 'Do not clean up temp dir(s) after completion',
                group: BEHAVIOR_GROUP,
                default: config.linger,
                hidden: true,
                type: 'boolean',
              },
              workspace: {
                describe: 'Run script in a specific workspace or workspaces',
                group: BEHAVIOR_GROUP,
                default: config.workspace,
                ...arrayOptConfig,
              },
              pm: {
                describe:
                  'Run script(s) with a specific package manager; <npm|yarn|pnpm>[@version]',
                group: BEHAVIOR_GROUP,
                default: config.pm ?? 'npm@latest',
                ...arrayOptConfig,
              },
            });
        },
        async (argv) => {
          const scripts = [...argv.script!, ...argv.scripts!];

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
      .options({
        verbose: {
          describe: 'Verbose output',
          type: 'boolean',
          global: true,
        },
      })
      .epilog(`For more info, see ${homepage}\n`)
      .middleware(
        /**
         * If an array-type option is provided in both the config file and on the command-line,
         * we use this to merge the two arrays.
         *
         * If we had any object-type options (we don't) then we'd do that here as well.
         */
        (argv) => {
          for (const key of arrayOptNames) {
            const cfgKey = key as keyof SmokerConfig;
            const arg = key as keyof typeof argv;
            if (cfgKey in config && arg in argv) {
              const cfgValue = (
                Array.isArray(config[cfgKey])
                  ? config[cfgKey]
                  : [config[cfgKey]]
              ) as string[];
              const argvValue = (
                Array.isArray(argv[arg]) ? argv[arg] : [argv[arg]]
              ) as string[];
              argv[arg] = [...new Set([...cfgValue, ...argvValue])];
            }
          }

          // squelch some output if `json` is true
          argv.verbose = argv.json ? false : argv.verbose;
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
