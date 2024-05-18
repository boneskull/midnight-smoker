import type {PluginHelpers} from '#plugin';
import {customSchema} from '#util/schema-util';

/**
 * Pass-through schema for Helpers. We control these and do not need to validate
 * them.
 */

export const HelpersSchema = customSchema<PluginHelpers>();
