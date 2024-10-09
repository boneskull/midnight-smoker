import {type SmokeResults} from 'midnight-smoker/event';

/**
 * The shape of this reporter's JSON output
 */
export type SmokerJsonOutput = {
  /**
   * Lingering temp directories, if any
   */
  lingering?: string[];

  results: SmokeResults;

  /**
   * Stats gathered
   */
  stats: SmokerStats;
};

/**
 * Stats gathered during the run.
 *
 * Anything that is `null` means that the value was not applicable to the run.
 */

export interface SmokerStats {
  /**
   * Total count of failed rules
   */
  failedRules: null | number;

  /**
   * Total count of failed custom scripts
   */
  failedScripts: null | number;

  /**
   * Total count of passed rules
   */
  passedRules: null | number;

  /**
   * Total count of passed custom scripts
   */
  passedScripts: null | number;

  /**
   * Total count of discrete package managers
   */
  totalPackageManagers: null | number;

  /**
   * Total unique packages processed
   */
  totalPackages: null | number;

  /**
   * Total count of rules run
   */
  totalRules: null | number;

  /**
   * Total count of custom scripts
   */
  totalScripts: null | number;
}
