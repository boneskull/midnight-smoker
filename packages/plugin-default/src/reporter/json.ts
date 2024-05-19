/**
 * Provides a "JSON" reporter for a `Smoker` instance.
 *
 * @packageDocumentation
 */

import jsonStringify from 'json-stable-stringify';
import {partition} from 'lodash';
import {SmokerReferenceError} from 'midnight-smoker/error';
import {type ReporterDef} from 'midnight-smoker/reporter';
import {type SmokerJsonOutput, type SmokerStats} from '../json-types';

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
