import {blueBright, dim, greenBright, italic, red, white, yellow} from 'chalk';
import {MultiBar, Presets, type SingleBar} from 'cli-progress';
import Debug from 'debug';
import {isError} from 'lodash';
import {error, warning} from 'log-symbols';
import {
  type RuleFailedEventData,
  type RunScriptFailedEventData,
} from 'midnight-smoker/event';
import {isBlessedPlugin} from 'midnight-smoker/plugin';
import {type ReporterDef} from 'midnight-smoker/reporter';
import pluralize from 'pluralize';

const debug = Debug('midnight-smoker:reporter:console');

const ELLIPSIS = '…';

/**
 * Given the name of a pkg manager and optionally a version, return a fancy
 * string
 *
 * @param spec Spec
 * @returns `name@version` with some colors
 */
function specString({bin, version}: {bin: string; version?: string}): string {
  return version ? `${bin}${dim('@')}${white(version)}` : bin;
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
      {format: ' {bar} | {operation} | {value}/{total} {unit}', fps: 30},
      Presets.rect,
    );
    debug('Setup complete');
  },
  teardown(ctx) {
    for (const [id, bar] of ctx.bars) {
      bar.stop();
      ctx.bars.delete(id);
    }
    ctx.multiBar.stop();
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
    if (pkgManagers.length > 1) {
      bars.set(
        'pack',
        multiBar.create(pkgManagers.length, 0, {
          operation: 'packing',
          unit: 'package managers',
        }),
      );
    }
  },

  onPkgManagerPackBegin({bars, multiBar}, {pkgManager, workspaceInfo}) {
    const spec = specString(pkgManager);
    const bar = multiBar.create(workspaceInfo.length, 0, {
      operation: `${spec} packing`,
      unit: plur`${['workspace', workspaceInfo.length]}`,
    });
    bars.set(`pack-${spec}`, bar);
  },

  onPkgPackBegin({bars}, {pkgManager, workspace, workspace: {pkgName}}) {},

  onPkgPackFailed({bars}, {pkgManager, workspace}) {
    const spec = specString(pkgManager);
    bars.get(`pack-${spec}`)?.increment();
  },

  onPkgPackOk({bars}, {pkgManager, workspace}) {
    const spec = specString(pkgManager);
    bars.get(`pack-${spec}`)?.increment();
  },

  onPkgManagerPackOk({bars}, {pkgManager}) {
    bars.get('pack')?.increment();
    const spec = specString(pkgManager);
    bars.get(`pack-${spec}`)?.stop();
  },

  onPkgManagerPackFailed({bars}, {pkgManager}) {
    bars.get('pack')?.increment();
    const spec = specString(pkgManager);
    bars.get(`pack-${spec}`)?.stop();
  },

  onPackOk({bars}) {
    bars.get('pack')?.stop();
  },

  onPackFailed({bars, log, opts}, {error}) {
    const text = error.format(opts.verbose);
    log.push(text);
    bars.get('pack')?.stop();
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

  onInstallBegin({multiBar, bars}, {pkgManagers}) {
    if (pkgManagers.length > 1) {
      bars.set(
        'install',
        multiBar.create(pkgManagers.length, 0, {
          operation: 'installing',
          unit: 'package managers',
        }),
      );
    }
  },
  onInstallOk({bars}) {
    bars.get('install')?.stop();
  },
  onInstallFailed({bars, log, opts}, {error: err}) {
    bars.get('install')?.stop();
    const text = err.format(opts.verbose);
    log.push(text);
  },
  onPkgManagerInstallBegin({bars, multiBar}, {pkgManager, totalPkgs}) {
    const spec = specString(pkgManager);
    const bar = multiBar.create(totalPkgs, 0, {
      operation: `${spec} installing`,
      unit: plur`${['package', totalPkgs]}`,
    });
    bars.set(`install-${spec}`, bar);
  },
  onPkgManagerInstallOk({bars}, {pkgManager}) {
    bars.get('install')?.increment();
    const spec = specString(pkgManager);
    bars.get(`install-${spec}`)?.stop();
  },
  onPkgManagerInstallFailed({bars}, {pkgManager}) {
    bars.get('install')?.increment();
    const spec = specString(pkgManager);
    bars.get(`install-${spec}`)?.stop();
  },
  onPkgInstallBegin({bars}, {pkgManager}) {},
  onPkgInstallOk({bars}, {pkgManager}) {
    const spec = specString(pkgManager);
    bars.get(`install-${spec}`)?.increment();
  },
  onPkgInstallFailed({bars}, {pkgManager}) {
    const spec = specString(pkgManager);
    bars.get(`install-${spec}`)?.increment();
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

  onLintBegin({multiBar, bars}, {pkgManagers}) {
    if (pkgManagers.length > 1) {
      bars.set(
        'lint',
        multiBar.create(pkgManagers.length, 0, {
          operation: 'linting',
          unit: 'package managers',
        }),
      );
    }
  },
  onLintOk({bars}) {
    bars.get('lint')?.stop();
  },
  onLintFailed({bars}) {
    bars.get('lint')?.stop();
  },
  onPkgManagerLintBegin({multiBar, bars}, {pkgManager, workspaceInfo}) {
    const spec = specString(pkgManager);
    const bar = multiBar.create(workspaceInfo.length, 0, {
      operation: `${spec} linting`,
      unit: plur`${['workspace', workspaceInfo.length]}`,
    });
    bars.set(`lint-${spec}`, bar);
  },
  onPkgManagerLintOk({bars}, {pkgManager}) {
    bars.get('lint')?.increment();
    const spec = specString(pkgManager);
    bars.get(`lint-${spec}`)?.stop();
  },
  onPkgManagerLintFailed({bars}, {pkgManager}) {
    bars.get('lint')?.increment();
    const spec = specString(pkgManager);
    bars.get(`lint-${spec}`)?.stop();
  },
  onRuleBegin({multiBar, bars}, {pkgManager, manifest, totalRules}) {
    const spec = specString(pkgManager);
    const barId = `lint-${manifest.pkgName}-${spec}`;
    const bar =
      bars.get(barId) ??
      multiBar.create(totalRules, 0, {
        operation: `${spec} linting: ${manifest.pkgName}`,
        unit: plur`${['rule', totalRules]}`,
      });
    bars.set(barId, bar);
  },
  onRuleEnd({bars}, {pkgManager, manifest}) {
    const spec = specString(pkgManager);
    const barId = `lint-${manifest.pkgName}-${spec}`;
    const bar = bars.get(barId);
    bar?.increment();
    if (bar?.getProgress() === 1) {
      const spec = specString(pkgManager);
      bars.get(`lint-${spec}`)?.increment();
    }
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

  onRunScriptsBegin() {
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
  onRunScriptsOk() {
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
  onRunScriptsFailed() {
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
  onPkgManagerRunScriptsBegin() {
    // const text = `${pkgManagerToString(
    //   pkgManager,
    // )} running 0/${totalUniqueScripts} ${pluralize(
    //   'script',
    //   totalUniqueScripts,
    // )}${ELLIPSIS}`;
    // spinners.add(`scripts-${pkgManager.spec}`, {text, indent: 2});
  },
  onPkgManagerRunScriptsOk() {
    // const text = `${pkgManagerToString(pkgManager)} ran ${pluralize(
    //   'script',
    //   totalUniqueScripts,
    //   true,
    // )}`;
    // spinners
    //   .get(`scripts-${pkgManager.spec}`)
    //   .update({status: 'success', text});
  },
  onPkgManagerRunScriptsFailed() {
    // const text = `${pkgManagerToString(pkgManager)} ran ${pluralize(
    //   'script',
    //   totalUniqueScripts,
    //   true,
    // )}`;
    // spinners.get(`scripts-${pkgManager.spec}`).update({status: 'fail', text});
  },
  onRunScriptBegin() {
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
      `💨 ${specString({
        bin: blueBright.bold('midnight-smoker'),
        version: ctx.pkgJson.version!,
      })}\n`,
    );
    const extPlugins = plugins.filter(({id}) => !isBlessedPlugin(id));
    if (extPlugins.length) {
      console.error(
        '🔌 Loaded %s: %s',
        pluralize('external plugin', extPlugins.length, true),
        extPlugins
          .map(({id, version}) => specString({bin: greenBright(id), version}))
          .join(', '),
      );
    }
  },
  // TODO: fix
  onSmokeFailed(ctx) {
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
  onBeforeExit() {},
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
