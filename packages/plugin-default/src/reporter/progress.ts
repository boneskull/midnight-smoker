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

const debug = Debug('midnight-smoker:reporter:progress');

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

/**
 * Reporter-specific context object for the {@link ProgressReporter}
 */
type ProgressReporterContext = {
  scriptFailedEvents: RunScriptFailedEventData[];
  ruleFailedEvents: RuleFailedEventData[];
  multiBar: MultiBar;
  bars: Map<string, SingleBar>;
  log: string[];
};

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

export const ProgressReporter: ReporterDef<ProgressReporterContext> = {
  name: 'progress',
  description: 'Fancy progress bars (for humans)',
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

  onPackBegin({multiBar, bars}, {pkgManagers}) {
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

  onPkgPackBegin() {},

  onPkgPackFailed({bars}, {pkgManager}) {
    const spec = specString(pkgManager);
    bars.get(`pack-${spec}`)?.increment();
  },

  onPkgPackOk({bars}, {pkgManager}) {
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
  onPkgInstallBegin() {},
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

  onRunScriptsBegin(
    {bars, multiBar},
    {pkgManagers, totalScripts: totalUniqueScripts},
  ) {
    if (pkgManagers.length > 1) {
      bars.set(
        'scripts',
        multiBar.create(pkgManagers.length, 0, {
          operation: plur`running ${['script', totalUniqueScripts]}`,
          unit: 'package managers',
        }),
      );
    }
  },
  onRunScriptsOk({bars}) {
    bars.get('scripts')?.stop();
  },
  onRunScriptsFailed({bars}) {
    bars.get('scripts')?.stop();
  },
  onPkgManagerRunScriptsBegin({multiBar, bars}, {pkgManager, workspaceInfo}) {
    const spec = specString(pkgManager);
    const bar = multiBar.create(workspaceInfo.length, 0, {
      operation: `${spec} running scripts`,
      unit: plur`${['workspace', workspaceInfo.length]}`,
    });
    bars.set(`scripts-${spec}`, bar);
  },
  onPkgManagerRunScriptsOk({bars}, {pkgManager}) {
    bars.get('scripts')?.increment();
    const spec = specString(pkgManager);
    bars.get(`scripts-${spec}`)?.stop();
  },
  onPkgManagerRunScriptsFailed({bars}, {pkgManager}) {
    bars.get('scripts')?.increment();
    const spec = specString(pkgManager);
    bars.get(`scripts-${spec}`)?.stop();
  },
  onRunScriptBegin(
    {bars, multiBar},
    {pkgManager, manifest, totalScripts: totalUniqueScripts},
  ) {
    const spec = specString(pkgManager);
    const barId = `scripts-${manifest.pkgName}-${spec}`;
    const unit = plur`${['script', totalUniqueScripts]}`;
    const bar =
      bars.get(barId) ??
      multiBar.create(totalUniqueScripts, 0, {
        operation: `${spec} running ${unit}: ${manifest.pkgName}`,
        unit,
      });
    bars.set(barId, bar);
  },
  onRunScriptEnd({bars}, {pkgManager, manifest}) {
    const spec = specString(pkgManager);
    const barId = `scripts-${manifest.pkgName}-${spec}`;
    const bar = bars.get(barId);
    bar?.increment();
    if (bar?.getProgress() === 1) {
      const spec = specString(pkgManager);
      bars.get(`scripts-${spec}`)?.increment();
    }
  },
  onRunScriptFailed() {},
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
  onSmokeFailed() {
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
