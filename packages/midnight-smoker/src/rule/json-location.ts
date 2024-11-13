/**
 * Provides {@link JSONLocation}, which is a wrapper around a `LocationRange` and
 * includes a filepath.
 */

import {type Location} from '@humanwhocodes/momoa';

/**
 * The only interesting thing here is {@link JSONLocation.toString}, which prints
 * a path, start line, and column delimited by `:`, which terminals may
 * recognize to open the file in an IDE and jump to the location.
 *
 * This works in iTerm2 + VSCode, anyhow.
 */
export class JSONLocation {
  constructor(
    public readonly filepath: string,
    public readonly start: Location,
    public readonly end: Location,
  ) {}

  public static create(filepath: string, start: Location, end: Location) {
    return new JSONLocation(filepath, start, end);
  }

  public toString() {
    return `${this.filepath}:${this.start.line}:${this.start.column}`;
  }
}
