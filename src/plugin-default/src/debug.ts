import {debugFactory} from 'midnight-smoker/util';

export const createDebug = debugFactory(
  'midnight-smoker:plugin-default',
  __dirname,
);
