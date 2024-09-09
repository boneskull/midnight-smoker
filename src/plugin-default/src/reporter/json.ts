/**
 * Provides a "JSON" reporter for a `Smoker` instance.
 *
 * @packageDocumentation
 */

import jsonStringify from 'json-stable-stringify';
import {isString, partition} from 'lodash';
import {FAILED} from 'midnight-smoker/constants';
import {SmokerReferenceError} from 'midnight-smoker/error';
import {
  type EventData,
  type Events,
  type SmokeResults,
} from 'midnight-smoker/event';
import {type Reporter} from 'midnight-smoker/reporter';
import {stripAnsi} from 'midnight-smoker/util';

import {type SmokerJsonOutput, type SmokerStats} from '../json-types.js';

/**
 * Custom context for this reporter
 */
type JSONReporterContext = {
  lingering?: string[];
  output?: SmokerJsonOutput;
  stats: SmokerStats;
};

/**
 * Converts a "smoke end" event back into a {@link SmokeResults} object
 *
 * @param event One of the "smoke end" events
 * @returns Smoke results for inclusion in {@link SmokerJsonOutput}
 */
function smokeEndEventToResult(
  event: EventData<
    typeof Events.SmokeError | typeof Events.SmokeFailed | typeof Events.SmokeOk
  >,
): SmokeResults {
  const {resultType, type: _type, ...rest} = event;
  return {
    ...rest,
    type: resultType,
  } as SmokeResults; // loosey-goosey
}

export const JSONReporter: Reporter<JSONReporterContext> = {
  description: 'JSON reporter (for machines)',
  name: 'json',
  onBeforeExit(ctx) {
    // eslint-disable-next-line prefer-const
    let {lingering, output} = ctx;
    if (!output) {
      throw new SmokerReferenceError(
        'JSON listener has nothing to output! This is a bug.',
      );
    }
    output = {...output, lingering};
    console.log(
      jsonStringify(output, {
        replacer: (_, v: unknown) => (isString(v) ? stripAnsi(v) : v),
        space: 2,
      }),
    );
  },
  onInstallBegin(ctx, {pkgManagers, workspaceInfo}) {
    ctx.stats.totalPackages = workspaceInfo.length * pkgManagers.length;
    ctx.stats.totalPackageManagers = pkgManagers.length;
  },
  onLingered(ctx, {directories: dirs}) {
    ctx.lingering = dirs;
  },
  onLintBegin(ctx, {totalRules: total}) {
    ctx.stats.totalRules = total;
  },
  onLintFailed(ctx, {results}) {
    const [issues, passed] = partition(
      results,
      (result) => result.type === FAILED,
    );
    ctx.stats.failedRules = issues.length;
    ctx.stats.passedRules = passed.length;
  },
  onLintOk(ctx, {results}) {
    ctx.stats.passedRules = results.length;
    ctx.stats.failedRules = 0;
  },
  onRunScriptsBegin(ctx, {totalScripts: total}) {
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
  onSmokeError(ctx, results) {
    ctx.output = {
      lingering: ctx.lingering,
      results: smokeEndEventToResult(results),
      stats: ctx.stats,
    };
  },
  onSmokeFailed(ctx, results) {
    ctx.output = {
      results: smokeEndEventToResult(results),
      stats: ctx.stats,
    };
  },
  onSmokeOk(ctx, results) {
    ctx.output = {
      results: smokeEndEventToResult(results),
      stats: ctx.stats,
    };
  },
  setup(ctx) {
    ctx.stats = {
      failedRules: null,
      failedScripts: null,
      passedRules: null,
      passedScripts: null,
      totalPackageManagers: null,
      totalPackages: null,
      totalRules: null,
      totalScripts: null,
    };
  },
};
