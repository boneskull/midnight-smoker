import {DirCreationError} from '#error/create-dir-error';
import type nodeFsPromises from 'node:fs/promises';
import path from 'node:path';
import {MIDNIGHT_SMOKER, UNKNOWN_TMPDIR_PREFIX} from '../constants';

export type FsPromisesApi = Pick<
  typeof nodeFsPromises,
  'mkdtemp' | 'rm' | 'readFile' | 'writeFile' | 'mkdir'
>;

export interface FileManagerOpts {
  fs?: FsPromisesApi;
  tmpdir?: GetTempDirRoot;
}

export type GetTempDirRoot = () => string;

export class FileManager {
  public readonly fs: FsPromisesApi;

  public readonly tmpdir: GetTempDirRoot;

  constructor({fs, tmpdir}: FileManagerOpts = {}) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-unsafe-assignment
    this.fs = fs ?? (require('node:fs/promises') as FsPromisesApi);
    // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-unsafe-member-access
    this.tmpdir = tmpdir ?? (require('node:os').tmpdir as GetTempDirRoot);
  }

  /**
   * Creates a temp dir
   *
   * @returns New temp dir path
   * @todo These might want to be named per `PkgManager`.
   */
  public async createTempDir(
    prefix: string = UNKNOWN_TMPDIR_PREFIX,
  ): Promise<string> {
    const fullPrefix = path.join(
      this.tmpdir.call(null),
      MIDNIGHT_SMOKER,
      prefix,
      path.sep,
    );
    try {
      // this is only required if we're using an in-memory filesystem
      await this.fs.mkdir(fullPrefix, {recursive: true});
      return await this.fs.mkdtemp(fullPrefix);
    } catch (err) {
      throw new DirCreationError(
        `Failed to create temp directory with prefix ${fullPrefix}`,
        fullPrefix,
        err as NodeJS.ErrnoException,
      );
    }
  }

  public async rimraf(dir: string): Promise<void> {
    await this.fs.rm(dir, {recursive: true, force: true});
  }

  public static create(this: void, opts: FileManagerOpts = {}): FileManager {
    return new FileManager(opts);
  }
}
