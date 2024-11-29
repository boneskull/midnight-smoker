import {debugFactory} from 'midnight-smoker/util';
import path from 'node:path';

export const createDebug = debugFactory(
  'midnight-smoker:tarball-installer',
  path.resolve(__dirname),
);
