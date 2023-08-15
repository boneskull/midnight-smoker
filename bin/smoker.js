#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-var-requires */

const {resolve} = require('node:path');
const {runLava} = require('lavamoat');

const ROOT = resolve(__dirname, '..');

runLava({
  projectRoot: ROOT,
  policyPath: resolve(ROOT, 'lavamoat', 'node', 'policy.json'),
  policyOverridePath: resolve(ROOT, 'lavamoat', 'node', 'policy-overrides.json'),
  entryPath: require.resolve('../dist/cli.js'),
});

require('source-map-support').install();
require('../dist/cli.js');
