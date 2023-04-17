#!/usr/bin/env node

require('source-map-support').install();

const {main} = require('../dist/src/cli');

main(process.argv.slice(2));
