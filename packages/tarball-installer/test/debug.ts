import {debugFactory} from 'midnight-smoker/util';
import path from 'node:path';

export const createDebug = (filename: string) =>
  debugFactory(
    'midnight-smoker:tarball-installer:test',
    path.resolve(__dirname),
  )(filename.replace(/\.test\.ts$/, ''));
