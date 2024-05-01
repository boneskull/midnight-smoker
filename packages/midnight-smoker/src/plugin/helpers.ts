import {isWriteStream} from '#cli/cli-util';
import * as FsHelpers from './fs-helpers';

export const Helpers = {...FsHelpers, isWriteStream} as const;

export type PluginHelpers = typeof Helpers;
