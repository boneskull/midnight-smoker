/**
 * Adapter for reading and validting config files via {@link Midconfig}
 *
 * @packageDocumentation
 */

import {SCRIPT_NAME} from '#constants';
import {constant} from '#constants/create-constant';
import type {RawSmokerOptions} from '#schema/smoker-options';
import {FileManager} from '#util/filemanager';
import {toDualCasedObject} from '#util/schema-util';
import Debug from 'debug';
import {Midconfig, type MidconfigOptions} from './midconfig';

const debug = Debug('midnight-smoker:config:reader');

/**
 * List of possible config filenames _without extension_.
 *
 * These are expanded to then include all allowed extensions.
 *
 * @see {@link DEFAULT_MIDCONFIG_OPTS}
 */
const BASE_CFG_FILENAMES = constant([
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
 * A class that instantiates a {@link MidConfig} instance and uses it to load a
 * config file (if possible).
 *
 * Instantiate via {@link ConfigReader.create}; constructor is private
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
  public static read(
    configFile?: string,
  ): Promise<RawSmokerOptions | undefined> {
    return ConfigReader.create().read(configFile);
  }

  /**
   * Reads a config file.
   *
   * Returns an object having both camelCase and kebab-case keys, for matching
   * the arguments parsed by yargs.
   *
   * @param configFile If provided, reads the specified file. Otherwise,
   *   searches for a config file.
   * @returns Raw configuration object (if found)
   * @todo Support URL?
   */
  public async read(
    configFile?: string,
  ): Promise<RawSmokerOptions | undefined> {
    const result = await (configFile
      ? this.#midconfig.load(configFile)
      : this.#midconfig.search());

    let opts: RawSmokerOptions = {};
    if (result?.config && !result.isEmpty) {
      debug('Found config at %s', result.filepath);
      opts = result.config as RawSmokerOptions;

      // I love ESM, really I do
      // TODO: test if this is still needed
      if ('default' in opts) {
        opts = opts.default as RawSmokerOptions;
      }

      return toDualCasedObject(opts);
    }
    return opts;
  }
}
