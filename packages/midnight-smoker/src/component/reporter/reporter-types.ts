import type {PackageJson} from 'type-fest';
import type {SmokerEvents} from '../../event/event-types';
import type {StrictEmitter} from '../../event/strict-emitter';
import type {SmokerOptions} from '../../options/options';

export type ReporterDef = {
  when?: ReporterWhenFn;
  reporter: ReporterFn;
  name: string;
  description: string;
  isReporter?: boolean;
  stdout?:
    | NodeJS.WritableStream
    | (() => NodeJS.WritableStream)
    | (() => Promise<NodeJS.WritableStream>);
  stderr?:
    | NodeJS.WritableStream
    | (() => NodeJS.WritableStream)
    | (() => Promise<NodeJS.WritableStream>);
};
export type ReporterWhenFn = (opts: Readonly<SmokerOptions>) => boolean;
export type ReporterFn = (params: ReporterParams) => void | Promise<void>;
export interface ReporterParams {
  emitter: Readonly<StrictEmitter<SmokerEvents>>;
  opts: Readonly<SmokerOptions>;
  pkgJson: Readonly<PackageJson>;
  console: Console;
  stderr: NodeJS.WritableStream;
  stdout: NodeJS.WritableStream;
}
