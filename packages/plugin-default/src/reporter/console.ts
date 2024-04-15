import {
  blueBright,
  dim,
  green,
  greenBright,
  italic,
  red,
  white,
  yellow,
} from 'chalk';
import Spinnies from 'dreidels';
import {isError} from 'lodash';
import {error, warning} from 'log-symbols';
import {
  type RuleFailedEventData,
  type RunScriptFailedEventData,
} from 'midnight-smoker/event';
import {isBlessedPlugin} from 'midnight-smoker/plugin/blessed';
import {type ReporterDef} from 'midnight-smoker/reporter';
import {RuleSeverities, type StaticRuleIssue} from 'midnight-smoker/rule';
import pluralize from 'pluralize';
import {type WriteStream} from 'tty';

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

const ELLIPSIS = '…';

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
  spinnies: Spinnies;
  scriptFailedEvents: RunScriptFailedEventData[];
  ruleFailedEvents: RuleFailedEventData[];
};

function currentOfTotal(current: number, total: number) {
  return `${current}/${total}`;
}

export const ConsoleReporter: ReporterDef<ConsoleReporterContext> = {
  name: 'console',
  description: 'Default console reporter (for humans)',
  setup(ctx) {
    ctx.spinnies = new Spinnies({
      stream: ctx.stderr as WriteStream,
      spinnerColor: 'blueBright',
      succeedColor: 'white',
      infoColor: 'white',
    });
    ctx.scriptFailedEvents = [];
    ctx.ruleFailedEvents = [];
  },
  teardown(ctx) {
    ctx.spinnies.stopAll();
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
  onPackBegin({opts, spinnies}) {
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
    const text = `Packing ${what}${ELLIPSIS}`;

    spinnies.add('pack', {text});
  },
  onPkgManagerPackBegin(
    {spinnies},
    {pkgManager, currentPkgManager, totalPkgManagers},
  ) {
    const text = `${nameAndVersion(
      green(pkgManager.pkgManager),
      pkgManager.version,
    )} (${currentOfTotal(
      currentPkgManager,
      totalPkgManagers,
    )}) packing${ELLIPSIS}`;

    spinnies.add(`packing-${pkgManager.spec}`, {
      indent: 2,
      text,
    });
  },
  onPkgManagerPackOk(
    {spinnies},
    {
      pkgManager,
      manifests,
      currentPkgManager: currentPkgManager,
      totalPkgManagers: totalPkgManagers,
    },
  ) {
    const text = `${nameAndVersion(
      green(pkgManager.pkgManager),
      pkgManager.version,
    )} (${currentOfTotal(currentPkgManager, totalPkgManagers)}) packed ${plural(
      'packages',
      manifests.length,
      true,
    )}`;

    spinnies.get(`packing-${pkgManager.spec}`).update({
      text,
      status: 'success',
    });
  },
  onPkgManagerPackFailed({spinnies}, {pkgManager}) {
    spinnies.get(`packing-${pkgManager.spec}`).update({status: 'fail'});
  },
  onPackOk({spinnies}, {uniquePkgs, pkgManagers}) {
    const text = `Packing complete; ${plural(
      'package manager',
      pkgManagers.length,
      true,
    )} packed ${plural('package', uniquePkgs.length, true)}`;

    spinnies.get('pack').update({text, status: 'success'});
  },
  onPackFailed({spinnies, opts}, {error: err}) {
    const text = err.format(opts.verbose);

    spinnies.get('pack').update({text, status: 'fail'});
  },
  onInstallBegin({spinnies}, {uniquePkgs, pkgManagers, additionalDeps}) {
    let text = `Installing ${plural(
      'package',
      uniquePkgs.length,
      true,
    )} from tarball`;
    if (additionalDeps.length) {
      text += ` with ${plural(
        'additional dependency',
        additionalDeps.length,
        true,
      )}`;
    }
    text += ` using ${plural(
      'package manager',
      pkgManagers.length,
      true,
    )}${ELLIPSIS}`;
    spinnies.add('installing', {text});
  },
  onPkgManagerInstallBegin(
    {spinnies},
    {pkgManager, currentPkgManager: current, totalPkgManagers: total},
  ) {
    const text = `${nameAndVersion(
      green(pkgManager.pkgManager),
      pkgManager.version,
    )} (${currentOfTotal(current, total)}) installing${ELLIPSIS}`;

    spinnies.add(`installing-${pkgManager.spec}`, {
      indent: 2,
      text,
    });
  },
  onPkgManagerInstallFailed({spinnies}, {pkgManager}) {
    spinnies.get(`installing-${pkgManager.spec}`).update({status: 'fail'});
  },
  onPkgManagerInstallOk(
    {spinnies},
    {
      pkgManager,
      currentPkgManager: current,
      totalPkgManagers: total,
      manifests,
    },
  ) {
    const text = `${nameAndVersion(
      green(pkgManager.pkgManager),
      pkgManager.version,
    )} (${currentOfTotal(current, total)}) installed ${plural(
      'packages',
      manifests.length,
      true,
    )}`;

    spinnies.get(`installing-${pkgManager.spec}`).update({
      text,
      status: 'success',
    });
  },
  onInstallFailed({spinnies, opts}, {error: err}) {
    spinnies
      .get('installing')
      .update({text: err.format(opts.verbose), status: 'fail'});
  },
  onInstallOk({spinnies}, {uniquePkgs, pkgManagers}) {
    const text = `Installing complete; ${plural(
      'package manager',
      pkgManagers.length,
      true,
    )} installed ${plural('unique package', uniquePkgs.length, true)}`;

    spinnies.get('installing').update({text, status: 'success'});
  },
  onRuleBegin({spinnies}, {currentRule: current, totalRules: total}) {
    spinnies.get('lint').update({text: `Running rule ${current}/${total}…`});
  },
  onRuleFailed(ctx, evt) {
    ctx.ruleFailedEvents.push(evt);
  },
  onLintBegin({spinnies}, {totalUniquePkgs, totalRules, totalPkgManagers}) {
    const text = `Running ${plural('rule', totalRules, true)} across ${plural(
      'package',
      totalUniquePkgs,
      true,
    )} using ${plural('package manager', totalPkgManagers, true)}${ELLIPSIS}`;

    spinnies.add('lint', {text});
  },
  onLintOk({spinnies}, {totalRules, totalPkgManagers, totalUniquePkgs}) {
    const text = `Applied ${plural('rule', totalRules, true)} to ${plural(
      'package',
      totalUniquePkgs,
      true,
    )} using ${plural('package manager', totalPkgManagers, true)}${ELLIPSIS}`;

    spinnies.get('lint').update({
      text,
      status: 'success',
    });
  },
  onLintFailed(
    {spinnies, ruleFailedEvents: ruleFailedEvts},
    {totalRules: total, issues},
  ) {
    const lintSpinnie = spinnies.get('lint');
    lintSpinnie.update({
      text: `${pluralize('rule', issues.length, true)} of ${total} failed`,
      status: 'fail',
    });

    // TODO move this into a format() function for these error kinds
    const failedByPackage = ruleFailedEvts
      .map((evt) => evt.issues)
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
        lintSpinnie.update({status: 'fail', text: msg});
      } else {
        lintSpinnie.update({status: 'warn', text: msg});
      }
    }
  },
  onRuleError({spinnies}, {error: err}) {
    spinnies.get('lint').update({text: err.message, status: 'fail'});
  },
  onRunScriptsBegin(
    {spinnies},
    {totalUniqueScripts, totalUniquePkgs, totalPkgManagers},
  ) {
    const text = `Running ${plural(
      'script',
      totalUniqueScripts,
      true,
    )} across ${plural('package', totalUniquePkgs, true)} using ${plural(
      'package manager',
      totalPkgManagers,
      true,
    )}${ELLIPSIS}`;

    spinnies.add('scripts', {text});
  },
  onRunScriptsOk(
    {spinnies},
    {totalUniqueScripts, totalUniquePkgs, totalPkgManagers},
  ) {
    const text = `Scripts completed successfully; executed ${plural(
      'script',
      totalUniqueScripts,
      true,
    )} across ${plural('package', totalUniquePkgs, true)} using ${plural(
      'package manager',
      totalPkgManagers,
      true,
    )}`;
    spinnies.get('scripts').update({status: 'success', text});
  },
  onRunScriptsFailed(
    {spinnies},
    {failed, totalUniqueScripts, totalUniquePkgs, totalPkgManagers},
  ) {
    const text = `Scripts completed with ${plural(
      'failure',
      failed,
      true,
    )}; executed ${plural('script', totalUniqueScripts, true)} across ${plural(
      'package',
      totalUniquePkgs,
      true,
    )} using ${plural('package manager', totalPkgManagers, true)}`;
    spinnies.get('scripts').update({status: 'fail', text});
  },
  onPkgManagerRunScriptsBegin({spinnies}, {pkgManager, totalUniqueScripts}) {
    const text = `${nameAndVersion(
      green(pkgManager.pkgManager),
      pkgManager.version,
    )} running 0/${totalUniqueScripts} ${plural(
      'script',
      totalUniqueScripts,
    )}${ELLIPSIS}`;

    spinnies.add(`scripts-${pkgManager.spec}`, {text, indent: 2});
  },
  onPkgManagerRunScriptsOk({spinnies}, {pkgManager, totalUniqueScripts}) {
    const text = `${nameAndVersion(
      green(pkgManager.pkgManager),
      pkgManager.version,
    )} ran ${plural('script', totalUniqueScripts, true)}`;
    spinnies
      .get(`scripts-${pkgManager.spec}`)
      .update({status: 'success', text});
  },
  onPkgManagerRunScriptsFailed({spinnies}, {pkgManager, totalUniqueScripts}) {
    const text = `${nameAndVersion(
      green(pkgManager.pkgManager),
      pkgManager.version,
    )} ran ${plural('script', totalUniqueScripts, true)}`;
    spinnies.get(`scripts-${pkgManager.spec}`).update({status: 'fail', text});
  },
  onRunScriptBegin(
    {spinnies},
    {pkgManager, currentScript, totalUniqueScripts},
  ) {
    const text = `${nameAndVersion(
      green(pkgManager.pkgManager),
      pkgManager.version,
    )} running ${currentScript}/${totalUniqueScripts} ${plural(
      'script',
      totalUniqueScripts,
    )}${ELLIPSIS}`;

    spinnies.get(`scripts-${pkgManager.spec}`).update({text});

    // const text = `${nameAndVersion(
    //   green(pkgManager.pkgManager),
    //   pkgManager.version,
    // )} running ${currentScript}/${totalUniqueScripts} ${plural(
    //   'script',
    //   totalUniqueScripts,
    // )}${ELLIPSIS}`;
    // spinnies.get(`scripts-${pkgManager.spec}`).update({text});
  },
  onRunScriptFailed(ctx, evt) {
    ctx.scriptFailedEvents.push(evt);
  },
  onRunScriptOk({spinnies}) {},
  onSmokeFailed({spinnies}, {error: err}) {
    // spinnies.fail(err.message);
  },
  onSmokeOk({spinnies}) {
    // spinnies.succeed('Lovey-dovey! 💖');
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
