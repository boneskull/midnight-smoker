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
import {groupBy, isError, pick} from 'lodash';
import {error, warning} from 'log-symbols';
import {
  type RuleFailedEventData,
  type RunScriptFailedEventData,
} from 'midnight-smoker/event';
import {type StaticPkgManagerSpec} from 'midnight-smoker/pkg-manager';
import {isBlessedPlugin} from 'midnight-smoker/plugin/blessed';
import {type ReporterDef} from 'midnight-smoker/reporter';
import {RuleSeverities} from 'midnight-smoker/rule';
import pluralize from 'pluralize';
import {type WriteStream} from 'tty';

const ELLIPSIS = '…';

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

/**
 * Pretty string for a package manager
 *
 * @param pkgManager Package manager spec
 * @param pkgManagerIndex Index of the current package manager
 * @param totalPkgManagers Total number of package managers
 * @returns A pretty string
 */
function pkgManagerToString(
  {pkgManager, version}: StaticPkgManagerSpec,
  pkgManagerIndex?: number,
  totalPkgManagers?: number,
) {
  let text = `${nameAndVersion(green(pkgManager), version)}`;
  if (pkgManagerIndex && totalPkgManagers && totalPkgManagers > 1) {
    text += ` (${currentOfTotal(pkgManagerIndex, totalPkgManagers)})`;
  }
  return text;
}

/**
 * Reporter-specific context object for the {@link ConsoleReporter}
 */
type ConsoleReporterContext = {
  spinners: Spinnies;
  scriptFailedEvents: RunScriptFailedEventData[];
  ruleFailedEvents: RuleFailedEventData[];
};

function currentOfTotal(current: number, total: number) {
  return `${current}/${total}`;
}

/**
 * Tag function for pluralizing strings.
 *
 * Mostly just wanted to name a function `plur`
 *
 * @example
 *
 * ```ts
 * // my love gave me 2 turtledoves
 * const str = plur`my love gave me ${['turtledove', 2, true]}`;
 * // my love gave me turtledoves
 * const str2 = plur`my love gave me ${['turtledove', 2]}`;
 * ```
 *
 * @param strings
 * @param values
 * @returns
 */
export function plur(
  strings: TemplateStringsArray,
  ...values: [noun: string, count: number, withNumber?: boolean][]
) {
  const exprs = [...values];
  const computed = [];
  while (exprs.length) {
    const [thing, count, showNumber = false] = exprs.shift() as [
      noun: string,
      count: number,
      withNumber?: boolean,
    ];
    computed.push(pluralize(thing, count, showNumber));
  }
  // TemplateStringsArray is immutable
  const strs = [...strings];
  // if the string starts with an expression, then the first value is an empty string.
  // after this, strs.length === computed.length
  const textArr: string[] = [strs.shift() as string];

  while (strs.length) {
    const nextVal = computed.shift()!;
    const nextStr = strs.shift()!;
    textArr.push(nextVal, nextStr);
  }
  return textArr.join('').replace(/\s{2,}/g, ' ');
}

export const ConsoleReporter: ReporterDef<ConsoleReporterContext> = {
  name: 'console',
  description: 'Default console reporter (for humans)',
  setup(ctx) {
    ctx.spinners = new Spinnies({
      stream: ctx.stderr as WriteStream,
      spinnerColor: 'blueBright',
      succeedColor: 'white',
      infoColor: 'white',
    });
    ctx.scriptFailedEvents = [];
    ctx.ruleFailedEvents = [];
  },
  teardown(ctx) {
    ctx.spinners.stopAll();
  },

  //    ▄███████▄    ▄████████  ▄████████    ▄█   ▄█▄
  //   ███    ███   ███    ███ ███    ███   ███ ▄███▀
  //   ███    ███   ███    ███ ███    █▀    ███▐██▀
  //   ███    ███   ███    ███ ███         ▄█████▀
  // ▀█████████▀  ▀███████████ ███        ▀▀█████▄
  //   ███          ███    ███ ███    █▄    ███▐██▄
  //   ███          ███    ███ ███    ███   ███ ▀███▄
  //  ▄████▀        ███    █▀  ████████▀    ███   ▀█▀
  //                                        ▀

  onPackBegin({spinners}, {packOptions: opts = {}}) {
    let text = `Packing`;
    if (opts.workspaces?.length) {
      text += plur` ${['workspace', opts.workspaces.length, true]}`;
    } else if (opts.allWorkspaces) {
      text += ' all workspaces';
      if (opts?.includeWorkspaceRoot) {
        text += ' (and the workspace root)';
      }
    } else {
      text += ' current project';
    }
    text += `${ELLIPSIS}`;

    spinners.add('pack', {text});
  },

  onPkgManagerPackBegin(
    {spinners},
    {pkgManager, currentPkgManager, totalPkgManagers},
  ) {
    const text = `${pkgManagerToString(
      pkgManager,
      currentPkgManager,
      totalPkgManagers,
    )} packing${ELLIPSIS}`;

    spinners.add(`packing-${pkgManager.spec}`, {
      indent: 2,
      text,
    });
  },

  onPkgManagerPackOk(
    {spinners},
    {pkgManager, manifests, currentPkgManager, totalPkgManagers},
  ) {
    let text = `${pkgManagerToString(
      pkgManager,
      currentPkgManager,
      totalPkgManagers,
    )}`;
    text += plur` packed ${['package', manifests.length, true]}`;

    spinners.get(`packing-${pkgManager.spec}`).update({
      text,
      status: 'success',
    });
  },

  onPkgManagerPackFailed({spinners}, {pkgManager}) {
    spinners.get(`packing-${pkgManager.spec}`).update({status: 'fail'});
  },
  onPackOk({spinners}, {uniquePkgs, pkgManagers}) {
    const text = plur`Packing complete; ${[
      'package manager',
      pkgManagers.length,
      true,
    ]} packed ${['package', uniquePkgs.length, true]}`;

    spinners.get('pack').update({text, status: 'success'});
  },
  onPackFailed({spinners, opts}, {error: err}) {
    const text = err.format(opts.verbose);

    spinners.get('pack').update({text, status: 'fail'});
  },

  // ▄█  ███▄▄▄▄      ▄████████     ███        ▄████████  ▄█        ▄█
  // ███  ███▀▀▀██▄   ███    ███ ▀█████████▄   ███    ███ ███       ███
  // ███▌ ███   ███   ███    █▀     ▀███▀▀██   ███    ███ ███       ███
  // ███▌ ███   ███   ███            ███   ▀   ███    ███ ███       ███
  // ███▌ ███   ███ ▀███████████     ███     ▀███████████ ███       ███
  // ███  ███   ███          ███     ███       ███    ███ ███       ███
  // ███  ███   ███    ▄█    ███     ███       ███    ███ ███▌    ▄ ███▌    ▄
  // █▀    ▀█   █▀   ▄████████▀     ▄████▀     ███    █▀  █████▄▄██ █████▄▄██
  //                                                       ▀         ▀

  onInstallBegin({spinners}, {uniquePkgs, pkgManagers, additionalDeps}) {
    let text = plur`Installing ${[
      'package',
      uniquePkgs.length,
      true,
    ]} from tarball`;
    if (additionalDeps.length) {
      text += plur` with ${[
        'additional dependency',
        additionalDeps.length,
        true,
      ]}`;
    }
    text += plur` using ${['package manager', pkgManagers.length, true]}`;
    text += ELLIPSIS;
    spinners.add('installing', {text});
  },
  onPkgManagerInstallBegin(
    {spinners},
    {pkgManager, currentPkgManager, totalPkgManagers},
  ) {
    const text = `${pkgManagerToString(
      pkgManager,
      currentPkgManager,
      totalPkgManagers,
    )} installing${ELLIPSIS}`;

    spinners.add(`installing-${pkgManager.spec}`, {
      indent: 2,
      text,
    });
  },
  onPkgManagerInstallOk(
    {spinners},
    {pkgManager, currentPkgManager, totalPkgManagers, manifests},
  ) {
    let text = `${pkgManagerToString(
      pkgManager,
      currentPkgManager,
      totalPkgManagers,
    )}`;
    text += plur` installed ${['packages', manifests.length, true]}`;

    spinners.get(`installing-${pkgManager.spec}`).update({
      text,
      status: 'success',
    });
  },
  onPkgManagerInstallFailed({spinners}, {pkgManager}) {
    spinners.get(`installing-${pkgManager.spec}`).update({status: 'fail'});
  },
  onInstallOk({spinners}, {uniquePkgs, pkgManagers}) {
    const text = plur`Installing complete; ${[
      'package manager',
      pkgManagers.length,
      true,
    ]} installed ${['unique package', uniquePkgs.length, true]}`;

    spinners.get('installing').update({text, status: 'success'});
  },
  onInstallFailed({spinners, opts}, {error: err}) {
    const text = err.format(opts.verbose);
    spinners.get('installing').update({text, status: 'fail'});
  },

  //  ▄█        ▄█  ███▄▄▄▄       ███
  // ███       ███  ███▀▀▀██▄ ▀█████████▄
  // ███       ███▌ ███   ███    ▀███▀▀██
  // ███       ███▌ ███   ███     ███   ▀
  // ███       ███▌ ███   ███     ███
  // ███       ███  ███   ███     ███
  // ███▌    ▄ ███  ███   ███     ███
  // █████▄▄██ █▀    ▀█   █▀     ▄████▀
  // ▀

  onLintBegin({spinners}, {totalUniquePkgs, totalRules, totalPkgManagers}) {
    let text = plur`Linting with ${['rule', totalRules, true]}`;
    if (totalUniquePkgs > 1) {
      text += plur` across ${['package', totalUniquePkgs, true]}`;
    }
    if (totalPkgManagers > 1) {
      text += plur` using ${['package manager', totalPkgManagers, true]}`;
    }
    text += ELLIPSIS;

    spinners.add('lint', {text});
  },
  onPkgManagerLintBegin({spinners}, {pkgManager, totalRules}) {
    let text = `${pkgManagerToString(pkgManager)} executing ${currentOfTotal(
      0,
      totalRules,
    )}`;
    text += plur` ${['rule', totalRules]}`;
    text += ELLIPSIS;

    spinners.add(`linting-${pkgManager.spec}`, {text, indent: 2});
  },
  onRuleBegin({spinners}, {pkgManager, currentRule, totalRules}) {
    let text = `${pkgManagerToString(pkgManager)} executing ${currentOfTotal(
      currentRule,
      totalRules,
    )}`;
    text += plur` ${['rule', totalRules]}`;
    text += ELLIPSIS;

    spinners.get(`linting-${pkgManager.spec}`).update({text});
  },
  onRuleOk() {},
  onRuleFailed(ctx, evt) {
    ctx.ruleFailedEvents.push(evt);
  },
  onPkgManagerLintOk({spinners}, {pkgManager, totalRules}) {
    let text = pkgManagerToString(pkgManager);
    text += plur`executed ${['rule', totalRules, true]}`;
    spinners
      .get(`linting-${pkgManager.spec}`)
      .update({status: 'success', text});
  },
  onPkgManagerLintFailed({spinners}, {pkgManager, totalRules}) {
    let text = pkgManagerToString(pkgManager);
    text += plur` executed ${['rule', totalRules, true]}`;
    spinners.get(`linting-${pkgManager.spec}`).update({status: 'fail', text});
  },
  onLintOk({spinners}, {totalRules, totalPkgManagers, totalUniquePkgs}) {
    let text = plur`Executed ${['rule', totalRules, true]}`;
    if (totalUniquePkgs > 1) {
      text += plur` against ${['package', totalUniquePkgs, true]}`;
    }
    if (totalPkgManagers > 1) {
      text += plur` using ${['package manager', totalPkgManagers, true]}`;
    }

    spinners.get('lint').update({
      text,
      status: 'success',
    });
  },
  onLintFailed(
    {spinners},
    {totalRules, result: {issues}, totalUniquePkgs, totalPkgManagers},
  ) {
    const spinner = spinners.get('lint');
    let text = plur`Executed ${['rule', totalRules, true]}`;
    if (totalUniquePkgs > 1) {
      text += plur` against ${['package', totalUniquePkgs, true]}`;
    }
    if (totalPkgManagers > 1) {
      text += plur` using ${['package manager', totalPkgManagers, true]}`;
    }

    text += `; ${issues.length} failed`;

    // spinner.update({
    //   text,
    //   status: 'fail',
    // });

    let hasError = false;
    // TODO move this into a format() function for these error kinds

    const failedByPackage = groupBy(
      issues.map((issue) =>
        pick(issue, ['rule', 'severity', 'message', 'context']),
      ),
      'context.pkgJson.name',
    );
    // const failedByPackage = issues.reduce<Record<string, RuleResultFailed[]>>(
    //   (acc, failed) => {
    //     const pkgName =
    //       failed.context.pkgJson.name ?? failed.context.installPath;
    //     acc[pkgName] = [...(acc[pkgName] ?? []), failed];
    //     return acc;
    //   },
    //   {},
    // );

    for (const [pkgName, failed] of Object.entries(failedByPackage)) {
      // const relPkgJsonPath = path.relative(
      //   process.cwd(),
      //   // @ts-expect-error wtf
      //   failed.context.pkgJsonPath,
      // );
      const lines = [`Issues found in package ${green(pkgName)}:`];

      for (const {message, severity, rule} of failed) {
        if (severity === RuleSeverities.Error) {
          hasError = true;
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
      spinner.addLog(msg);
    }

    spinner.update({text, status: hasError ? 'fail' : 'warn'});
  },
  onRuleError() {
    // TODO
  },

  //    ▄████████  ▄████████    ▄████████  ▄█     ▄███████▄     ███        ▄████████
  //   ███    ███ ███    ███   ███    ███ ███    ███    ███ ▀█████████▄   ███    ███
  //   ███    █▀  ███    █▀    ███    ███ ███▌   ███    ███    ▀███▀▀██   ███    █▀
  //   ███        ███         ▄███▄▄▄▄██▀ ███▌   ███    ███     ███   ▀   ███
  // ▀███████████ ███        ▀▀███▀▀▀▀▀   ███▌ ▀█████████▀      ███     ▀███████████
  //          ███ ███    █▄  ▀███████████ ███    ███            ███              ███
  //    ▄█    ███ ███    ███   ███    ███ ███    ███            ███        ▄█    ███
  //  ▄████████▀  ████████▀    ███    ███ █▀    ▄████▀         ▄████▀    ▄████████▀
  //                           ███    ███

  onRunScriptsBegin(
    {spinners},
    {totalUniqueScripts, totalUniquePkgs, totalPkgManagers},
  ) {
    const text = `Running ${pluralize(
      'script',
      totalUniqueScripts,
      true,
    )} across ${pluralize('package', totalUniquePkgs, true)} using ${pluralize(
      'package manager',
      totalPkgManagers,
      true,
    )}${ELLIPSIS}`;

    spinners.add('scripts', {text});
  },
  onRunScriptsOk(
    {spinners},
    {totalUniqueScripts, totalUniquePkgs, totalPkgManagers},
  ) {
    const text = `Scripts completed successfully; executed ${pluralize(
      'script',
      totalUniqueScripts,
      true,
    )} across ${pluralize('package', totalUniquePkgs, true)} using ${pluralize(
      'package manager',
      totalPkgManagers,
      true,
    )}`;
    spinners.get('scripts').update({status: 'success', text});
  },
  onRunScriptsFailed(
    {spinners},
    {failed, totalUniqueScripts, totalUniquePkgs, totalPkgManagers},
  ) {
    const text = `Scripts completed with ${pluralize(
      'failure',
      failed,
      true,
    )}; executed ${pluralize(
      'script',
      totalUniqueScripts,
      true,
    )} across ${pluralize('package', totalUniquePkgs, true)} using ${pluralize(
      'package manager',
      totalPkgManagers,
      true,
    )}`;
    spinners.get('scripts').update({status: 'fail', text});
  },
  onPkgManagerRunScriptsBegin({spinners}, {pkgManager, totalUniqueScripts}) {
    const text = `${pkgManagerToString(
      pkgManager,
    )} running 0/${totalUniqueScripts} ${pluralize(
      'script',
      totalUniqueScripts,
    )}${ELLIPSIS}`;

    spinners.add(`scripts-${pkgManager.spec}`, {text, indent: 2});
  },
  onPkgManagerRunScriptsOk({spinners}, {pkgManager, totalUniqueScripts}) {
    const text = `${pkgManagerToString(pkgManager)} ran ${pluralize(
      'script',
      totalUniqueScripts,
      true,
    )}`;
    spinners
      .get(`scripts-${pkgManager.spec}`)
      .update({status: 'success', text});
  },
  onPkgManagerRunScriptsFailed({spinners}, {pkgManager, totalUniqueScripts}) {
    const text = `${pkgManagerToString(pkgManager)} ran ${pluralize(
      'script',
      totalUniqueScripts,
      true,
    )}`;
    spinners.get(`scripts-${pkgManager.spec}`).update({status: 'fail', text});
  },
  onRunScriptBegin(
    {spinners},
    {pkgManager, currentScript, totalUniqueScripts},
  ) {
    const text = `${pkgManagerToString(
      pkgManager,
    )} running ${currentScript}/${totalUniqueScripts} ${pluralize(
      'script',
      totalUniqueScripts,
    )}${ELLIPSIS}`;

    spinners.get(`scripts-${pkgManager.spec}`).update({text});
  },
  onRunScriptFailed(ctx, evt) {
    ctx.scriptFailedEvents.push(evt);
  },
  onRunScriptOk() {},

  //    ▄████████   ▄▄▄▄███▄▄▄▄    ▄██████▄     ▄█   ▄█▄    ▄████████
  //   ███    ███ ▄██▀▀▀███▀▀▀██▄ ███    ███   ███ ▄███▀   ███    ███
  //   ███    █▀  ███   ███   ███ ███    ███   ███▐██▀     ███    █▀
  //   ███        ███   ███   ███ ███    ███  ▄█████▀     ▄███▄▄▄
  // ▀███████████ ███   ███   ███ ███    ███ ▀▀█████▄    ▀▀███▀▀▀
  //          ███ ███   ███   ███ ███    ███   ███▐██▄     ███    █▄
  //    ▄█    ███ ███   ███   ███ ███    ███   ███ ▀███▄   ███    ███
  //  ▄████████▀   ▀█   ███   █▀   ▀██████▀    ███   ▀█▀   ██████████
  //                                           ▀

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
        pluralize('external plugin', extPlugins.length, true),
        extPlugins
          .map(({id, version}) => nameAndVersion(greenBright(id), version))
          .join(', '),
      );
    }
  },
  onSmokeFailed({spinners}, {error: err}) {
    // spinners.fail(err.message);
  },
  onSmokeOk({spinners}) {
    // spinners.succeed('Lovey-dovey! 💖');
  },
  onLingered(_, {directories: dirs}) {
    console.error(
      `${warning} Lingering ${pluralize('temp directory', dirs.length)}:\n`,
    );
    for (const dir of dirs) {
      console.error(yellow(dir));
    }
  },
  onBeforeExit({spinners}) {
    spinners.log(console.error);
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
