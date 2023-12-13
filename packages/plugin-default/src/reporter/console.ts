import {blue, bold, cyan, dim, green, italic, red, white, yellow} from 'chalk';
import {error, info, warning} from 'log-symbols';
import {Blessed, Event, Reporter, Rule} from 'midnight-smoker/plugin';
import ora from 'ora';
import pluralize from 'pluralize';
import stringify from 'stringify-object';

export const ConsoleReporter: Reporter.ReporterDef = {
  name: 'console',
  description: 'Default console reporter (for humans)',
  reporter: ({emitter, opts, pkgJson, console, stderr}) => {
    const spinner = ora({stream: stderr});
    const scriptFailedEvts: Event.RunScriptFailedEventData[] = [];
    const checkFailedEvts: Event.RunRuleFailedEventData[] = [];
    const {SmokerEvent} = Event;

    emitter
      .once(SmokerEvent.SmokeBegin, ({plugins}) => {
        console.error(
          `💨 ${blue('midnight-smoker')} ${white(`v${pkgJson.version}`)}`,
        );
        const extPlugins = plugins.filter(
          ({id}) => !Blessed.isBlessedPlugin(id),
        );
        if (extPlugins.length) {
          console.error(
            '🔌 Loaded %s: %s',
            pluralize('plugin', extPlugins.length, true),
            extPlugins
              .map(({id, version}) =>
                version ? `${green(id)}${dim('@')}${white(version)}` : id,
              )
              .join(', '),
          );
        }
      })
      .once(SmokerEvent.PackBegin, () => {
        let what: string;
        if (opts.workspace.length) {
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
      .once(SmokerEvent.PackOk, ({uniquePkgs, packageManagers}) => {
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
      .once(SmokerEvent.PackFailed, (err) => {
        spinner.fail(err.format(opts.verbose));
      })
      .once(
        SmokerEvent.InstallBegin,
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
      .once(SmokerEvent.InstallFailed, (err) => {
        spinner.fail(err.format(opts.verbose));
      })
      .once(SmokerEvent.InstallOk, ({uniquePkgs}) => {
        spinner.succeed(
          `Installed ${pluralize(
            'unique package',
            uniquePkgs.length,
            true,
          )} from tarball`,
        );
      })
      .once(SmokerEvent.RunRulesBegin, ({total}) => {
        spinner.start(`Running 0/${total} checks…`);
      })
      .on(SmokerEvent.RunRuleBegin, ({current, total}) => {
        spinner.text = `Running check ${current}/${total}…`;
      })
      .on(SmokerEvent.RunRuleFailed, (evt) => {
        checkFailedEvts.push(evt);
      })
      .once(SmokerEvent.RunRulesOk, ({total}) => {
        spinner.succeed(`Successfully ran ${pluralize('check', total, true)}`);
      })
      .once(SmokerEvent.RunRulesFailed, ({total, failed}) => {
        spinner.fail(
          `${pluralize('check', failed.length, true)} of ${total} failed`,
        );

        // TODO: move this into a format() function for these error kinds
        const failedByPackage = checkFailedEvts
          .map((evt) => evt.failed)
          .flat()
          .reduce<Record<string, Rule.StaticRuleIssue[]>>((acc, failed) => {
            const pkgName =
              failed.context.pkgJson.name ?? failed.context.pkgPath;
            acc[pkgName] = [...(acc[pkgName] ?? []), failed];
            return acc;
          }, {});

        for (const [pkgName, failed] of Object.entries(failedByPackage)) {
          const lines = [`Issues found in package ${cyan(pkgName)}:`];
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
        spinner.succeed(`Successfully ran ${pluralize('script', total, true)}`);
      })
      .once(SmokerEvent.RunScriptsFailed, ({total, failed: failures}) => {
        spinner.fail(
          `${failures} of ${total} ${pluralize('script', total)} failed`,
        );
        for (const evt of scriptFailedEvts) {
          // TODO: this is not verbose enough
          const details = evt.error.format(opts.verbose);
          spinner.warn(
            `Script execution failure details for package ${bold(
              cyan(evt.pkgName),
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
          `${info} Lingering ${pluralize('temp directory', dirs.length)}:\n`,
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
