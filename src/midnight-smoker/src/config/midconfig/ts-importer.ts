import {TS_CONFIG_EXTENSIONS} from '#constants';
import {createDebug} from '#util/debug';
import {FileManager} from '#util/filemanager';
import {mimport} from '#util/importer';
import {hrRelativePath} from '#util/util';
import {isError} from 'lodash';
import path from 'node:path';
import {type TranspileOptions} from 'typescript';

const debug = createDebug(__filename);

// eslint-disable-next-line @typescript-eslint/consistent-type-imports
let _ts: typeof import('typescript');

/**
 * Class responsible for importing TypeScript configuration files.
 *
 * @todo Custom errors
 */
export class TsImporter {
  private ts: typeof _ts;

  constructor(
    ts?: typeof _ts,
    private readonly fileManager = FileManager.create(),
  ) {
    // TODO: custom error
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    this.ts = ts ?? (require('typescript') as typeof _ts);
  }

  public static async importTs(
    this: void,
    filepath: string,
    {
      fileManager,
      source,
      ts,
    }: {fileManager?: FileManager; source?: string; ts?: typeof _ts} = {},
  ) {
    return new TsImporter(ts, fileManager).importTsConfig(filepath, source);
  }

  async importTsConfig(filepath: string, source?: string): Promise<unknown> {
    const {fileManager, ts} = this;
    const {fs} = this.fileManager;
    const extname = path.extname(filepath);
    if (!TS_CONFIG_EXTENSIONS.includes(extname)) {
      throw new TypeError(
        `Expected a TypeScript file, got ${filepath} with unsupported extension ${extname}`,
      );
    }
    source ??= await fileManager.readFile(filepath);

    const filepathDir = path.dirname(filepath);
    const baseFilename = path.basename(filepath, extname);
    const compiledFilepath = path.join(
      filepathDir,
      `__smoker__${baseFilename}.mjs`,
    );
    if (fs.existsSync(compiledFilepath)) {
      debug(
        'WARNING: Compile target for %s already exists: %s; attempting load',
        hrRelativePath(filepath),
        hrRelativePath(compiledFilepath),
      );
      // we can assume it is ours, I suppose.
      return mimport(compiledFilepath);
    }
    debug('Compiling TS: %s ➡️ %s', filepath, compiledFilepath);
    try {
      try {
        const config = this.readTsConfigJson(filepathDir) ?? {};
        config.compilerOptions = {
          ...config.compilerOptions,
          module: ts.ModuleKind.ES2022,
          moduleResolution: ts.ModuleResolutionKind.Bundler,
          noEmit: false,
          target: ts.ScriptTarget.ES2022,
        };
        const transpiledContent = ts.transpileModule(source, config).outputText;
        fs.writeFileSync(compiledFilepath, `${transpiledContent}`);
      } catch (err) {
        if (isError(err)) {
          err.message = `TypeScript Error in ${filepath}:\n${err.message}`;
        }
        throw err;
      }
      return await mimport(compiledFilepath);
    } finally {
      await fileManager.rimraf(compiledFilepath);
    }
  }

  readTsConfigJson(directory: string): TranspileOptions | undefined {
    const {fileManager, ts} = this;
    const {fs} = fileManager;
    const filePath = ts.findConfigFile(directory, fs.existsSync);
    if (filePath) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const {config, error} = ts.readConfigFile(filePath, (path) =>
        fs.readFileSync(path, 'utf-8'),
      );
      if (error) {
        throw new Error(
          // eslint-disable-next-line @typescript-eslint/no-base-to-string
          `Error in ${filePath}: ${error.messageText.toString()}`,
        );
      }
      return config as TranspileOptions;
    }
  }
}

export type ImportTsFnOptions = {
  fileManager?: FileManager;
  source?: string;
  ts?: typeof _ts;
};

export const importTs = TsImporter.importTs satisfies ImportTsFn;

export type ImportTsFn = (
  moduleId: string,
  options?: ImportTsFnOptions,
) => Promise<unknown>;
