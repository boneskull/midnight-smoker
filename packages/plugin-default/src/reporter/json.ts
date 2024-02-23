/**
 * Provides a "JSON" reporter for a `Smoker` instance.
 *
 * @packageDocumentation
 */

import jsonStringify from 'json-stable-stringify';
import {type SmokeResults} from 'midnight-smoker';
import * as Errors from 'midnight-smoker/error';
import type * as Reporter from 'midnight-smoker/reporter';

export type JSONReporterContext = {
  stats: SmokerStats;
  lingering?: string[];
  output?: SmokerJsonOutput;
};

export const JSONReporter: Reporter.ReporterDef<JSONReporterContext> = {
  name: 'json',
  description: 'JSON reporter (for machines)',
  setup(ctx) {
    ctx.stats = {
      totalPackages: null,
      totalPackageManagers: null,
      totalScripts: null,
      failedScripts: null,
      passedScripts: null,
      totalChecks: null,
      failedChecks: null,
      passedChecks: null,
    };
  },
  onInstallBegin(ctx, {uniquePkgs, pkgManagers}) {
    ctx.stats.totalPackages = uniquePkgs.length;
    ctx.stats.totalPackageManagers = pkgManagers.length;
  },
  onRunScriptsBegin(ctx, {total}) {
    ctx.stats.totalScripts = total;
  },
  onRunScriptsFailed(ctx, {failed, passed}) {
    ctx.stats.failedScripts = failed;
    ctx.stats.passedScripts = passed;
  },
  onRunScriptsOk(ctx, {passed}) {
    ctx.stats.passedScripts = passed;
    ctx.stats.failedScripts = 0;
  },
  onRunRulesBegin(ctx, {total}) {
    ctx.stats.totalChecks = total;
  },
  onRunRulesFailed(ctx, {failed, passed}) {
    ctx.stats.failedChecks = failed.length;
    ctx.stats.passedChecks = passed.length;
  },
  onRunRulesOk(ctx, {passed}) {
    ctx.stats.passedChecks = passed.length;
    ctx.stats.failedChecks = 0;
  },
  onLingered(ctx, {directories: dirs}) {
    ctx.lingering = dirs;
  },
  onSmokeOk(ctx, results) {
    ctx.output = {
      results,
      stats: ctx.stats,
      lingering: ctx.lingering,
    };
  },
  onSmokeFailed(ctx, {error}) {
    ctx.output = {
      error,
      stats: ctx.stats,
      lingering: ctx.lingering,
    };
  },
  onUnknownError(ctx, {error}) {
    ctx.output = {
      error: `${error}`,
      stats: ctx.stats,
      lingering: ctx.lingering,
    };
  },
  onBeforeExit(ctx) {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (!ctx.output) {
      process.exitCode = 1;
      throw new Errors.SmokerReferenceError(
        'JSON listener has nothing to output! This is a bug.',
      );
    }
    console.log(jsonStringify(ctx.output, {space: 2}));
  },
};

export interface SmokerJsonResults {
  stats: SmokerStats;
  lingering?: string[];
}

export interface SmokerJsonSuccess extends SmokerJsonResults {
  results: SmokeResults;
}

export interface SmokerJsonFailure extends SmokerJsonResults {
  error: object | string;
}

export type SmokerJsonOutput = SmokerJsonSuccess | SmokerJsonFailure;

/**
 * Stats gathered during the run
 */
export interface SmokerStats {
  totalPackages: number | null;
  totalPackageManagers: number | null;
  totalScripts: number | null;
  failedScripts: number | null;
  passedScripts: number | null;
  totalChecks: number | null;
  failedChecks: number | null;
  passedChecks: number | null;
}
