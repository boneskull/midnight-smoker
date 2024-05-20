/**
 * Adapter for reading and validting config files via {@link Midconfig}
 *
 * @packageDocumentation
 */

import {SCRIPT_NAME} from '#constants';
import Debug from 'debug';
import type {RawSmokerOptions} from '../options/options';
import {FileManager} from '../util/filemanager';
import {toDualCasedObject} from '../util/schema-util';
import {type MidconfigOptions} from './config-types';
import {Midconfig} from './midconfig';

const debug = Debug('midnight-smoker:config:reader');

const BASE_CFG_FILENAMES = [
  '.smokerrc',
  'smoker.config',
  '.config/smokerrc',
  '.config/smoker.config',
] as const;

const MIDCONFIG_OPTS = {
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
} as const satisfies MidconfigOptions;

export class ConfigReader {
  private readonly midconfig: Midconfig;

  private constructor(filemanager: FileManager = FileManager.create()) {
    this.midconfig = new Midconfig(SCRIPT_NAME, filemanager, MIDCONFIG_OPTS);
  }

  public static create(filemanager: FileManager = FileManager.create()) {
    return new ConfigReader(filemanager);
  }

  public static read(configFile?: string) {
    return ConfigReader.create().read(configFile);
  }

  public async read(configFile?: string) {
    const result = await (configFile
      ? this.midconfig.load(configFile)
      : this.midconfig.search());

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
