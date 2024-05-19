import {blueBright, dim, greenBright, italic, red, white, yellow} from 'chalk';
import {MultiBar, Presets, type SingleBar} from 'cli-progress';
import {isError} from 'lodash';
import {error, warning} from 'log-symbols';
import {
  type RuleFailedEventData,
  type RunScriptFailedEventData,
} from 'midnight-smoker/event';
import {isBlessedPlugin} from 'midnight-smoker/plugin';
import {type ReporterDef} from 'midnight-smoker/reporter';
import pluralize from 'pluralize';

const ELLIPSIS = '…';

/**
 * Given the name of a pkg manager and optionally a version, return a fancy
 * string
 *
 * @param spec Spec
 * @returns `name@version` with some colors
 */
function nameAndVersion({
  pkgManager,
  version,
}: {
  pkgManager: string;
  version?: string;
}): string {
  return version ? `${pkgManager}${dim('@')}${white(version)}` : pkgManager;
}

// /**
//  * Pretty string for a package manager
//  *
//  * @param pkgManager Package manager spec
//  * @param pkgManagerIndex Index of the current package manager
//  * @param totalPkgManagers Total number of package managers
//  * @returns A pretty string
//  */
// function pkgManagerToString(
//   {pkgManager, version}: StaticPkgManagerSpec,
//   pkgManagerIndex?: number,
//   totalPkgManagers?: number,
// ) {
//   let text = `${nameAndVersion(green(pkgManager), version)}`;
//   if (pkgManagerIndex && totalPkgManagers && totalPkgManagers > 1) {
//     text += ` (${currentOfTotal(pkgManagerIndex, totalPkgManagers)})`;
//   }
//   return text;
// }

/**
 * Reporter-specific context object for the {@link ConsoleReporter}
 */
type ConsoleReporterContext = {
  // spinners: Spinnies;
  scriptFailedEvents: RunScriptFailedEventData[];
  ruleFailedEvents: RuleFailedEventData[];
  multiBar: MultiBar;
  bars: Map<string, SingleBar>;
  log: string[];
};

// function currentOfTotal(current: number, total: number) {
//   return `${current}/${total}`;
// }

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
    ctx.log = [];
    ctx.bars = new Map();
    ctx.multiBar = new MultiBar(
      {format: ' {bar} | {operation} | {value}/{total}', fps: 30},
      Presets.rect,
    );

    // ctx.spinners = new Spinnies({
    //   stream: process.stderr,
    //   spinnerColor: 'blueBright',
    //   succeedColor: 'white',
    //   infoColor: 'white',
    // });
    ctx.scriptFailedEvents = [];
    ctx.ruleFailedEvents = [];
  },
  teardown(ctx) {
    for (const [id, bar] of ctx.bars) {
      bar.stop();
      ctx.bars.delete(id);
    }
    ctx.multiBar.stop();
    // ctx.spinners.stopAll();
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

  onPackBegin({multiBar, bars}, {workspaceInfo, pkgManagers}) {
    // let text = `Packing`;
    // if (packOptions?.workspaces?.length) {
    //   text += plur` ${['workspace', packOptions?.workspaces.length, true]}`;
    // } else if (packOptions?.allWorkspaces) {
    //   text += ' all workspaces';
    //   if (packOptions?.includeWorkspaceRoot) {
    //     text += ' (and the workspace root)';
    //   }
    // } else {
    //   text += ' current project';
    // }
    // text += `${ELLIPSIS}`;

    const bar = multiBar.create(pkgManagers.length, 0, {operation: 'packing'});
    bars.set('pack', bar);
  },

  onPkgManagerPackBegin(
    {bars, multiBar},
    {pkgManager, workspaceInfo, totalPkgManagers},
  ) {
    const spec = nameAndVersion(pkgManager);
    const bar = multiBar.create(workspaceInfo.length * totalPkgManagers, 0, {
      operation: `${spec} packing`,
    });
    // bars.get('pack')?.update(currentPkgManager);

    // const bar = terminal.progressBar({
    //   title: nameAndVersion(pkgManager, version),
    //   eta: true,
    //   percent: true,
    //   items: workspaceInfo.length,
    //   // @ts-expect-error bad types
    //   x: -totalPkgManagers + currentPkgManager,
    // });
    bars.set(`pack-${spec}`, bar);
    // const text = `${pkgManagerToString(
    //   pkgManager,
    //   currentPkgManager,
    //   totalPkgManagers,
    // )} packing${ELLIPSIS}`;

    // spinners.add(`packing-${pkgManager.spec}`, {
    //   indent: 2,
    //   text,
    // });
  },

  onPkgPackBegin({bars}, {pkgManager, workspace, workspace: {pkgName}}) {},

  onPkgPackFailed({bars}, {pkgManager, workspace}) {
    const spec = nameAndVersion(pkgManager);
    bars.get(`pack-${spec}`)?.increment();
  },

  onPkgPackOk({bars}, {pkgManager, workspace}) {
    const spec = nameAndVersion(pkgManager);
    bars.get(`pack-${spec}`)?.increment();
  },

  onPkgManagerPackOk({bars}, {pkgManager}) {
    bars.get('pack')?.increment();
    const spec = nameAndVersion(pkgManager);
    bars.get(`pack-${spec}`)?.stop();
    // let text = `${pkgManagerToString(
    //   pkgManager,
    //   currentPkgManager,
    //   totalPkgManagers,
    // )}`;
    // text += plur` packed ${['package', manifests.length, true]}`;

    // spinners.get(`packing-${pkgManager.spec}`).update({
    //   text,
    //   status: 'success',
    // });
  },

  onPkgManagerPackFailed({bars}, {pkgManager}) {
    bars.get('pack')?.increment();
    const spec = nameAndVersion(pkgManager);
    bars.get(`pack-${spec}`)?.stop();
    // spinners.get(`packing-${pkgManager.spec}`).update({status: 'fail'});
  },
  onPackOk({bars, log}, {uniquePkgs, pkgManagers}) {
    const text = plur`Packing complete; ${[
      'package manager',
      pkgManagers.length,
      true,
    ]} packed ${['package', uniquePkgs.length, true]}`;

    // spinners.get('pack').update({text, status: 'success'});
    log.push(text);
    bars.get('pack')?.stop();
  },
  onPackFailed({bars, log, opts}, {error}) {
    const text = error.format(opts.verbose);
    log.push(text);
    bars.get('pack')?.stop();
    // spinners.get('pack').update({text, status: 'fail'});
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

  onInstallBegin(
    {multiBar, bars},
    {uniquePkgs, totalPkgs, pkgManagers, additionalDeps},
  ) {
    const bar = multiBar.create(uniquePkgs.length * pkgManagers.length, 0, {
      operation: 'installing',
    });
    bars.set('install', bar);
    // const bar = terminal.progressBar({
    //   title: 'Installing:',
    //   eta: true,
    //   percent: true,
    //   items: pkgManagers.length,
    // });
    // bars.set('install', bar);
    // let text = plur`Installing ${[
    //   'package',
    //   uniquePkgs.length,
    //   true,
    // ]} from tarball`;
    // if (additionalDeps.length) {
    //   text += plur` with ${[
    //     'additional dependency',
    //     additionalDeps.length,
    //     true,
    //   ]}`;
    // }
    // text += plur` using ${['package manager', pkgManagers.length, true]}`;
    // text += ELLIPSIS;
    // spinners.add('installing', {text});
  },
  onPkgManagerInstallBegin({bars, multiBar}, {pkgManager, manifests}) {
    const spec = nameAndVersion(pkgManager);
    const bar = multiBar.create(manifests.length, 0, {
      operation: `${spec} installing`,
    });
    bars.set(`install-${spec}`, bar);
    // bars.get('install')?.startItem(name);

    // const bar = terminal.progressBar({
    //   title: `${name} installing:`,
    //   items: manifests.length,
    //   eta: true,
    //   percent: true,
    // });
    // bars.set(`install.${name}`, bar);
    // const text = `${pkgManagerToString(
    //   pkgManager,
    //   currentPkgManager,
    //   totalPkgManagers,
    // )} installing${ELLIPSIS}`;

    // spinners.add(`installing-${pkgManager.spec}`, {
    //   indent: 2,
    //   text,
    // });
  },
  onPkgManagerInstallOk({bars}, {pkgManager}) {
    bars.get('install')?.increment();
    const spec = nameAndVersion(pkgManager);
    bars.get(`install-${spec}`)?.stop();

    // bars.get('install')?.itemDone(nameAndVersion(pkgManager));
    // let text = `${pkgManagerToString(
    //   pkgManager,
    //   currentPkgManager,
    //   totalPkgManagers,
    // )}`;
    // text += plur` installed ${['packages', manifests.length, true]}`;
    // spinners.get(`installing-${pkgManager.spec}`).update({
    //   text,
    //   status: 'success',
    // });
  },
  onPkgManagerInstallFailed({bars}, {pkgManager}) {
    bars.get('install')?.increment();
    const spec = nameAndVersion(pkgManager);
    bars.get(`install-${spec}`)?.stop();
    // bars.get('install')?.itemDone(nameAndVersion(pkgManager));
    // spinners.get(`installing-${pkgManager.spec}`).update({status: 'fail'});
  },
  onInstallOk({bars}, {uniquePkgs, pkgManagers}) {
    bars.get('install')?.stop();
    // const text = plur`Installing complete; ${[
    //   'package manager',
    //   pkgManagers.length,
    //   true,
    // ]} installed ${['unique package', uniquePkgs.length, true]}`;
    // spinners.get('installing').update({text, status: 'success'});
  },
  onInstallFailed({bars, log, opts}, {error: err}) {
    bars.get('install')?.stop();
    const text = err.format(opts.verbose);
    log.push(text);
    // spinners.get('installing').update({text, status: 'fail'});
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

  onLintBegin(ctx, {totalUniquePkgs, totalRules, totalPkgManagers}) {
    // let text = plur`Linting with ${['rule', totalRules, true]}`;
    // if (totalUniquePkgs > 1) {
    //   text += plur` across ${['package', totalUniquePkgs, true]}`;
    // }
    // if (totalPkgManagers > 1) {
    //   text += plur` using ${['package manager', totalPkgManagers, true]}`;
    // }
    // text += ELLIPSIS;
    // spinners.add('lint', {text});
  },
  onPkgManagerLintBegin(ctx, {pkgManager, totalRules}) {
    // let text = `${pkgManagerToString(pkgManager)} executing ${currentOfTotal(
    //   0,
    //   totalRules,
    // )}`;
    // text += plur` ${['rule', totalRules]}`;
    // text += ELLIPSIS;
    // spinners.add(`linting-${pkgManager.spec}`, {text, indent: 2});
  },
  onRuleBegin(ctx, {pkgManager, totalRules}) {
    // let text = `${pkgManagerToString(pkgManager)} executing ${currentOfTotal(
    //   currentRule,
    //   totalRules,
    // )}`;
    // text += plur` ${['rule', totalRules]}`;
    // text += ELLIPSIS;
    // spinners.get(`linting-${pkgManager.spec}`).update({text});
  },
  onRuleOk() {},
  onRuleFailed(ctx, evt) {
    ctx.ruleFailedEvents.push(evt);
  },
  onPkgManagerLintOk(ctx, {pkgManager, totalRules}) {
    // let text = pkgManagerToString(pkgManager);
    // text += plur`executed ${['rule', totalRules, true]}`;
    // spinners
    //   .get(`linting-${pkgManager.spec}`)
    //   .update({status: 'success', text});
  },
  onPkgManagerLintFailed(ctx, {pkgManager, totalRules}) {
    // let text = pkgManagerToString(pkgManager);
    // text += plur` executed ${['rule', totalRules, true]}`;
    // spinners.get(`linting-${pkgManager.spec}`).update({status: 'fail', text});
  },
  onLintOk(ctx, {totalRules, totalPkgManagers, totalUniquePkgs}) {
    // let text = plur`Executed ${['rule', totalRules, true]}`;
    // if (totalUniquePkgs > 1) {
    //   text += plur` against ${['package', totalUniquePkgs, true]}`;
    // }
    // if (totalPkgManagers > 1) {
    //   text += plur` using ${['package manager', totalPkgManagers, true]}`;
    // }
    // spinners.get('lint').update({
    //   text,
    //   status: 'success',
    // });
  },
  onLintFailed(ctx, {totalRules, results, totalUniquePkgs, totalPkgManagers}) {
    // const spinner = spinners.get('lint');
    // let text = plur`Executed ${['rule', totalRules, true]}`;
    // if (totalUniquePkgs > 1) {
    //   text += plur` against ${['package', totalUniquePkgs, true]}`;
    // }
    // if (totalPkgManagers > 1) {
    //   text += plur` using ${['package manager', totalPkgManagers, true]}`;
    // }
    // text += `; ${issues.length} failed`;
    // // spinner.update({
    // //   text,
    // //   status: 'fail',
    // // });
    // let hasError = false;
    // // TODO move this into a format() function for these error kinds
    // const failedByPkgManager = groupBy(
    //   issues.map((issue) =>
    //     pick(issue, ['rule', 'severity', 'message', 'context', 'filepath']),
    //   ),
    //   'context.pkgManager',
    // );
    // const failedByPackage = groupBy(
    //   issues.map((issue) =>
    //     pick(issue, ['rule', 'severity', 'message', 'context', 'filepath']),
    //   ),
    //   'context.pkgJson.name',
    // );
    // const termWidth = termSize().columns;
    // const indent = '  ';
    // for (const [pkgName, failed] of Object.entries(failedByPackage)) {
    //   const head = [`Issues found in package ${green(pkgName)}:`, ''];
    //   const lines = [];
    //   for (const {message, filepath, severity, rule} of failed) {
    //     const relpath = path.relative(process.cwd(), filepath);
    //     if (severity === RuleSeverities.Error) {
    //       hasError = true;
    //       lines.push(
    //         `${error} ${dim('[')}${red(rule.name)}${dim(']')} in ${cyan(
    //           relpath,
    //         )}:`,
    //         message,
    //       );
    //     } else {
    //       lines.push(
    //         `${warning} ${dim('[')}${yellow(rule.name)}${dim(']')} in ${cyan(
    //           relpath,
    //         )}:`,
    //         message,
    //       );
    //     }
    //   }
    //   const msg = [
    //     ...head.map((line) => wrapAnsi(line, termWidth)),
    //     ...lines.map((line) => wrapAnsi(line, termWidth)),
    //     '',
    //   ].join('\n');
    //   spinner.addLog(msg);
    // }
    // spinner.update({text, status: hasError ? 'fail' : 'warn'});
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
    ctx,
    {totalUniqueScripts, totalUniquePkgs, totalPkgManagers},
  ) {
    // const text = `Running ${pluralize(
    //   'script',
    //   totalUniqueScripts,
    //   true,
    // )} across ${pluralize('package', totalUniquePkgs, true)} using ${pluralize(
    //   'package manager',
    //   totalPkgManagers,
    //   true,
    // )}${ELLIPSIS}`;
    // spinners.add('scripts', {text});
  },
  onRunScriptsOk(ctx, {totalUniqueScripts, totalUniquePkgs, totalPkgManagers}) {
    // const text = `Scripts completed successfully; executed ${pluralize(
    //   'script',
    //   totalUniqueScripts,
    //   true,
    // )} across ${pluralize('package', totalUniquePkgs, true)} using ${pluralize(
    //   'package manager',
    //   totalPkgManagers,
    //   true,
    // )}`;
    // spinners.get('scripts').update({status: 'success', text});
  },
  onRunScriptsFailed(
    ctx,
    {failed, totalUniqueScripts, totalUniquePkgs, totalPkgManagers},
  ) {
    // const text = `Scripts completed with ${pluralize(
    //   'failure',
    //   failed,
    //   true,
    // )}; executed ${pluralize(
    //   'script',
    //   totalUniqueScripts,
    //   true,
    // )} across ${pluralize('package', totalUniquePkgs, true)} using ${pluralize(
    //   'package manager',
    //   totalPkgManagers,
    //   true,
    // )}`;
    // spinners.get('scripts').update({status: 'fail', text});
  },
  onPkgManagerRunScriptsBegin(ctx, {pkgManager, totalUniqueScripts}) {
    // const text = `${pkgManagerToString(
    //   pkgManager,
    // )} running 0/${totalUniqueScripts} ${pluralize(
    //   'script',
    //   totalUniqueScripts,
    // )}${ELLIPSIS}`;
    // spinners.add(`scripts-${pkgManager.spec}`, {text, indent: 2});
  },
  onPkgManagerRunScriptsOk(ctx, {pkgManager, totalUniqueScripts}) {
    // const text = `${pkgManagerToString(pkgManager)} ran ${pluralize(
    //   'script',
    //   totalUniqueScripts,
    //   true,
    // )}`;
    // spinners
    //   .get(`scripts-${pkgManager.spec}`)
    //   .update({status: 'success', text});
  },
  onPkgManagerRunScriptsFailed(ctx, {pkgManager, totalUniqueScripts}) {
    // const text = `${pkgManagerToString(pkgManager)} ran ${pluralize(
    //   'script',
    //   totalUniqueScripts,
    //   true,
    // )}`;
    // spinners.get(`scripts-${pkgManager.spec}`).update({status: 'fail', text});
  },
  onRunScriptBegin(ctx, {pkgManager, totalUniqueScripts}) {
    // const text = `${pkgManagerToString(
    //   pkgManager,
    // )} running ${currentScript}/${totalUniqueScripts} ${pluralize(
    //   'script',
    //   totalUniqueScripts,
    // )}${ELLIPSIS}`;
    // spinners.get(`scripts-${pkgManager.spec}`).update({text});
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
      `💨 ${nameAndVersion({
        pkgManager: blueBright.bold('midnight-smoker'),
        version: ctx.pkgJson.version!,
      })}\n`,
    );
    const extPlugins = plugins.filter(({id}) => !isBlessedPlugin(id));
    if (extPlugins.length) {
      console.error(
        '🔌 Loaded %s: %s',
        pluralize('external plugin', extPlugins.length, true),
        extPlugins
          .map(({id, version}) =>
            nameAndVersion({pkgManager: greenBright(id), version}),
          )
          .join(', '),
      );
    }
  },
  onSmokeFailed(ctx, {error: err}) {
    // spinners.fail(err.message);
  },
  onSmokeOk() {
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
  onBeforeExit() {
    console.error('before exit!');
    // spinners.log(console.error);
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
