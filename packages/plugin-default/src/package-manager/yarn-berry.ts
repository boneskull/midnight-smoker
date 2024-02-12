import Debug from 'debug';
import {
  ExecError,
  InstallError,
  PackError,
  RunScriptError,
  ScriptFailedError,
} from 'midnight-smoker/error';
import {type ExecResult, type Executor} from 'midnight-smoker/executor';
import {
  normalizeVersion,
  type InstallManifest,
  type PackOptions,
  type PkgManager,
  type PkgManagerDef,
  type PkgManagerOpts,
  type PkgManagerSpec,
} from 'midnight-smoker/pkg-manager';
import type {PluginHelpers} from 'midnight-smoker/plugin';
import {Helpers} from 'midnight-smoker/plugin';
import {
  type RunScriptManifest,
  type RunScriptResult,
} from 'midnight-smoker/script-runner';
import path from 'node:path';
import {Range} from 'semver';
import {yarnVersionData} from './data';
import {YarnClassic} from './yarn-classic';
interface WorkspaceInfo {
  location: string;

  [key: string]: any;
}

export class YarnBerry extends YarnClassic implements PkgManager {
  protected readonly debug: Debug.Debugger;

  public static readonly supportedVersionRange = new Range('>=2.0.0');

  public readonly name = 'yarn';

  constructor(
    spec: PkgManagerSpec,
    executor: Executor,
    tmpdir: string,
    helpers: PluginHelpers,
    opts: PkgManagerOpts = {},
  ) {
    super(spec, executor, tmpdir, helpers, opts);
    this.debug = Debug(`midnight-smoker:pm:yarn2`);
  }

  public static accepts(value: string) {
    const version = normalizeVersion(yarnVersionData, value);
    if (version && YarnBerry.supportedVersionRange.test(version)) {
      return version;
    }
  }

  public static async create(
    this: void,
    spec: PkgManagerSpec,
    executor: Executor,
    helpers: PluginHelpers,
    opts?: PkgManagerOpts,
  ) {
    const tempdir = await Helpers.createTempDir();
    return new YarnBerry(spec, executor, tempdir, helpers, opts);
  }

  public async install(
    installManifests: InstallManifest[],
  ): Promise<ExecResult> {
    if (!installManifests.length) {
      throw new TypeError('installManifests must be a non-empty array');
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
    await this.executor(
      this.spec,
      ['init', '--private'],
      {},
      {
        cwd: this.tmpdir,
      },
    );
    // this tells it to use "ol' reliable" instead of the "pnp linker"
    await this.executor(
      this.spec,
      ['config', 'set', 'nodeLinker', 'node-modules'],
      {},
      {
        cwd: this.tmpdir,
      },
    );

    // const additionalDeps = manifest.additionalDeps ?? [];

    const installSpecs = installManifests.map(({spec}) => spec);
    const installArgs = ['add', ...installSpecs];

    let installResult: ExecResult;
    try {
      installResult = await this.executor(
        this.spec,
        installArgs,
        {},
        {
          cwd: this.tmpdir,
        },
      );
    } catch (err) {
      if (err instanceof ExecError) {
        throw new InstallError(
          err.message,
          `${this.spec}`,
          installSpecs,
          this.tmpdir,
          {
            error: err,
            exitCode: err.exitCode,
            output: err.all || err.stderr || err.stdout,
          },
        );
      }
      throw err;
    }

    this.debug('(install) Installed %d packages', installManifests.length);

    return installResult;
  }

  public async pack(opts: PackOptions = {}): Promise<InstallManifest[]> {
    interface PackCommand {
      command: string[];
      cwd: string;
      tarball: string;
      pkgName: string;
    }

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
      const tarball = path.join(this.tmpdir, `${slug}.tgz`);
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

    const getWorkspaceRootPackageName = async (): Promise<string> => {
      const {packageJson} = await Helpers.readPackageJson({
        cwd: process.cwd(),
        strict: true,
      });
      const {name = path.dirname(process.cwd())} = packageJson;
      return name;
    };

    const commands: PackCommand[] = [];

    const basePackArgs = ['pack', '--json'];

    const shouldUseWorkspaces = Boolean(
      opts.allWorkspaces || opts.workspaces?.length,
    );

    if (shouldUseWorkspaces) {
      let workspaceInfo: Record<string, WorkspaceInfo>;
      try {
        const {stdout} = await this.executor(
          this.spec,
          ['workspaces', 'list', '--json'],
          {},
          {},
        );
        const lines = stdout.split(/\r?\n/);
        workspaceInfo = lines.reduce<Record<string, WorkspaceInfo>>(
          (acc, line) => {
            const {name, location} = JSON.parse(line) as WorkspaceInfo;
            return {...acc, [name]: {location}};
          },
          {},
        );
      } catch (err) {
        if (err instanceof ExecError) {
          throw new PackError(
            'Unable to read workspace information',
            `${this.spec}`,
            this.tmpdir,
            {
              error: err,
              exitCode: err.exitCode,
              output: err.all || err.stderr || err.stdout,
            },
          );
        }
        throw err;
      }

      if (opts.workspaces?.length) {
        commands.push(
          ...opts.workspaces.map((workspace) => {
            let info = workspaceInfo[workspace] as WorkspaceInfo | undefined;
            let name: string;
            if (!info) {
              [name, info] = Object.entries(workspaceInfo).find(
                ([, info]) => info.location === workspace,
              );
              if (!info) {
                throw new PackError(
                  `Unable to find workspace "${workspace}`,
                  `${this.spec}`,
                  this.tmpdir,
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

    const installManifests: InstallManifest[] = [];

    for await (const {command, cwd, tarball, pkgName} of commands) {
      try {
        await this.executor(this.spec, command, {}, {cwd});
      } catch (err) {
        if (err instanceof ExecError) {
          throw new PackError(err.message, `${this.spec}`, this.tmpdir, {
            error: err,
            exitCode: err.exitCode,
            output: err.all || err.stderr || err.stdout,
          });
        }
        throw err;
      }

      installManifests.push({
        spec: tarball,
        cwd: this.tmpdir,
        installPath: path.join(this.tmpdir, 'node_modules', pkgName),
        pkgName,
      });
    }

    this.debug('(pack) Packed %d packages', installManifests.length);

    return installManifests;
  }

  public async runScript(
    manifest: RunScriptManifest,
  ): Promise<RunScriptResult> {
    const {script, pkgName, cwd} = manifest;
    const args = ['run', script];

    let result: RunScriptResult;
    try {
      const rawResult = await this.executor(
        this.spec,
        args,
        {},
        {
          cwd,
        },
      );
      result = {pkgName, script, rawResult, cwd};
    } catch (err) {
      if (err instanceof ExecError) {
        result = {
          pkgName,
          script,
          rawResult: err,
          cwd,
        };
        if (
          this.opts.loose &&
          /Couldn't find a script named/i.test(err.stdout)
        ) {
          result.skipped = true;
        } else {
          result.error = new RunScriptError(
            err,
            script,
            pkgName,
            `${this.spec}`,
          );
        }
      } else {
        throw err;
      }
    }

    if (!result.error && !result.skipped && result.rawResult.failed) {
      let message: string;
      if (
        result.rawResult.stdout &&
        /Couldn't find a script named/i.test(result.rawResult.stdout)
      ) {
        message = `Script "${script}" in package "${pkgName}" failed; script not found`;
      } else {
        if (result.rawResult.exitCode) {
          message = `Script "${script}" in package "${pkgName}" failed with exit code ${result.rawResult.exitCode}`;
        } else {
          message = `Script "${script}" in package "${pkgName}" failed`;
        }
      }
      result.error = new ScriptFailedError(message, {
        script,
        pkgName,
        pkgManager: this.name,
        exitCode: result.rawResult.exitCode,
        command: result.rawResult.command,
        output: result.rawResult.all ?? result.rawResult.stderr,
      });
    }

    if (result.error) {
      this.debug(
        `(runScripts) Script "%s" in package "%s" failed; continuing...`,
        script,
        pkgName,
      );
    } else {
      this.debug(
        '(runScripts) Successfully executed script %s in package %s',
        script,
        pkgName,
      );
    }

    return result;
  }
}

export default YarnBerry satisfies PkgManagerDef;
