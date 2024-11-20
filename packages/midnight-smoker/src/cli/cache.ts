/**
 * Enables the compile cache, if supported
 *
 * @privateRemarks
 * TODO: Remove types when landed in `@types/node`
 * @packageDocumentation
 * @see {@link https://nodejs.org/api/module.html#moduleenablecompilecachecachedir}
 */

import * as nodeModule from 'module';

export const CompileCacheStatus = {
  AlreadyEnabled: 2,
  Disabled: 3,
  Enabled: 1,
  Failed: 0,
} as const;

export type CompileCacheStatusFailed = typeof CompileCacheStatus.Failed;

export type CompileCacheStatusEnabled = typeof CompileCacheStatus.Enabled;

export type CompileCacheStatusAlreadyEnabled =
  typeof CompileCacheStatus.AlreadyEnabled;

export type CompileCacheStatusDisabled = typeof CompileCacheStatus.Disabled;

export interface CompileCacheResult {
  directory?: string;
  message?: string;
  status:
    | CompileCacheStatusAlreadyEnabled
    | CompileCacheStatusDisabled
    | CompileCacheStatusEnabled
    | CompileCacheStatusFailed;
}

export function enableCompileCache(): CompileCacheResult | undefined {
  // @ts-expect-error - TS doesn't know about this
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
  const cacheResult = nodeModule.enableCompileCache?.() as
    | CompileCacheResult
    | undefined;

  return cacheResult;
}

export function logCompileCacheResult(
  log: (...args: any[]) => void,
  result: CompileCacheResult,
): void {
  switch (result.status) {
    case CompileCacheStatus.AlreadyEnabled:
      log(`Compile cache already enabled; directory: ${result.directory}`);
      break;
    case CompileCacheStatus.Disabled:
      log('Compile cache disabled (unexpectedly)');
      break;
    case CompileCacheStatus.Enabled:
      log(`Compile cache enabled; directory: ${result.directory}`);
      break;
    case CompileCacheStatus.Failed:
      log(`Failed to enable compile cache: ${result.message}`);
      break;
    default:
      log('Unknown compile cache result: %O', result);
  }
}
