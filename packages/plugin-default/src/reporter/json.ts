/**
 * Provides a "JSON" reporter for a `Smoker` instance.
 *
 * @packageDocumentation
 */

import jsonStringify from 'json-stable-stringify';
import {partition} from 'lodash';
import {type SmokeResults} from 'midnight-smoker';
import {SmokerReferenceError} from 'midnight-smoker/error';
import {type ReporterDef} from 'midnight-smoker/reporter';

/**
 * Custom context for this reporter
 */
type JSONReporterContext = {
  stats: SmokerStats;
  lingering?: string[];
  output?: SmokerJsonOutput;
};

export const JSONReporter: ReporterDef<JSONReporterContext> = {
  name: 'json',
  description: 'JSON reporter (for machines)',
  setup(ctx) {
    ctx.stats = {
      totalPackages: null,
      totalPackageManagers: null,
      totalScripts: null,
      failedScripts: null,
      passedScripts: null,
      totalRules: null,
      failedRules: null,
      passedRules: null,
    };
  },
  onInstallBegin(ctx, {uniquePkgs, pkgManagers}) {
    ctx.stats.totalPackages = uniquePkgs.length;
    ctx.stats.totalPackageManagers = pkgManagers.length;
  },
  onRunScriptsBegin(ctx, {totalUniqueScripts: total}) {
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
  onLintBegin(ctx, {totalRules: total}) {
    ctx.stats.totalRules = total;
  },
  onLintFailed(ctx, {results}) {
    const [issues, passed] = partition(
      results,
      (result) => result.type === 'FAILED',
    );
    ctx.stats.failedRules = issues.length;
    ctx.stats.passedRules = passed.length;
  },
  onLintOk(ctx, {results}) {
    ctx.stats.passedRules = results.length;
    ctx.stats.failedRules = 0;
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
      error,
      stats: ctx.stats,
      lingering: ctx.lingering,
    };
  },
  onBeforeExit(ctx) {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (!ctx.output) {
      process.exitCode = 1;
      throw new SmokerReferenceError(
        'JSON listener has nothing to output! This is a bug.',
      );
    }
    console.log(jsonStringify(ctx.output, {space: 2}));
  },
};

/**
 * Common JSON output for a successful or failed run
 */
export interface BaseSmokerJson {
  /**
   * Stats gathered
   */
  stats: SmokerStats;

  /**
   * Lingering temp directories, if any
   */
  lingering?: string[];
}

/**
 * JSON output for a successful run
 */

export interface SmokerJsonSuccess extends BaseSmokerJson {
  results: SmokeResults;
}

/**
 * JSON output for a failed run
 */
export interface SmokerJsonFailure extends BaseSmokerJson {
  error: object | string;
}

/**
 * The shape of this reporter's JSON output
 */
export type SmokerJsonOutput = SmokerJsonSuccess | SmokerJsonFailure;

/**
 * Stats gathered during the run.
 *
 * Anything that is `null` means that the value was not applicable to the run.
 */
export interface SmokerStats {
  /**
   * Total unique packages processed
   */
  totalPackages: number | null;

  /**
   * Total count of discrete package managers
   */
  totalPackageManagers: number | null;

  /**
   * Total count of custom scripts
   */
  totalScripts: number | null;

  /**
   * Total count of failed custom scripts
   */
  failedScripts: number | null;

  /**
   * Total count of passed custom scripts
   */
  passedScripts: number | null;

  /**
   * Total count of rules run
   */
  totalRules: number | null;

  /**
   * Total count of failed rules
   */
  failedRules: number | null;

  /**
   * Total count of passed rules
   */
  passedRules: number | null;
}
