import * as FsHelpers from './fs-helpers';

export const Helpers = {...FsHelpers} as const;

export type PluginHelpers = typeof Helpers;
