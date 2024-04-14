import {type InstallError, type PackError, type PackParseError} from '#error';
import {type SomePkgManager} from '#pkg-manager/pkg-manager';
import {filter, map, memoize, uniq} from 'lodash';
import {
  type InstallEventBaseData,
  type InstallManifest,
  type PackBeginEventData,
  type RunScriptResult,
} from '../component';
import {
  SmokerEvent,
  type RunScriptsEndEventData,
  type RunScriptsEventData,
  type SmokerEventBus,
  type SmokerEvents,
} from '../event';

export type InstallBeginData = DataWithPkgManagers;
export type InstallOkData = DataWithPkgManagers;
export type PackBeginData = DataWithPkgManagers;
export type PackOkData = DataWithPkgManagers;
export type PkgManagerInstallOkData = PkgManagerInstallBeginData;
export type RunScriptsFailedData = RunScriptsOkData;

export interface DataWithError<T extends Error> {
  error: T;
}

export interface DataWithPkgManager {
  pkgManager: SomePkgManager;
}

export interface DataWithPkgManagers {
  pkgManagers: SomePkgManager[];
}

export interface InstallFailedData
  extends InstallOkData,
    DataWithError<InstallError> {}

export interface PackFailedData
  extends DataWithPkgManagers,
    DataWithError<PackError | PackParseError> {}

export interface PkgManagerInstallBeginData
  extends DataWithPkgManager,
    DataWithPkgManagers {
  current: number;
}

export interface PkgManagerInstallFailedData
  extends PkgManagerInstallBeginData,
    DataWithError<InstallError> {}

export interface RunScriptsBeginData extends DataWithPkgManagers {
  scripts: string[];
}

export interface RunScriptsOkData extends RunScriptsBeginData {
  results: RunScriptResult[];
}

export class PkgManagerControllerEventHelper {
  private static allManifests = memoize((pkgManagers: SomePkgManager[]) =>
    pkgManagers.flatMap(({installManifests}) => installManifests),
  );

  /**
   * It's a fair amount of work to mash the data into a format more suitable for
   * display.
   *
   * @param pkgManagerInstallManifests What to install and with what package
   *   manager. Will include additional depsz
   * @returns Something to be emitted
   * @internal
   */
  public static buildInstallEventData = memoize(
    (pkgManagers: SomePkgManager[]): Readonly<InstallEventBaseData> => {
      const manifests =
        PkgManagerControllerEventHelper.allManifests(pkgManagers);
      const specs =
        PkgManagerControllerEventHelper.pkgManagerSpecs(pkgManagers);
      const additionalDeps = uniq(
        map(filter(manifests, {isAdditional: true}), 'pkgName'),
      );
      const uniquePkgs = PkgManagerControllerEventHelper.uniquePkgs(manifests);

      return Object.freeze({
        uniquePkgs,
        pkgManagers: specs,
        additionalDeps,
        manifests,
        total: pkgManagers.length * manifests.length,
      });
    },
  );

  /**
   * Builds the event data for the `PackBegin` event.
   *
   * @param pkgManagers - An array of package managers.
   * @returns The event data object.
   * @internal
   */
  public static buildPackBeginEventData = memoize(
    (pkgManagers: SomePkgManager[]): Readonly<PackBeginEventData> => {
      const manifests =
        PkgManagerControllerEventHelper.allManifests(pkgManagers);

      const uniquePkgs = PkgManagerControllerEventHelper.uniquePkgs(manifests);

      return Object.freeze({
        uniquePkgs,
        pkgManagers:
          PkgManagerControllerEventHelper.pkgManagerSpecs(pkgManagers),
      });
    },
  );

  /**
   * Builds the event data for the `RunScriptsBegin` event.
   *
   * @param runScriptManifests - An array of package manager run manifests.
   * @returns The event data object containing the package manager run manifests
   *   and the total number of scripts.
   * @internal
   */
  private static buildRunScriptsBeginEventData = memoize(
    (scripts: string[], pkgManagers: SomePkgManager[]): RunScriptsEventData => {
      let total = 0;

      const manifest = Object.fromEntries(
        pkgManagers.map((pkgManager) => {
          const runScriptManifests =
            pkgManager.buildRunScriptManifests(scripts);
          total += runScriptManifests.length;
          return [`${pkgManager.spec}`, runScriptManifests];
        }),
      );

      // @ts-expect-error stuff
      return {manifests: manifest, totalUniqueScripts: total};
    },
    (scripts, pkgManagers) => {
      return `${scripts.sort().join(',')}-${pkgManagers
        .map((pkgManager) => `${pkgManager.spec}`)
        .sort()
        .join(',')}`;
    },
  );

  /**
   * Builds the event data for the `RunScriptsEnd` event.
   *
   * @param beginEventData - The event data from the `RunScriptsBegin` event.
   * @param results - The results of running the scripts.
   * @returns The event data for the `RunScriptsEnd` event.
   */
  private static buildRunScriptsEndEventData = (
    scripts: string[],
    pkgManagers: SomePkgManager[],
    results: RunScriptResult[],
  ): RunScriptsEndEventData => {
    const beginEventData =
      PkgManagerControllerEventHelper.buildRunScriptsBeginEventData(
        scripts,
        pkgManagers,
      );
    const failed = results.filter((result) => 'error' in result).length;
    const skipped = results.filter((result) => result.skipped).length;
    const passed = results.length - failed - skipped;

    return {...beginEventData, results, failed, passed, skipped};
  };
  private static pkgManagerSpecs = memoize((pkgManagers: SomePkgManager[]) =>
    pkgManagers.map(({spec}) => spec.toJSON()),
  );
  private static uniquePkgs = memoize((manifests: InstallManifest[]) => {
    return uniq(manifests.flatMap(({pkgName}) => pkgName));
  });

  constructor(private readonly bus: SmokerEventBus) {}

  public async emit<K extends keyof SmokerEvents>(
    event: K,
    data: SmokerEvents[K],
  ): Promise<void> {
    await this.bus.emit(event, data);
  }

  public async installBegin({pkgManagers}: InstallBeginData): Promise<void> {
    await this.bus.emit(SmokerEvent.InstallBegin, {
      ...PkgManagerControllerEventHelper.buildInstallEventData(pkgManagers),
    });
  }

  public async installFailed({
    pkgManagers,
    error,
  }: InstallFailedData): Promise<void> {
    await this.bus.emit(SmokerEvent.InstallFailed, {
      ...PkgManagerControllerEventHelper.buildInstallEventData(pkgManagers),
      error,
    });
  }

  public async installOk({pkgManagers}: InstallOkData): Promise<void> {
    await this.bus.emit(SmokerEvent.InstallOk, {
      ...PkgManagerControllerEventHelper.buildInstallEventData(pkgManagers),
    });
  }

  public async packBegin({pkgManagers}: PackBeginData): Promise<void> {
    await this.bus.emit(SmokerEvent.PackBegin, {
      ...PkgManagerControllerEventHelper.buildPackBeginEventData(pkgManagers),
    });
  }

  public async packFailed({pkgManagers, error}: PackFailedData): Promise<void> {
    await this.bus.emit(SmokerEvent.PackFailed, {
      ...PkgManagerControllerEventHelper.buildPackBeginEventData(pkgManagers),
      error,
    });
  }

  public async packOk({pkgManagers}: PackOkData): Promise<void> {
    await this.bus.emit(SmokerEvent.PackOk, {
      ...PkgManagerControllerEventHelper.buildInstallEventData(pkgManagers),
    });
  }

  public async pkgManagerInstallBegin({
    pkgManagers,
    pkgManager,
    current,
  }: PkgManagerInstallBeginData): Promise<void> {
    const {total} =
      PkgManagerControllerEventHelper.buildInstallEventData(pkgManagers);
    // await this.bus.emit(SmokerEvent.PkgManagerInstallBegin, {
    //   total,
    //   current,
    //   pkgManager: pkgManager.spec.toJSON(),
    // });
  }

  public async pkgManagerInstallFailed({
    pkgManagers,
    pkgManager,
    current,
    error,
  }: PkgManagerInstallFailedData): Promise<void> {
    const {total} =
      PkgManagerControllerEventHelper.buildInstallEventData(pkgManagers);
    // await this.bus.emit(SmokerEvent.PkgManagerInstallFailed, {
    //   total,
    //   current,
    //   pkgManager: pkgManager.spec.toJSON(),
    //   error,
    // });
  }

  public async pkgManagerInstallOk({
    pkgManagers,
    pkgManager,
    current,
  }: PkgManagerInstallOkData): Promise<void> {
    const {total} =
      PkgManagerControllerEventHelper.buildInstallEventData(pkgManagers);
    // await this.bus.emit(SmokerEvent.PkgManagerInstallOk, {
    //   total,
    //   current,
    //   pkgManager: pkgManager.spec.toJSON(),
    // });
  }

  public async runScriptsBegin({pkgManagers, scripts}: RunScriptsBeginData) {
    await this.bus.emit(SmokerEvent.RunScriptsBegin, {
      ...PkgManagerControllerEventHelper.buildRunScriptsBeginEventData(
        scripts,
        pkgManagers,
      ),
    });
  }

  public async runScriptsFailed({
    pkgManagers,
    scripts,
    results,
  }: RunScriptsFailedData) {
    await this.bus.emit(SmokerEvent.RunScriptsFailed, {
      ...PkgManagerControllerEventHelper.buildRunScriptsEndEventData(
        scripts,
        pkgManagers,
        results,
      ),
    });
  }

  public async runScriptsOk({pkgManagers, scripts, results}: RunScriptsOkData) {
    await this.bus.emit(SmokerEvent.RunScriptsOk, {
      ...PkgManagerControllerEventHelper.buildRunScriptsEndEventData(
        scripts,
        pkgManagers,
        results,
      ),
    });
  }
}
