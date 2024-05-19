import type {SmokeResults} from 'midnight-smoker';

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
