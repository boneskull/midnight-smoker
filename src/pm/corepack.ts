import {node as execa, type Options as ExecaOptions} from 'execa';
import which from 'which';
import type {Executor, ExecOpts, ExecResult} from './executor';

/**
 * Cached path to `corepack`.
 *
 * This should persist between instantiations, so here it is.
 */
let corepackPath: string | undefined;

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
  /**
   * @param pmId The package manager ID (`<npm|yarn|pnpm>@<version>`) to use as the first argument to `corepack`.
   */
  public constructor(private readonly pmId: string) {}

  protected async getCorepackPath(): Promise<string> {
    if (corepackPath) {
      return corepackPath;
    }
    // TODO: handle missing corepack
    corepackPath = await which('corepack');
    return corepackPath;
  }

  public async exec(
    args: string[],
    execaOpts: ExecaOptions = {},
    execOpts: ExecOpts = {},
  ): Promise<ExecResult> {
    const corepack = await this.getCorepackPath();

    const proc = execa(corepack, [this.pmId, ...args], {
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
