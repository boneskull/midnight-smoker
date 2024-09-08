import {type Location} from '@humanwhocodes/momoa';

export class JSONLocation {
  constructor(
    public readonly filepath: string,
    public readonly start: Location,
    public readonly end: Location,
  ) {}

  public toString() {
    return `${this.filepath}:${this.start.line}:${this.start.column}`;
  }
}
