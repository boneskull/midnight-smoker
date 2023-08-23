import {node as execa, type Options as ExecaOptions} from 'execa';
import path from 'node:path';
import type {ExecOpts, ExecResult, Executor} from './executor';
import corepackPkg from 'corepack/package.json';

/**
 * Disables the strict `packageManager` field in `package.json`.
 *
 * If this field was enabled, then `corepack` would not arbitrarily run
 * user-requested package manager & version pairs.
 */
const DEFAULT_ENV = {
  COREPACK_ENABLE_PROJECT_SPEC: '0',
} as const;

/**
 * An {@linkcode Executor} which executes `corepack`.
 *
 * @see {@link https://github.com/nodejs/corepack}
 */
export class CorepackExecutor implements Executor {
  protected readonly corepackPath: string;

  /**
   * @param pmId The package manager ID (`<npm|yarn|pnpm>@<version>`) to use as the first argument to `corepack`.
   */
  public constructor(private readonly pmId: string) {
    const corepackRelativePath = corepackPkg.bin.corepack;
    const corepackDir = path.dirname(require.resolve('corepack/package.json'));
    this.corepackPath = path.resolve(corepackDir, corepackRelativePath);
  }

  public async exec(
    args: string[],
    execaOpts: ExecaOptions = {},
    execOpts: ExecOpts = {},
  ): Promise<ExecResult> {
    const proc = execa(this.corepackPath, [this.pmId, ...args], {
      env: {...DEFAULT_ENV, ...execaOpts.env},
      ...execaOpts,
    });

    if (execOpts.verbose) {
      proc.stdout?.pipe(process.stdout);
      proc.stderr?.pipe(process.stderr);
    }

    return await proc;
  }
}
