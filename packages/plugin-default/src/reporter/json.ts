/**
 * Provides a "JSON" reporter for a `Smoker` instance.
 *
 * @packageDocumentation
 */

import jsonStringify from 'json-stable-stringify';
import {Errors, Event, Reporter} from 'midnight-smoker/plugin';

export const JSONReporter: Reporter.ReporterDef = {
  name: 'json',
  description: 'JSON reporter (for machines)',
  reporter: ({emitter, console}) => {
    const stats: SmokerStats = {
      totalPackages: null,
      totalPackageManagers: null,
      totalScripts: null,
      failedScripts: null,
      passedScripts: null,
      totalChecks: null,
      failedChecks: null,
      passedChecks: null,
    };
    const {SmokerEvent} = Event;

    /**
     * List of "lingering" temp directories, if any
     */
    let lingering: string[] | undefined;

    /**
     * Final output
     */
    let output: SmokerJsonOutput;

    emitter
      .once(
        SmokerEvent.InstallBegin,
        ({uniquePkgs, pkgManagerSpecs: packageManagers}) => {
          stats.totalPackages = uniquePkgs.length;
          stats.totalPackageManagers = packageManagers.length;
        },
      )
      .once(SmokerEvent.RunScriptsBegin, ({total}) => {
        stats.totalScripts = total;
      })
      .once(SmokerEvent.RunScriptsFailed, ({failed, passed}) => {
        stats.failedScripts = failed;
        stats.passedScripts = passed;
      })
      .once(SmokerEvent.RunScriptsOk, ({passed}) => {
        stats.passedScripts = passed;
        stats.failedScripts = 0;
      })
      .once(SmokerEvent.RunRulesBegin, ({total}) => {
        stats.totalChecks = total;
      })
      .once(SmokerEvent.RunRulesFailed, ({failed, passed}) => {
        stats.failedChecks = failed.length;
        stats.passedChecks = passed.length;
      })
      .once(SmokerEvent.RunRulesOk, ({passed}) => {
        stats.passedChecks = passed.length;
        stats.failedChecks = 0;
      })
      .once(SmokerEvent.Lingered, (dirs) => {
        lingering = dirs;
      })
      .once(SmokerEvent.SmokeOk, (results) => {
        output = {
          results,
          lingering,
          stats,
        };
      })
      .once(SmokerEvent.SmokeFailed, (error) => {
        output = {
          error,
          lingering,
          stats,
        };
      })
      .once(SmokerEvent.End, () => {
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        if (!output) {
          process.exitCode = 1;
          throw new Errors.SmokerReferenceError(
            'No output generated in JSON listener. Why?',
          );
        }
        console.log(jsonStringify(output, {space: 2}));
      });
  },
};

export interface SmokerJsonResults {
  stats: SmokerStats;
  lingering?: string[];
}

export interface SmokerJsonSuccess extends SmokerJsonResults {
  results: Event.SmokeResults;
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
