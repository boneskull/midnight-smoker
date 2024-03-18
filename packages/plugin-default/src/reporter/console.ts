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
import {isError} from 'lodash';
import {error, warning} from 'log-symbols';
import {
  type RunRuleFailedEventData,
  type ScriptFailedEventData,
} from 'midnight-smoker/event';
import {isBlessedPlugin} from 'midnight-smoker/plugin/blessed';
import {type ReporterDef} from 'midnight-smoker/reporter';
import {RuleSeverities, type StaticRuleIssue} from 'midnight-smoker/rule';
import ora, {type Ora} from 'ora';
import pluralize from 'pluralize';

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

type ConsoleReporterContext = {
  spinner: Ora;
  scriptFailedEvents: ScriptFailedEventData[];
  ruleFailedEvents: RunRuleFailedEventData[];
};

export const ConsoleReporter: ReporterDef<ConsoleReporterContext> = {
  name: 'console',
  description: 'Default console reporter (for humans)',
  setup(ctx) {
    ctx.spinner = ora({stream: ctx.stderr});
    ctx.scriptFailedEvents = [];
    ctx.ruleFailedEvents = [];
  },
  onSmokeBegin(ctx, {plugins}) {
    console.error(
      `💨 ${nameAndVersion(
        blueBright.bold('midnight-smoker'),
        ctx.pkgJson.version,
      )}\n`,
    );
    const extPlugins = plugins.filter(({id}) => !isBlessedPlugin(id));
    if (extPlugins.length) {
      console.error(
        '🔌 Loaded %s: %s',
        plural('external plugin', extPlugins.length, true),
        extPlugins
          .map(({id, version}) => nameAndVersion(greenBright(id), version))
          .join(', '),
      );
    }
  },
  onPackBegin({opts, spinner}) {
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
  },
  onPackOk({spinner}, {uniquePkgs, pkgManagers}) {
    let msg = `Packed ${plural('package', uniquePkgs.length, true)} using `;
    if (pkgManagers.length > 1) {
      msg += `${plural('package manager', pkgManagers.length, true)}`;
    } else {
      const pkgManager = pkgManagers[0];
      msg += `${nameAndVersion(
        green(pkgManager.pkgManager),
        pkgManager.version,
      )}`;
    }
    msg += '…';
    spinner.succeed(msg);
  },
  onPackFailed({spinner, opts}, {error: err}) {
    spinner.fail(err.format(opts.verbose));
  },
  onInstallBegin({spinner}, {uniquePkgs, pkgManagers, additionalDeps}) {
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
      msg += ` using ${plural('package manager', pkgManagers.length, true)}`;
    } else {
      const pkgManager = pkgManagers[0];
      msg += ` using ${nameAndVersion(
        green(pkgManager.pkgManager),
        pkgManager.version,
      )}`;
    }
    msg += '…';
    spinner.start(msg);
  },
  onInstallFailed({spinner, opts}, {error: err}) {
    spinner.fail(err.format(opts.verbose));
  },
  onInstallOk({spinner}, {uniquePkgs, pkgManagers}) {
    let msg = `Installed ${plural(
      'package',
      uniquePkgs.length,
      true,
    )} from tarball`;
    if (pkgManagers.length > 1) {
      msg += ` using ${plural('package manager', pkgManagers.length, true)}`;
    } else {
      const pkgManager = pkgManagers[0];
      msg += ` using ${nameAndVersion(
        green(pkgManager.pkgManager),
        pkgManager.version,
      )}`;
    }
    spinner.succeed(msg);
  },
  onRunRulesBegin({spinner}, {total}) {
    spinner.start(`Running 0/${total} rules…`);
  },
  onRunRuleBegin({spinner}, {current, total}) {
    spinner.text = `Running rule ${current}/${total}…`;
  },
  onRunRuleFailed(ctx, evt) {
    ctx.ruleFailedEvents.push(evt);
  },
  onRunRulesOk({spinner}, {total}) {
    spinner.succeed(`Successfully executed ${plural('rule', total, true)}`);
  },
  onRunRulesFailed(
    {spinner, ruleFailedEvents: ruleFailedEvts},
    {total, failed},
  ) {
    spinner.fail(
      `${pluralize('rule', failed.length, true)} of ${total} failed`,
    );

    // TODO move this into a format() function for these error kinds
    const failedByPackage = ruleFailedEvts
      .map((evt) => evt.failed)
      .flat()
      .reduce<Record<string, StaticRuleIssue[]>>((acc, failed) => {
        const pkgName =
          failed.context.pkgJson.name ?? failed.context.installPath;
        acc[pkgName] = [...(acc[pkgName] ?? []), failed];
        return acc;
      }, {});

    for (const [pkgName, failed] of Object.entries(failedByPackage)) {
      const lines = [`Issues found in package ${green(pkgName)}:`];
      const isError = failed.some(
        ({severity}) => severity === RuleSeverities.Error,
      );

      for (const {message, severity, rule} of failed) {
        if (severity === RuleSeverities.Error) {
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
  },
  onRuleError({spinner}, {error: err}) {
    spinner.fail(err.message);
  },
  onRunScriptsBegin({spinner}, {total}) {
    spinner.start(`Running 0/${total} scripts…`);
  },
  onRunScriptBegin({spinner}, {current, total}) {
    spinner.text = `Running script ${current}/${total}…`;
  },
  onRunScriptFailed(ctx, evt) {
    ctx.scriptFailedEvents.push(evt);
  },
  onRunScriptsOk({spinner}, {total}) {
    spinner.succeed(`Successfully ran ${plural('script', total, true)}`);
  },
  onRunScriptsFailed(
    {spinner, opts, scriptFailedEvents: scriptFailedEvts},
    {total, failed: failures},
  ) {
    spinner.fail(`${failures} of ${total} ${plural('script', total)} failed`);
    for (const evt of scriptFailedEvts) {
      // TODO: this is not verbose enough
      const details = evt.error.format(opts.verbose);
      spinner.warn(
        `Script execution failure details for package ${bold(
          greenBright(evt.pkgName),
        )}:\n- ${details}\n`,
      );
    }
  },
  onSmokeFailed({spinner}, {error: err}) {
    spinner.fail(err.message);
  },
  onSmokeOk({spinner}) {
    spinner.succeed('Lovey-dovey! 💖');
  },
  onLingered(_, {directories: dirs}) {
    console.error(
      `${warning} Lingering ${plural('temp directory', dirs.length)}:\n`,
    );
    for (const dir of dirs) {
      console.error(yellow(dir));
    }
  },
  onUnknownError({opts}, {error: err}) {
    console.error(
      `${error} midnight-smoker encountered an unexpected fatal error:`,
    );
    if (opts.verbose) {
      console.error(err);
    } else {
      if (isError(err)) {
        console.error(`${red(err.message)}\n`);
      } else {
        console.error(`${red(err)}`);
      }
      console.error(`${dim(italic('(try using --verbose for more details)'))}`);
    }
  },
};
