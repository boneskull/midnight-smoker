import type fs from 'node:fs';
import type os from 'node:os';

import {type ImportFn} from '#util/importer';

export type FsCapabilities = {
  promises: Pick<
    typeof fs.promises,
    | 'lstat'
    | 'mkdir'
    | 'mkdtemp'
    | 'readdir'
    | 'readFile'
    | 'readlink'
    | 'realpath'
    | 'rm'
    | 'stat'
    | 'writeFile'
  >;
} & Pick<typeof fs, 'existsSync' | 'readFileSync' | 'writeFileSync'>;

export type OsCapabilties = Pick<typeof os, 'homedir' | 'tmpdir'>;

export type ResolveFn = (moduleId: string, from?: string) => string;

export type IsAbsoluteFn = (path: string) => boolean;

export type DirnameFn = (path: string) => string;

export type LoaderCapabilities = {
  importer?: ImportFn;
  resolve?: ResolveFn;
};
