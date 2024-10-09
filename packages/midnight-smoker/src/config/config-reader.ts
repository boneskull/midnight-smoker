/**
 * Adapter for reading and validting config files via {@link Midconfig}
 *
 * @packageDocumentation
 */

import {SCRIPT_NAME} from '#constants';
import {constant} from '#constants/create-constant';
import {type RawSmokerOptions} from '#schema/smoker-options';
import {toDualCasedObject} from '#util/common';
import {createDebug} from '#util/debug';
import {FileManager} from '#util/filemanager';

import {Midconfig, type MidconfigOptions} from './midconfig';

const debug = createDebug(__filename);

/**
 * List of possible config filenames _without extension_.
 *
 * These are expanded to then include all allowed extensions.
 *
 * @see {@link DEFAULT_MIDCONFIG_OPTS}
 */
export const BASE_CFG_FILENAMES = constant([
  '.smokerrc',
  'smoker.config',
  '.config/smokerrc',
  '.config/smoker.config',
]);

/**
 * Default options for {@link Midconfig}
 */
const DEFAULT_MIDCONFIG_OPTS = constant({
  searchPlaces: [
    'package.json',
    ...BASE_CFG_FILENAMES.flatMap((name) => [
      `${name}.json`,
      `${name}.js`,
      `${name}.cjs`,
      `${name}.mjs`,
      `${name}.ts`,
      `${name}.mts`,
      `${name}.cts`,
    ]),
  ],
}) satisfies MidconfigOptions;

/**
 * Options for {@link ConfigReader.prototype.read}
 */
export type ConfigReaderReadOptions = {
  configFile?: string;
  cwd?: string;
};

/**
 * A class that instantiates a {@link MidConfig} instance and uses it to load a
 * config file (if possible).
 *
 * Instantiate via {@link ConfigReader.create}; constructor is private
 *
 * @privateRemarks
 * Why is this even a class
 */
export class ConfigReader {
  readonly #midconfig: Midconfig;

  private constructor(fileManager: FileManager) {
    this.#midconfig = new Midconfig(
      SCRIPT_NAME,
      fileManager,
      DEFAULT_MIDCONFIG_OPTS,
    );
  }

  public static create(fileManager = FileManager.create()): ConfigReader {
    return new ConfigReader(fileManager);
  }

  /**
   * {@inheritDoc ConfigReader#read}
   */
  public static read({
    configFile,
    cwd,
    fileManager,
  }: {fileManager?: FileManager} & ConfigReaderReadOptions = {}): Promise<
    RawSmokerOptions | undefined
  > {
    return ConfigReader.create(fileManager).read({configFile, cwd});
  }

  /**
   * Reads a config file.
   *
   * Returns an object having both camelCase and kebab-case keys, for matching
   * the arguments parsed by yargs.
   *
   * @param options Options for reading the config file
   * @returns Raw configuration object (if found)
   * @todo Support URL?
   */
  public async read(
    options: ConfigReaderReadOptions = {},
  ): Promise<RawSmokerOptions | undefined> {
    const {configFile, cwd = process.cwd()} = options;
    const result = await (configFile
      ? this.#midconfig.load(configFile)
      : this.#midconfig.search(cwd));

    let opts: RawSmokerOptions = {};
    if (result?.config && !result.isEmpty) {
      debug('Found config at %s', result.filepath);
      opts = result.config as RawSmokerOptions;

      // I love ESM, really I do
      // TODO: test if this is still needed
      if ('default' in opts) {
        opts = opts.default as RawSmokerOptions;
      }

      // we set "config" here which overwrites whatever the user provided. if a
      // config file contains a `config` field (which seems silly), it will be
      // overwritten by this.
      return toDualCasedObject({...opts, config: result.filepath});
    } else {
      debug('Found no config file');
    }
    return opts;
  }
}
