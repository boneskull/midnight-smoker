// @ts-check

'use strict';

/**
 * @returns {import('wallabyjs').IWallabyConfig}
 */
module.exports = () => {
  return {
    env: {
      type: 'node',
      params: {
        env: 'DEBUG=midnight-smoker*',
      },
    },
    files: [
      {
        pattern: './packages/midnight-smoker/bin/smoker.js',
        instrument: false,
      },
      {
        pattern: './packages/*/data/*.json',
        instrument: false,
      },
      {
        pattern: './packages/*/test/**/*.ts',
        instrument: false,
      },
      {
        pattern: './packages/*/test/**/fixture/**/*',
        instrument: false,
      },
      {
        pattern: './packages/*/dist/**/*',
        instrument: false,
      },
      './packages/*/src/**/*.ts',
      './packages/*/package.json',
      '!./packages/*/test/**/*.spec.ts',
      '!./packages/docs/**/*',
    ],
    testFramework: 'mocha',
    tests: [
      './packages/*/test/**/*.spec.ts',
      '!./packages/*/test/e2e/**/*.spec.ts',
      '!./packages/docs/test/**/*',
    ],
    runMode: 'onsave',
    // workers: {restart: true},
    setup(wallaby) {
      process.env.WALLABY = '1';
      // const Module = require('module');
      // const path = require('path');
      // const {imports} = require(
      //   path.join(
      //     wallaby.projectCacheDir,
      //     'packages',
      //     'midnight-smoker',
      //     'package.json',
      //   ),
      // );
      // const mappedImports = Object.fromEntries(
      //   Object.entries(imports).map(([key, value]) => [
      //     key,
      //     value.replace('dist', 'src'),
      //   ]),
      // );

      // const originalResolveFilename = Module._resolveFilename;

      // Module._resolveFilename = function (request, _parent) {
      //   console.log('Resolving %s', request);
      //   if (request in mappedImports) {
      //     const newRequest = path.join(
      //       wallaby.projectCacheDir,
      //       'packages',
      //       'midnight-smoker',
      //       mappedImports[request],
      //     );
      //     return originalResolveFilename.call(this, newRequest, _parent);
      //   }

      //   return originalResolveFilename.call(this, request, _parent);
      // };
    },
  };
};
