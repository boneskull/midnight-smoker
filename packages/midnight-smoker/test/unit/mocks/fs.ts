import {memfs, type IFs} from 'memfs';
import {type Volume} from 'memfs/lib/volume';

export interface FsMocks {
  'node:fs': IFs;
  fs: IFs;
  'node:fs/promises': IFs['promises'];
}

export function createFsMocks(): {mocks: FsMocks; fs: IFs; vol: Volume} {
  const {vol, fs} = memfs();
  return {
    mocks: {
      'node:fs': fs,
      fs,
      'node:fs/promises': fs.promises,
    },
    fs,
    vol,
  };
}
