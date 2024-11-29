import {debugFactory} from 'midnight-smoker/util';
import path from 'node:path';

export const createDebug = debugFactory(
  'midnight-smoker:pkg-manager:test',
  path.resolve(__dirname),
);
