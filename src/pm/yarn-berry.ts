import createDebug from 'debug';
import path from 'node:path';
import type {SemVer} from 'semver';
import {SmokerError} from '../error';
import type {InstallManifest, PackedPackage} from '../types';
import {readPackageJson} from '../util';
import type {CorepackExecutor} from './corepack';
import type {ExecError, ExecResult} from './executor';
import type {
  InstallResult,
  PackOpts,
  PackageManager,
  PackageManagerModule,
  PackageManagerOpts,
} from './pm';
import {YarnClassic} from './yarn-classic';

interface WorkspaceInfo {
  location: string;

  [key: string]: any;
}

export class YarnBerry extends YarnClassic implements PackageManager {
  protected readonly debug: createDebug.Debugger;

  public static readonly bin = 'yarn';

  constructor(executor: CorepackExecutor, opts: PackageManagerOpts = {}) {
    super(executor, opts);
    this.debug = createDebug(`midnight-smoker:pm:yarn2`);
  }

  public static accepts(semver: SemVer) {
    // return Boolean(semver.compare('2.0.0') - semver.compare('3.0.0'));
    return Boolean(~semver.compare('2.0.0'));
  }

  public static load(executor: CorepackExecutor, opts?: PackageManagerOpts) {
    return new YarnBerry(executor, opts);
  }

  public async install(manifest: InstallManifest): Promise<InstallResult> {
    const {packedPkgs, tarballRootDir} = manifest;
    if (!packedPkgs?.length) {
      throw new TypeError(
        '(install) Non-empty "packedPkgs" prop in "manifest" arg is required',
      );
    }

    /*

      ____ _  _ ____    ___  ____ ____ ____    _  _ ____ ___    ____ _ _  _ ___  _    _   _
      |  | |\ | |___    |  \ |  | |___ [__     |\ | |  |  |     [__  | |\/| |__] |     \_/
      |__| | \| |___    |__/ |__| |___ ___]    | \| |__|  |     ___] | |  | |    |___   |

!!!!!!!!!77!!!7777777777777777777777777777!~^^~!77!!!~~~!!77?5GGBBBBGPY?7777???J5GBBBG5J??J5YJ?JYJYP
!!!!!!!!!777!!777777777777777777777!!!777~^^~!!!7!!~^^^^^^^!?5GGBBBGG5?77777???J5GBBBBBP5J?????J5J?Y
!!!!!!!!!!!7777777777777777777777!^^~!77~^^^!7?7!~~^^^^^^^^^~JGGGGGPY?77???????J5GBBBBBBBPYJ???J5P5J
!!!!!!!!!77777777777777777777777!^:^~77!~~^^~~~!!~~^^^:^^^:::^75GGPY???JYYJ????JPGBBBBBBBBBP5J??J5P5
!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!77^::~!!^^~!~~~!777??77~^:::::..:^J5J?7?J5GPY????JPGBBBBBBBBBBBG5J???J
!!!!!~~~~~^^^^^^^^~~~~~^~~~^^~~^.:~!!~~7JYY55JJJ??Y5Y?!~^::.....:!?7?YPGGPY????JPGBBBBBBBBBGGPYJ????
~^^^^^^^^^^^^^^^^^^~~~^~~~~~~~^.:~!?JJ5GBB##BGP5Y??J5YJ?!~^....:~^!J5GGBGPJ????JPGBBBBBBBGP5J????JJJ
^^^^^^^^^^^^^~^^^^^^^^^^^^^^~~^:^!7J5PGBBBBBBBGP5YJ??YYYJ?!~...^~7~?GGBBGPJ????JPGBBBBBGP5J??JJJ???J
^^~^^^^^^^^^^^^^^^^^^^^^^^^^^^^:~7?Y5PGGBBBBBBBBG5JJ?7?J?JJ7:.::^!^:YBBBGPJ????J5GBBBGPYJJJJ5PGGPP5Y
^^^^^^^^^^^:^^^^^^^^^^^^^^^^^^^^~!?55PGGGBBGGGP5J??77?77?JJ?^:::^^^^!GBGGPJ????JPGBGP5JJJY5PGBBBBBBP
::::^^^^^^^^^^^~~~~~~~~~~^^~^~^^~!~?JYJ??JY5P5J7?JYJJJY555YJ!^:^^~^^~5GGG5J????J5GP5J??JYPGGBBBBBBBG
:::^^^^^^^^^^^^^^^^^^^^^^^^^~^~^^!^~?7???YY5GG5YPPPPGGGGP5Y?!~^~~~~^~?GGG5J?????YYJ??JJJJJY55PGGGGGG
::^^^^^^^^^^^^~^^^^^^^^^^^^^~~~~:~!^755PPPGPGGP55PPGGBGP5Y?77!~~~~!^^~YPG5J??????????JJ?JJJJJJJJJJYP
::^^^^^^^^^^^^^:::::::::::::::!!^!!~~?5GGGPPGBGPYJ?Y5P55YJJJ?7!~!!!~^^JYG5J?????????JYYY5PGGGGP5YJ?5
:^^^^^:::::...       ...^~^:::!7!!!~~!!YP5Y555Y7~~!7????J5JJ?!~^!!~~^!7J5J!!7?????7?JYY5GGGGGGP5YJJY
^^^:::..         ...~YY5GGP55YY?7!~~!~:^JYJJ7!~!77777!?YJYJ??~:^~!~^::^^.   ^777??7?YYYJ5GG5YJJ????Y
::..       .......:~PGGGGPPPPY55Y?7!~^^.:7?77J?YYY5555555J?!!^:^^~^:..:..  ... .^~!?JJ?!7J?7!77?JJYY
.      ...........:YPPY7~~!77~7!??7YY!^:.:^!7YYYYYYYYY55Y?!^:::..:........    ..:^~~^!~~^~~~!7?YPGG5
     ..:........::?PPY7~~~~~:.::^^!YY7!^:::^~!?JJJ5Y5YJ?7~:::^^^::......    ..:^~!~^^^^^^^^^^^~!?JYJ
   .......::.....^PPPY?!!!!~~^::^!YYY?!^::::::^~77777!~^:::^^~!!~^^^:.  ....:^~!!~^~^^^^^:::^:::::^^
  .......:......~~5GP5?!!77JY5YJYPPPY7^::.....::..:...  :^~~!!^::!!~^::...^~~!!~^~~~~~~^^^:^:^~^:::^
 .......:...:...~75GGPY7!?Y5PGGGP55J~:... .. .~^^:^~::..:~^:^^:^^7!~^^~::~77!!~^^~!~~~~^^^^^.^~~^::^
................^7YGGP5J7?5PGGP5?!~:.... .:.. :^::^^^:^^^^::~~~~!!^:::^~!7!!~~~^^~~~~~~~^^~~.^~~^^^^
................^~75GPP5J?YPPPY7^:.......::....:::^^~^^^~JJ!~!!~~^^~~^~~!!~~~~~:^~~~~~~~^^~!.:~!~^^^
...............:~^~!?J?J??7?J7~:..:....  .. .. ..::^~~^~^!?7!!~:~^~7!!!!!~~~~~::^~~~~~~~~~~!::!!~^^^
..............^!~~~~!~~~^^^::::::... .   .  .. .::^~~!~~~~~!!~::~^!7!!!!~~!~~~::^~~~!!~!!~~7~:!~^~~^
 ............:!!~~^~~7~~^^::.... .:.     .. .: .::^~~7!~~~?J?~::~~!7!!!!~!~~~^::^~~!!!!!!!!7!:~^~!~~

    .._   _ ____ ____ _  _    ____ ___  ___  ..   ____    ___  ____ ____ _  _ ____ ____ ____
    '' \_/  |__| |__/ |\ |    |__| |  \ |  \ ''   |__|    |__] |__| |    |_/  |__| | __ |___
        |   |  | |  \ | \|    |  | |__/ |__/      |  |    |    |  | |___ | \_ |  | |__] |___

*/
    // NO PACKAGE.JSON? NO LOCKFILE? YOU SHALL NOT PASS
    await this.executor.exec(['init', '--private'], {cwd: tarballRootDir});
    // this tells it to use "ol' reliable" instead of the "pnp linker"
    await this.executor.exec(['config', 'set', 'nodeLinker', 'node-modules'], {
      cwd: tarballRootDir,
    });

    const additionalDeps = manifest.additionalDeps ?? [];

    const installArgs = [
      'add',
      ...packedPkgs.map(({tarballFilepath}) => tarballFilepath),
      ...additionalDeps,
    ];

    let installResult: InstallResult;
    try {
      installResult = await this.executor.exec(installArgs, {
        cwd: tarballRootDir,
      });
    } catch (err) {
      throw new SmokerError(
        `(install) ${YarnBerry.bin} failed to spawn: ${
          (err as ExecError).message
        }`,
      );
    }
    if (installResult.exitCode) {
      this.debug('(install) Failed: %O', installResult);
      throw new SmokerError(
        `(install) Installation failed with exit code ${installResult.exitCode}: ${installResult.stderr}`,
      );
    }

    this.debug('(install) Installed %d packages', packedPkgs.length);

    return installResult;
  }

  public async pack(
    dest: string,
    opts: PackOpts = {},
  ): Promise<InstallManifest> {
    type PackCommand = {
      command: string[];
      cwd: string;
      tarball: string;
      pkgName: string;
    };

    const seenSlugs = new Set();
    const computeSlug = (info: WorkspaceInfo) => {
      let slug = path.basename(info.location);
      for (let i = 0; i++; seenSlugs.has(slug)) {
        slug = `${slug}-${i}`;
      }
      seenSlugs.add(slug);
      return slug;
    };

    const finalizePackCommand = (
      info: WorkspaceInfo,
      pkgName: string,
    ): PackCommand => {
      const slug = computeSlug(info);
      const tarball = path.join(dest, `${slug}.tgz`);
      const cwd = path.isAbsolute(info.location)
        ? info.location
        : path.join(process.cwd(), info.location);
      return {
        command: [...basePackArgs, `--filename=${tarball}`],
        cwd,
        tarball,
        pkgName,
      };
    };

    const getWorkspaceRootPackageName = async () => {
      const {packageJson} = await readPackageJson({
        cwd: process.cwd(),
        strict: true,
      });
      const {name = path.dirname(process.cwd())} = packageJson;
      return name;
    };

    if (!dest) {
      throw new TypeError('(pack) "dest" arg is required');
    }

    const commands: PackCommand[] = [];

    const basePackArgs = ['pack', '--json'];

    const shouldUseWorkspaces = Boolean(
      opts.allWorkspaces || opts.workspaces?.length,
    );

    if (shouldUseWorkspaces) {
      let workspaceInfo: Record<string, WorkspaceInfo>;
      try {
        const {stdout} = await this.executor.exec([
          'workspaces',
          'list',
          '--json',
        ]);
        const lines = stdout.split('\r?\n');
        workspaceInfo = lines.reduce(
          (acc, line) => {
            const {name, location} = JSON.parse(line);
            return {...acc, [name]: {location}};
          },
          {} as Record<string, WorkspaceInfo>,
        );
      } catch (err) {
        throw new SmokerError(`(pack) Unable to read workspace information`);
      }

      if (opts.workspaces?.length) {
        commands.push(
          ...opts.workspaces.map((workspace) => {
            let info: WorkspaceInfo | undefined = workspaceInfo[workspace];
            let name: string;
            if (!info) {
              [name, info] = Object.entries(workspaceInfo).find(
                ([, info]) => info.location === workspace,
              );
              if (!info) {
                throw new SmokerError(
                  `(pack) Unknown workspace "${workspace}"`,
                );
              }
            } else {
              name = workspace;
            }
            return finalizePackCommand(info, name);
          }),
        );
      } else {
        // allWorkspaces must be true
        commands.push(
          ...Object.entries(workspaceInfo).map(([name, info]) =>
            finalizePackCommand(info, name),
          ),
        );
        if (opts.includeWorkspaceRoot) {
          commands.push(
            finalizePackCommand(
              {location: process.cwd()},
              await getWorkspaceRootPackageName(),
            ),
          );
        }
      }
    } else {
      commands.push(
        finalizePackCommand(
          {location: process.cwd()},
          await getWorkspaceRootPackageName(),
        ),
      );
    }

    this.debug(commands);

    const packedPkgs: PackedPackage[] = [];

    for await (const {command, cwd, tarball, pkgName} of commands) {
      let result: ExecResult;
      try {
        result = await this.executor.exec(command, {cwd});
      } catch (err) {
        throw new SmokerError(
          `(pack) ${YarnBerry.bin} failed to pack: ${(err as Error).message}`,
        );
      }

      if (result.exitCode) {
        this.debug('(pack) Failed: %O', result);
        throw new SmokerError(
          `(pack) ${YarnBerry.bin} failed to pack: ${result.stderr}`,
        );
      }

      packedPkgs.push({
        tarballFilepath: tarball,
        installPath: path.join(dest, 'node_modules', pkgName),
        pkgName,
      });
    }

    this.debug('(pack) Packed %d packages', packedPkgs.length);

    return {packedPkgs, tarballRootDir: dest};
  }
}

export default YarnBerry satisfies PackageManagerModule;
