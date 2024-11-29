import {
  type ExecOutput,
  InstallError,
  type PkgManager,
  type PkgManagerInstallContext,
  type PkgManagerRunScriptContext,
  type RunScriptResult,
} from 'midnight-smoker/pkg-manager';
import {Range} from 'semver';

import {createDebug} from '../debug';
import {isExecError} from './util';
import {runScript, YarnClassic} from './yarn-classic';

const debug = createDebug(__filename);

const supportedVersionRange = new Range('>=2.0.0');

/**
 * For use with {@link runScript}
 *
 * @param value Output from the package manager
 * @returns `true` if the output indicates that the script is missing
 */
const isMissingScript = (value: string) =>
  /Couldn't find a script named/i.test(value);

export const YarnBerry = Object.freeze({
  ...YarnClassic,

  async install(ctx: PkgManagerInstallContext): Promise<ExecOutput> {
    const {executor, installManifest, signal, spec, tmpdir, verbose} = ctx;

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
    try {
      await executor(spec, ['init', '--private'], {
        nodeOptions: {cwd: tmpdir, signal},

        verbose,
      });
    } catch (err) {
      debug('(install): Failed to initialize package.json', err);
    }
    // this tells it to use "ol' reliable" instead of the "pnp linker"
    await executor(spec, ['config', 'set', 'nodeLinker', 'node-modules'], {
      nodeOptions: {cwd: tmpdir, signal},
      verbose,
    });

    const {pkgSpec} = installManifest;

    let installResult: ExecOutput;
    try {
      installResult = await executor(spec, ['add', pkgSpec], {
        nodeOptions: {cwd: tmpdir, signal},
        verbose,
      });
    } catch (err) {
      if (isExecError(err)) {
        throw new InstallError(err, installManifest, spec);
      }
      throw err;
    }

    debug('(install) Installed package "%s"', installManifest.pkgName);

    return installResult;
  },

  name: 'yarn-berry',

  async runScript(ctx: PkgManagerRunScriptContext): Promise<RunScriptResult> {
    return runScript(ctx, isMissingScript);
  },

  supportedVersionRange,
} as const) satisfies Readonly<PkgManager>;
