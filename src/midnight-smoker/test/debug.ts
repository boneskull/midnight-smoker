import {debugFactory} from '#util/debug';
import path from 'node:path';

export const createDebug = debugFactory(
  'midnight-smoker:test',
  path.resolve(__dirname),
);
