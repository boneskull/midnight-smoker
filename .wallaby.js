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
        pattern: './packages/midnight-smoker/data/*.json',
        instrument: false,
      },
      {
        pattern: './packages/midnight-smoker/test/**/*.ts',
        instrument: false,
      },
      {
        pattern: './packages/midnight-smoker/test/**/fixture/**/*',
        instrument: false,
      },
      './packages/midnight-smoker/src/**/*.ts',
      './packages/midnight-smoker/package.json',
      // './packages/midnight-smoker/src/package.json',
      '!./packages/midnight-smoker/test/**/*.spec.ts',
      // '!./packages/docs/**/*',
    ],
    testFramework: 'mocha',
    tests: [
      './packages/midnight-smoker/test/**/*.spec.ts',
      '!./packages/midnight-smoker/test/e2e/**/*.spec.ts',
      // '!./packages/docs/test/**/*',
    ],
    runMode: 'onsave',
    workers: {recycle: true},
    setup(wallaby) {
      process.env.WALLABY = '1';

      const {minimatch} = require('minimatch');
      const path = require('path');
      const Module = require('module');
      const pkgJsonPath = path.join(
        wallaby.projectCacheDir,
        'packages',
        'midnight-smoker',
        'package.json',
      );
      const pkgJson = require(pkgJsonPath);
      const mappedImports = Object.fromEntries(
        Object.entries(pkgJson.imports).map(([key, value]) => [
          key,
          value.replace('dist', 'src'),
        ]),
      );

      const originalResolveFilename = Module._resolveFilename;

      /**
       * @param {string} request
       * @param {unknown} _parent
       * @returns {unknown}
       */
      Module._resolveFilename = function (request, _parent) {
        if (request in mappedImports) {
          const newRequest = path.join(
            wallaby.projectCacheDir,
            'packages',
            'midnight-smoker',
            mappedImports[request],
          );
          return originalResolveFilename.call(this, newRequest, _parent);
        } else if (request.startsWith('#')) {
          // minimatch does not like a leading #
          const trimmedRequest = request.slice(1);

          const key = Object.keys(mappedImports).find((key) => {
            return minimatch(trimmedRequest, key.slice(1));
          });
          if (key) {
            const pattern = mappedImports[key];
            // zap leading #
            const trimmedKey = key.slice(1);
            // where is the magic?
            const magicIndex = trimmedKey.indexOf('*');
            // strip everything that matches _before_ the magic
            const wildname = trimmedRequest.slice(magicIndex);
            const newValue = pattern.replace('*', wildname);
            // given a request of `#foo/bar` matching `#foo/*`, this will be `bar`,
            // which is injected into the value matching `#foo/*` (e.g., `./src/foo/*.js`)
            // replace the magic with the rest of the request
            const newRequest = path.join(
              wallaby.projectCacheDir,
              'packages',
              'midnight-smoker',
              newValue,
            );
            return originalResolveFilename.call(this, newRequest, _parent);
          }
        }

        return originalResolveFilename.call(this, request, _parent);
      };
    },
  };
};
