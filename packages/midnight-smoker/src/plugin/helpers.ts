import {isWriteStream} from '#cli/cli-util';

export const Helpers = {isWriteStream} as const;

export type PluginHelpers = typeof Helpers;
