import {blue, red, white, yellow} from 'chalk';
import ora from 'ora';
import pluralize from 'pluralize';
import {hideBin} from 'yargs/helpers';
import yargs from 'yargs/yargs';
import {events} from './index';
import {Smoker} from './smoker';
import type {Events} from './types';
import {readPackageJson} from './util';

const BEHAVIOR_GROUP = 'Behavior:';

/**
 * Output of the CLI script when `json` flag is `true`
 */
type SmokerJsonOutput = Events['RunScriptsFailed'] | Events['RunScriptsOk'];

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
                type: 'string',
                array: true,
                group: BEHAVIOR_GROUP,
                requiresArg: true,
                describe: 'Additional dependency to provide to smoke tests',
              },
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
              bail: {
                type: 'boolean',
                describe: 'When running scripts, halt on first error',
                group: BEHAVIOR_GROUP,
              },
              linger: {
                type: 'boolean',
                describe: 'Do not clean up working dir after completion',
                hidden: true,
                group: BEHAVIOR_GROUP,
              },
              json: {
                type: 'boolean',
                describe: 'Output JSON only',
                group: BEHAVIOR_GROUP,
              },
            })
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

          const smoker = Smoker.withNpm(scripts, argv);

          if (argv.json) {
            let output: SmokerJsonOutput;
            const setResult = (result: SmokerJsonOutput) => {
              smoker
                .removeAllListeners(events.RUN_SCRIPTS_OK)
                .removeAllListeners(events.RUN_SCRIPTS_FAILED);
              output = result;
            };
          const writeResult = () => {
              smoker
                .removeAllListeners(events.SMOKE_OK)
                .removeAllListeners(events.SMOKE_FAILED);
              console.log(JSON.stringify(output, null, 2));
            };
            smoker
              .once(events.RUN_SCRIPTS_OK, setResult)
              .once(events.RUN_SCRIPTS_FAILED, setResult)
            .once(events.SMOKE_FAILED, writeResult)
            .once(events.SMOKE_OK, writeResult);
            await smoker.smoke();
          } else {
            const spinner = ora();
            const scriptFailedEvts: Events['RunScriptFailed'][] = [];
            smoker
              .on(events.SMOKE_BEGIN, () => {
                console.error(
                  `💨 ${blue('midnight-smoker')} ${white(`v${version}`)}`,
                );
              })
              .on(events.PACK_BEGIN, () => {
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
              .on(events.PACK_OK, (manifest) => {
                spinner.succeed(
                  `Packed ${pluralize(
                    'package',
                    manifest.packedPkgs.length,
                    true,
                  )}`,
                );
              })
              .on(events.PACK_FAILED, (err) => {
                spinner.fail(err.message);
                process.exitCode = 1;
              })
              .on(events.INSTALL_BEGIN, (manifest) => {
                const msg = manifest.additionalDeps?.length
                  ? `Installing from ${pluralize(
                      'tarball',
                      manifest.packedPkgs.length,
                      true,
                    )} with ${pluralize(
                      'additional dependency',
                      manifest.additionalDeps.length,
                      true,
                    )}...`
                  : `Installing from ${pluralize(
                      'tarball',
                      manifest.packedPkgs.length,
                      true,
                    )}...`;
                spinner.start(msg);
              })
              .on(events.INSTALL_FAILED, (err) => {
                spinner.fail(err.message);
                process.exitCode = 1;
              })
              .on(events.INSTALL_OK, (manifest) => {
                spinner.succeed(
                  `Installed ${pluralize(
                    'package',
                    manifest.packedPkgs.length,
                    true,
                  )} from tarball`,
                );
              })
              .on(events.RUN_SCRIPTS_BEGIN, ({total}) => {
                spinner.start(`Running script 0/${total}...`);
              })
              .on(events.RUN_SCRIPT_BEGIN, ({current, total}) => {
                spinner.text = `Running script ${current}/${total}...`;
              })
              .on(events.RUN_SCRIPT_FAILED, (evt) => {
                scriptFailedEvts.push(evt);
                process.exitCode = 1;
              })
              .on(events.RUN_SCRIPTS_OK, ({total}) => {
                spinner.succeed(
                  `Successfully ran ${pluralize('script', total, true)}`,
                );
              })
              .on(events.RUN_SCRIPTS_FAILED, ({total, failures}) => {
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
              .on(events.SMOKE_FAILED, (err) => {
                spinner.fail(err?.message ?? err);
                process.exitCode = 1;
              })
              .on(events.SMOKE_OK, () => {
                spinner.succeed('Lovey-dovey! 💖');
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
