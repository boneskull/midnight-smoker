/**
 * All the errors
 * @module
 */

import {bold} from 'chalk';
import {StaticCheckContext} from '.';
import {SmokeResults} from './types';

/**
 * Options for {@link SmokerError} with a generic `Cause` type for `cause` prop.
 */
export interface SmokerErrorOpts<Cause extends object | void = void>
  extends ErrorOptions {
  code?: string;
  cause?: Cause;
}

/**
 * Base class for all exceptions thrown by `midnight-smoker`.
 */
export abstract class SmokerError<Cause extends object | void = void>
  extends Error
  implements NodeJS.ErrnoException
{
  /**
   * Each subclass will have a unique `code`
   */
  public readonly code?: string;

  /**
   * Each subclass defines the shape of its `cause`.
   */
  public readonly cause?: Cause;

  constructor(message: string, opts?: SmokerErrorOpts<Cause>) {
    super(message, opts);
    this.code = opts?.code;
  }

  toJSON() {
    return {
      message: this.message,
      name: this.name,
      stack: this.stack,
      cause: this.cause,
      code: this.code,
    };
  }
}

export class InvalidArgError extends SmokerError<{arg?: string}> {
  constructor(message: string, arg?: string) {
    super(message, {code: 'ESMOKER_INVALIDARG', cause: {arg}});
  }
}

export class NotImplementedError extends SmokerError {
  public readonly name = 'NotImplementedError';
  constructor(message: string) {
    super(message, {code: 'ESMOKER_NOTIMPLEMENTED'});
  }
}

export class DirCreationError extends SmokerError<{
  error: NodeJS.ErrnoException;
}> {
  public readonly name = 'DirCreationError';

  constructor(message: string, error: NodeJS.ErrnoException) {
    super(message, {code: 'ESMOKER_DIRCREATION', cause: {error}});
  }
}

export class DirDeletionError extends SmokerError<{
  dir: string;
  error: NodeJS.ErrnoException;
}> {
  public readonly name = 'DirDeletionError';
  constructor(message: string, dir: string, error: NodeJS.ErrnoException) {
    super(message, {code: 'ESMOKER_DIRDELETION', cause: {dir, error}});
  }
}

export class PackageManagerIdError extends SmokerError<{
  pmId: string;
}> {
  public readonly name = 'PackageManagerIdError';
  constructor() {
    super(
      'Could not find package manager ID; please report this bug at https://github.com/boneskull/midnight-smoker/issues/new',
      {code: 'ESMOKER_PACKAGEMANAGERID'},
    );
  }
}

export class PackageManagerError extends SmokerError<{
  error: Error;
  pmId: string;
}> {
  public readonly name = 'PackageManagerError';
  constructor(message: string, pmId: string, error: Error) {
    super(message, {code: 'ESMOKER_PACKAGEMANAGER', cause: {pmId, error}});
  }
}

export class SmokeFailedError extends SmokerError<{
  results?: SmokeResults;
  error?: Error;
}> {
  constructor(
    message: string,
    opts: {results?: SmokeResults; error?: Error} = {},
  ) {
    super(message, {code: 'ESMOKER_SMOKEFAILED', cause: opts});
  }
}

export class MissingPackageJsonError extends SmokerError<{
  cwd: string;
}> {
  constructor(message: string, cwd: string) {
    super(message, {code: 'ESMOKER_MISSINGPACKAGEJSON', cause: {cwd}});
  }
}

export class UnreadablePackageJsonError extends SmokerError<{
  pkgJsonPath: string;
  error: Error;
}> {
  constructor(message: string, pkgJsonPath: string, error: Error) {
    super(message, {
      code: 'ESMOKER_UNREADABLEPACKAGEJSON',
      cause: {pkgJsonPath, error},
    });
  }
}

export class RunScriptError extends SmokerError<{
  script: string;
  pkgName: string;
  pm: string;
  error?: Error;
  exitCode?: number;
  output?: string;
}> {
  constructor(
    message: string,
    script: string,
    pkgName: string,
    pm: string,
    opts: {error?: Error; exitCode?: number; output?: string} = {},
  ) {
    super(message, {
      code: 'ESMOKER_RUNSCRIPT',
      cause: {script, pkgName, pm, ...opts},
    });
  }

  toString() {
    if (this.cause?.error) {
      return `${this.message}: ${bold(
        this.cause.error.message ?? this.cause.error,
      )}`;
    }
    if (this.cause?.output) {
      return `${this.message}: ${bold(this.cause.output)}`;
    }
    return this.message;
  }
}

export class UnknownScriptError extends SmokerError<{
  script: string;
  pkgName: string;
}> {
  constructor(message: string, script: string, pkgName: string) {
    super(message, {code: 'ESMOKER_UNKNOWNSCRIPT', cause: {script, pkgName}});
  }
}

export type ScriptError = RunScriptError | UnknownScriptError;

export class InstallError extends SmokerError<{
  pm: string;
  error?: Error;
  exitCode?: number;
  output?: string;
}> {
  constructor(
    message: string,
    pm: string,
    opts: {error?: Error; exitCode?: number; output?: string} = {},
  ) {
    super(message, {code: 'ESMOKER_INSTALL', cause: {pm, ...opts}});
  }
}

export class PackError extends SmokerError<{
  pm: string;
  error?: Error;
  exitCode?: number;
  output?: string;
}> {
  constructor(
    message: string,
    pm: string,
    opts: {error?: Error; exitCode?: number; output?: string} = {},
  ) {
    super(message, {code: 'ESMOKER_PACK', cause: {pm, ...opts}});
  }
}

export class PackParseError extends SmokerError<{
  pm: string;
  error: Error;
  output: string;
}> {
  constructor(message: string, pm: string, error: Error, output: string) {
    super(message, {
      code: 'ESMOKER_PACKPARSE',
      cause: {error, pm, output},
    });
  }
}

export class UnknownVersionError extends SmokerError<{
  pm: string;
  version: string;
}> {
  constructor(message: string, pm: string, version: string) {
    super(message, {
      code: 'ESMOKER_UNKNOWNVERSION',
      cause: {pm, version},
    });
  }
}

export class UnknownVersionRangeError extends SmokerError<{
  pm: string;
  versionRange: string;
}> {
  constructor(message: string, pm: string, versionRange: string) {
    super(message, {
      code: 'ESMOKER_UNKNOWNVERSIONRANGE',
      cause: {pm, versionRange},
    });
  }
}

export class UnknownDistTagError extends SmokerError<{
  pkgName: string;
  tag: string;
}> {
  constructor(message: string, pkgName: string, tag: string) {
    super(message, {code: 'ESMOKER_UNKNOWNDISTTAG', cause: {pkgName, tag}});
  }
}

export class UnsupportedPackageManagerError extends SmokerError<{
  name: string;
  version: string;
}> {
  constructor(message: string, name: string, version: string) {
    super(message, {
      code: 'ESMOKER_UNSUPPORTEDPACKAGEMANAGER',
      cause: {name, version},
    });
  }
}

export class RuleError extends SmokerError<{
  context: StaticCheckContext;
  ruleName: string;
  error: Error;
}> {
  constructor(
    message: string,
    context: StaticCheckContext,
    ruleName: string,
    error: Error,
  ) {
    super(message, {
      code: 'ESMOKER_RULEERROR',
      cause: {context, ruleName, error},
    });
  }
}
