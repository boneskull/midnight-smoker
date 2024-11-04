#!/usr/bin/env node
try {
  require('source-map-support').install();
} catch {}

require('../dist/src/cli/index.js');
