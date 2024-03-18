/**
 * Constants for use in tests
 *
 * @packageDocumentation
 */

import path from 'node:path';

/**
 * Phony root directory for phony or in-memory filesystem
 */
export const TEST_ROOT = '/';

/**
 * Phony temp dir for phony or in-memory filesystem
 */
export const TEST_TMPDIR = path.join(TEST_ROOT, 'tmp');

/**
 * Default name for a test plugin
 */
export const DEFAULT_TEST_PLUGIN_NAME = 'test-plugin';

/**
 * Default description for a test plugin
 */
export const DEFAULT_TEST_PLUGIN_DESCRIPTION = 'test plugin description';

/**
 * Default version for a test plugin
 */
export const DEFAULT_TEST_PLUGIN_VERSION = '1.0.0';

/**
 * Default name for a test rule
 */
export const DEFAULT_TEST_RULE_NAME = 'test-rule';

/**
 * Default description for a test rule
 */
export const DEFAULT_TEST_RULE_DESCRIPTION = 'test rule description';

/**
 * Path to the `smoker` executable.
 */
export const CLI_PATH = require.resolve('midnight-smoker/smoker');
