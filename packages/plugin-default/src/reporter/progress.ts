import {grey, magentaBright, yellow} from 'chalk';
import {MultiBar, Presets, type SingleBar} from 'cli-progress';
import Debug from 'debug';
import {warning} from 'log-symbols';
import {
  type RuleFailedEventData,
  type RunScriptFailedEventData,
} from 'midnight-smoker/event';
import {type Reporter} from 'midnight-smoker/reporter';
import {formatPkgManager} from 'midnight-smoker/util';

import {plural, preface} from './util';

const debug = Debug('midnight-smoker:reporter:progress');

/**
 * Reporter-specific context object for the {@link ProgressReporter}
 *
 * @internal
 */
type ProgressReporterContext = {
  bars: Map<string, SingleBar>;
  log: string[];
  multiBar: MultiBar;
  ruleFailedEvents: RuleFailedEventData[];
  scriptFailedEvents: RunScriptFailedEventData[];
};

/**
 * Wraps the ugly way to check if a progress bar is complete
 *
 * @param bar Progress bar, if any
 * @returns `true` if the bar is complete
 * @internal
 */
function barIsComplete(bar?: SingleBar): boolean {
  return bar?.getProgress() === 1;
}

export const ProgressReporter: Reporter<ProgressReporterContext> = {
  description: 'Fancy progress bars (for humans)',
  name: 'progress',
  onAborted({bars, multiBar}) {
    for (const [id, bar] of bars) {
      bar.stop();
      bars.delete(id);
    }
    multiBar.stop();
  },
  onInstallBegin({bars, multiBar}, {pkgManagers}) {
    if (pkgManagers.length === 1) {
      return;
    }
    bars.set(
      'install',
      multiBar.create(pkgManagers.length, 0, {
        operation: 'installing',
        unit: 'package managers',
      }),
    );
  },

  onInstallFailed({bars, log, multiBar, opts}, {error: err}) {
    bars.get('install')?.stop();
    const text = err.format(opts.verbose);
    multiBar.log(`${text}\n`);
    log.push(text);
  },

  onInstallOk({bars}) {
    bars.get('install')?.stop();
  },

  onLingered(_, {directories: dirs}) {
    console.error(
      `${warning} Lingering ${plural('temp directory', dirs.length)}:\n`,
    );
    for (const dir of dirs) {
      console.error(yellow(dir));
    }
  },

  onLintBegin({bars, multiBar}, {pkgManagers}) {
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

  onLintFailed({bars}) {
    bars.get('lint')?.stop();
  },

  onLintOk({bars}) {
    bars.get('lint')?.stop();
  },

  onPackBegin({bars, multiBar}, {pkgManagers}) {
    if (pkgManagers.length === 1) {
      return;
    }
    bars.set(
      'pack',
      multiBar.create(pkgManagers.length, 0, {
        operation: 'packing',
        unit: 'package managers',
      }),
    );
  },
  onPackFailed({bars, log, opts}, {error}) {
    const text = error.format(opts.verbose);
    log.push(text);
    bars.get('pack')?.stop();
  },
  onPackOk({bars}) {
    bars.get('pack')?.stop();
  },
  onPkgInstallFailed({bars}, {pkgManager}) {
    const spec = formatPkgManager(pkgManager);
    bars.get(`install-${spec}`)?.increment();
  },
  onPkgInstallOk({bars}, {pkgManager}) {
    const spec = formatPkgManager(pkgManager);
    bars.get(`install-${spec}`)?.increment();
  },
  onPkgManagerInstallBegin(
    {bars, multiBar},
    {pkgManager, totalPkgManagers, totalPkgs},
  ) {
    const spec = formatPkgManager(pkgManager);
    const operation =
      totalPkgManagers === 1 ? 'installing' : `${spec} installing`;
    const bar = multiBar.create(totalPkgs, 0, {
      operation,
      unit: plural('package', totalPkgs),
    });
    bars.set(`install-${spec}`, bar);
  },
  onPkgManagerInstallFailed({bars}, {pkgManager}) {
    bars.get('install')?.increment();
    const spec = formatPkgManager(pkgManager);
    bars.get(`install-${spec}`)?.stop();
  },
  onPkgManagerInstallOk({bars}, {pkgManager}) {
    bars.get('install')?.increment();
    const spec = formatPkgManager(pkgManager);
    bars.get(`install-${spec}`)?.stop();
  },
  onPkgManagerLintBegin(
    {bars, multiBar},
    {pkgManager, totalPkgManagers, workspaceInfo},
  ) {
    const spec = formatPkgManager(pkgManager);
    const operation = totalPkgManagers === 1 ? 'linting' : `${spec} linting`;
    const bar = multiBar.create(workspaceInfo.length, 0, {
      operation,
      unit: plural('workspace', workspaceInfo.length),
    });
    bars.set(`lint-${spec}`, bar);
  },
  onPkgManagerLintFailed({bars}, {pkgManager}) {
    bars.get('lint')?.increment();
    const spec = formatPkgManager(pkgManager);
    bars.get(`lint-${spec}`)?.stop();
  },
  onPkgManagerLintOk({bars}, {pkgManager}) {
    bars.get('lint')?.increment();
    const spec = formatPkgManager(pkgManager);
    bars.get(`lint-${spec}`)?.stop();
  },
  onPkgManagerPackBegin(
    {bars, multiBar},
    {pkgManager, totalPkgManagers, workspaceInfo},
  ) {
    const spec = formatPkgManager(pkgManager);
    const operation = totalPkgManagers === 1 ? 'packing' : `${spec} packing`;
    const bar = multiBar.create(workspaceInfo.length, 0, {
      operation,
      unit: plural('workspace', workspaceInfo.length),
    });
    bars.set(`pack-${spec}`, bar);
  },
  onPkgManagerPackFailed({bars}, {pkgManager}) {
    bars.get('pack')?.increment();
    const spec = formatPkgManager(pkgManager);
    bars.get(`pack-${spec}`)?.stop();
  },
  onPkgManagerPackOk({bars}, {pkgManager}) {
    bars.get('pack')?.increment();
    const spec = formatPkgManager(pkgManager);
    bars.get(`pack-${spec}`)?.stop();
  },
  onPkgManagerRunScriptsBegin(
    {bars, multiBar},
    {pkgManager, totalPkgManagers, totalScripts, workspaceInfo},
  ) {
    if (workspaceInfo.length === 1) {
      return;
    }
    const spec = formatPkgManager(pkgManager);
    const unit = plural('script', totalScripts);
    const operation =
      totalPkgManagers === 1 ? `running ${unit}` : `${spec} running ${unit}`;
    const bar = multiBar.create(workspaceInfo.length, 0, {
      operation,
      unit: plural('workspace', workspaceInfo.length),
    });
    bars.set(`scripts-${spec}`, bar);
  },
  onPkgManagerRunScriptsFailed({bars}, {pkgManager}) {
    bars.get('scripts')?.increment();
    const spec = formatPkgManager(pkgManager);
    bars.get(`scripts-${spec}`)?.stop();
  },
  onPkgManagerRunScriptsOk({bars}, {pkgManager}) {
    bars.get('scripts')?.increment();
    const spec = formatPkgManager(pkgManager);
    bars.get(`scripts-${spec}`)?.stop();
  },
  onPkgPackFailed({bars}, {pkgManager}) {
    const spec = formatPkgManager(pkgManager);
    bars.get(`pack-${spec}`)?.increment();
  },
  onPkgPackOk({bars}, {pkgManager}) {
    const spec = formatPkgManager(pkgManager);
    bars.get(`pack-${spec}`)?.increment();
  },
  onRuleBegin({bars, multiBar}, {manifest, pkgManager, totalRules}) {
    const spec = formatPkgManager(pkgManager);
    const barId = `lint-${manifest.pkgName}-${spec}`;
    const bar =
      bars.get(barId) ??
      multiBar.create(totalRules, 0, {
        operation: `${spec} linting: ${magentaBright(manifest.pkgName)}`,
        unit: plural('rule', totalRules),
      });
    bars.set(barId, bar);
  },
  onRuleEnd({bars}, {manifest, pkgManager}) {
    const spec = formatPkgManager(pkgManager);
    const barId = `lint-${manifest.pkgName}-${spec}`;
    const bar = bars.get(barId);
    bar?.increment();
    if (barIsComplete(bar)) {
      const spec = formatPkgManager(pkgManager);
      bars.get(`lint-${spec}`)?.increment();
    }
  },
  onRunScriptBegin({bars, multiBar}, {manifest, pkgManager, totalScripts}) {
    const spec = formatPkgManager(pkgManager);
    const barId = `scripts-${manifest.pkgName}-${spec}`;
    const unit = plural('script', totalScripts);
    const bar =
      bars.get(barId) ??
      multiBar.create(totalScripts, 0, {
        operation: `${spec} running ${unit}: ${magentaBright(
          manifest.pkgName,
        )}`,
        unit,
      });
    bars.set(barId, bar);
  },
  onRunScriptEnd({bars}, {manifest, pkgManager}) {
    const spec = formatPkgManager(pkgManager);
    const barId = `scripts-${manifest.pkgName}-${spec}`;
    const bar = bars.get(barId);
    bar?.increment();
    if (barIsComplete(bar)) {
      const spec = formatPkgManager(pkgManager);
      bars.get(`scripts-${spec}`)?.increment();
    }
  },
  onRunScriptsBegin({bars, multiBar}, {pkgManagers, totalScripts}) {
    if (pkgManagers.length === 1) {
      return;
    }
    bars.set(
      'scripts',
      multiBar.create(pkgManagers.length, 0, {
        operation: `running ${plural('script', totalScripts)}`,
        unit: 'package managers',
      }),
    );
  },
  onRunScriptsFailed({bars}) {
    bars.get('scripts')?.stop();
  },
  onRunScriptsOk({bars}) {
    bars.get('scripts')?.stop();
  },
  onSmokeBegin({multiBar, pkgJson}, {pkgManagers, plugins}) {
    preface(pkgJson, plugins);

    if (pkgManagers.length === 1) {
      multiBar.log(`📦 Smokin' with ${formatPkgManager(pkgManagers[0]!)}\n`);
    }
  },
  onSmokeFailed(ctx) {
    for (const [id, bar] of ctx.bars) {
      bar.stop();
      ctx.bars.delete(id);
    }
    ctx.multiBar.stop();
    console.error('Maurice! 🤮');
  },
  onSmokeOk(ctx) {
    for (const [id, bar] of ctx.bars) {
      bar.stop();
      ctx.bars.delete(id);
    }
    ctx.multiBar.stop();
    console.error('\nLovey-dovey! 🥰');
  },
  setup(ctx) {
    ctx.log = [];
    ctx.bars = new Map();
    ctx.multiBar = new MultiBar(
      {
        format: ` ${grey('{bar}')} | {operation} | {value}/{total} {unit}`,
        fps: 30,
        stopOnComplete: true,
      },
      Presets.rect,
    );
    debug('Setup complete');
  },
};
