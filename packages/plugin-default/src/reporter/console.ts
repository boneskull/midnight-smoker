import {
  blueBright,
  bold,
  dim,
  green,
  greenBright,
  italic,
  red,
  white,
  yellow,
} from 'chalk';
import {error, info, warning} from 'log-symbols';
import {Blessed, Event, Reporter, Rule} from 'midnight-smoker/plugin';
import ora from 'ora';
import pluralize from 'pluralize';
import stringify from 'stringify-object';

/**
 * Mapping of single-digit integers to English words
 */
const NUM_WORDS = new Map([
  [0, 'zero'],
  [1, 'one'],
  [2, 'two'],
  [3, 'three'],
  [4, 'four'],
  [5, 'five'],
  [6, 'six'],
  [7, 'seven'],
  [8, 'eight'],
  [9, 'nine'],
]);

/**
 * Converts a number to an English word, or returns the number as a string if it
 * doesn't exist in {@link NUM_WORDS}
 *
 * @param num - Number to convert
 * @returns English word for `num`, or `num` as a string
 */
function numberToString(num: number) {
  return NUM_WORDS.get(num) ?? String(num);
}

/**
 * Wrap {@link pluralize} with {@link numberToString} and the integer in parens
 *
 * @param str - String to pluralize
 * @param count - Count
 * @param withNumber - Whether to show the number
 * @returns A nice string
 */
function plural(str: string, count: number, withNumber = false) {
  return withNumber
    ? `${numberToString(count)} (${count}) ${pluralize(str, count)}`
    : pluralize(str, count);
}

/**
 * Given the name of a thing and optionally a version, return a fancy string
 *
 * @param name Name
 * @param version Version
 * @returns `name@version` with some colors
 */
function nameAndVersion(name: string, version?: string) {
  return version ? `${name}${dim('@')}${white(version)}` : name;
}

export const ConsoleReporter: Reporter.ReporterDef = {
  name: 'console',
  description: 'Default console reporter (for humans)',
  reporter: ({emitter, opts, pkgJson, console, stderr}) => {
    const spinner = ora({stream: stderr});
    const scriptFailedEvts: Event.RunScriptFailedEventData[] = [];
    const ruleFailedEvts: Event.RunRuleFailedEventData[] = [];
    const {SmokerEvent} = Event;

    emitter
      .once(SmokerEvent.SmokeBegin, ({plugins}) => {
        console.error(
          `💨 ${nameAndVersion(
            blueBright.bold('midnight-smoker'),
            pkgJson.version,
          )}\n`,
        );
        const extPlugins = plugins.filter(
          ({id}) => !Blessed.isBlessedPlugin(id),
        );
        if (extPlugins.length) {
          console.error(
            '🔌 Loaded %s: %s',
            plural('external plugin', extPlugins.length, true),
            extPlugins
              .map(({id, version}) => nameAndVersion(greenBright(id), version))
              .join(', '),
          );
        }
      })
      .once(SmokerEvent.PackBegin, () => {
        let what: string;
        if (opts.workspace.length) {
          what = plural('workspace', opts.workspace.length, true);
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
      .once(SmokerEvent.PackOk, ({uniquePkgs, pkgManagers}) => {
        let msg = `Packed ${plural('package', uniquePkgs.length, true)} using `;
        if (pkgManagers.length > 1) {
          msg += `${plural('package manager', pkgManagers.length, true)}`;
        } else {
          const pkgManager = pkgManagers[0];
          msg += `${nameAndVersion(green(pkgManager[0]), pkgManager[1])}`;
        }
        msg += '…';
        spinner.succeed(msg);
      })
      .once(SmokerEvent.PackFailed, (err) => {
        spinner.fail(err.format(opts.verbose));
      })
      .once(
        SmokerEvent.InstallBegin,
        ({uniquePkgs, pkgManagers, additionalDeps}) => {
          let msg = `Installing ${plural(
            'package',
            uniquePkgs.length,
            true,
          )} from tarball`;
          if (additionalDeps.length) {
            msg += ` with ${plural(
              'additional dependency',
              additionalDeps.length,
              true,
            )}`;
          }
          if (pkgManagers.length > 1) {
            msg += ` using ${plural(
              'package manager',
              pkgManagers.length,
              true,
            )}`;
          } else {
            const pkgManager = pkgManagers[0];
            msg += ` using ${nameAndVersion(
              green(pkgManager[0]),
              pkgManager[1],
            )}`;
          }
          msg += '…';
          spinner.start(msg);
        },
      )
      .once(SmokerEvent.InstallFailed, (err) => {
        spinner.fail(err.format(opts.verbose));
      })
      .once(SmokerEvent.InstallOk, ({uniquePkgs, pkgManagers}) => {
        let msg = `Installed ${plural(
          'package',
          uniquePkgs.length,
          true,
        )} from tarball`;
        if (pkgManagers.length > 1) {
          msg += ` using ${plural(
            'package manager',
            pkgManagers.length,
            true,
          )}`;
        } else {
          const pkgManager = pkgManagers[0];
          msg += ` using ${nameAndVersion(
            green(pkgManager[0]),
            pkgManager[1],
          )}`;
        }
        spinner.succeed(msg);
      })
      .once(SmokerEvent.RunRulesBegin, ({total}) => {
        spinner.start(`Running 0/${total} rules…`);
      })
      .on(SmokerEvent.RunRuleBegin, ({current, total}) => {
        spinner.text = `Running rule ${current}/${total}…`;
      })
      .on(SmokerEvent.RunRuleFailed, (evt) => {
        ruleFailedEvts.push(evt);
      })
      .once(SmokerEvent.RunRulesOk, ({total}) => {
        spinner.succeed(`Successfully executed ${plural('rule', total, true)}`);
      })
      .once(SmokerEvent.RunRulesFailed, ({total, failed}) => {
        spinner.fail(
          `${pluralize('rule', failed.length, true)} of ${total} failed`,
        );

        // TODO: move this into a format() function for these error kinds
        const failedByPackage = ruleFailedEvts
          .map((evt) => evt.failed)
          .flat()
          .reduce<Record<string, Rule.StaticRuleIssue[]>>((acc, failed) => {
            const pkgName =
              failed.context.pkgJson.name ?? failed.context.installPath;
            acc[pkgName] = [...(acc[pkgName] ?? []), failed];
            return acc;
          }, {});

        for (const [pkgName, failed] of Object.entries(failedByPackage)) {
          const lines = [`Issues found in package ${green(pkgName)}:`];
          const isError = failed.some(
            ({severity}) => severity === Rule.RuleSeverities.Error,
          );

          for (const {message, severity, rule} of failed) {
            if (severity === Rule.RuleSeverities.Error) {
              lines.push(
                `│ ${error} ${message} ${dim('[')}${red(rule.name)}${dim(']')}`,
              );
            } else {
              lines.push(
                `│ ${warning} ${message} ${dim('[')}${yellow(rule.name)}${dim(
                  ']',
                )}`,
              );
            }
          }
          const msg = lines.join('\n');
          if (isError) {
            spinner.fail(msg);
          } else {
            spinner.warn(msg);
          }
        }
      })
      .on(SmokerEvent.RuleError, (err) => {
        spinner.fail(err.message);
      })
      .once(SmokerEvent.RunScriptsBegin, ({total}) => {
        spinner.start(`Running script 0/${total}…`);
      })
      .on(SmokerEvent.RunScriptBegin, ({current, total}) => {
        spinner.text = `Running script ${current}/${total}…`;
      })
      .on(SmokerEvent.RunScriptFailed, (evt) => {
        scriptFailedEvts.push(evt);
      })
      .once(SmokerEvent.RunScriptsOk, ({total}) => {
        spinner.succeed(`Successfully ran ${plural('script', total, true)}`);
      })
      .once(SmokerEvent.RunScriptsFailed, ({total, failed: failures}) => {
        spinner.fail(
          `${failures} of ${total} ${plural('script', total)} failed`,
        );
        for (const evt of scriptFailedEvts) {
          // TODO: this is not verbose enough
          const details = evt.error.format(opts.verbose);
          spinner.warn(
            `Script execution failure details for package ${bold(
              greenBright(evt.pkgName),
            )}:\n- ${details}\n`,
          );
        }
      })
      .once(SmokerEvent.SmokeFailed, (err) => {
        spinner.fail(err.message);
      })
      .once(SmokerEvent.SmokeOk, () => {
        spinner.succeed('Lovey-dovey! 💖');
      })
      .once(SmokerEvent.Lingered, (dirs) => {
        console.error(
          `${info} Lingering ${plural('temp directory', dirs.length)}:\n`,
        );
        for (const dir of dirs) {
          console.error(yellow(dir));
        }
      })
      .once(SmokerEvent.UnknownError, (err) => {
        console.error(
          `${error} midnight-smoker encountered an unexpected fatal error:`,
        );
        if (opts.verbose) {
          console.error(stringify(err));
        } else {
          console.error(`- ${red(err.message)}`);
          console.error(
            `- ${dim(italic('(try using --verbose for more details)'))}`,
          );
        }
      });
  },
};
