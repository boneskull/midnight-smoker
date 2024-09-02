// @ts-check
const path = require('node:path');
('use strict');

const pathKey = ((options = {}) => {
  const {env = process.env, platform = process.platform} = options;

  if (platform !== 'win32') {
    return 'PATH';
  }

  return (
    Object.keys(env)
      .reverse()
      .find((key) => key.toUpperCase() === 'PATH') || 'Path'
  );
})();
/**
 * @returns {import('wallabyjs').IWallabyConfig}
 */
module.exports = (wallaby) => {
  const mocksPath = path.resolve(
    __dirname,
    'packages/midnight-smoker/test/unit/mocks',
  );
  return {
    env: {
      type: 'node',
      params: {
        env: `DEBUG=midnight-smoker*;PATH=${mocksPath}${path.delimiter}${process.env[pathKey]}`,
      },
    },
    compilers: {
      '**/*.?(m)ts?(x)': wallaby.compilers.typeScript({
        typescript: require('typescript'),
      }),
    },
    files: [
      {
        pattern: './packages/midnight-smoker/bin/smoker.js',
        instrument: false,
      },
      {
        pattern: './packages/midnight-smoker/test/**/fixture/**/*',
        instrument: false,
      },
      {
        pattern: './packages/plugin-default/test/**/fixture/**/*',
        instrument: false,
      },
      {
        pattern: './packages/midnight-smoker/test/unit/mocks/nullpm',
        instrument: false,
      },
      './packages/midnight-smoker/test/**/*.ts',
      './packages/midnight-smoker/src/**/*.ts',
      './packages/midnight-smoker/package.json',
      './packages/plugin-default/data/*.json',
      './packages/plugin-default/src/**/*.ts',
      './packages/plugin-default/package.json',
      './packages/plugin-default/test/**/*.ts',
      // './packages/test-util/src/**/*.ts',
      // './packages/test-util/package.json',
      '!**/*.spec.ts',
    ],
    filesWithNoCoverageCalculated: [
      './packages/midnight-smoker/test/unit/mocks/**/*.ts',
      './packages/midnight-smoker/test/e2e/cli-helpers.ts',
      './packages/midnight-smoker/test/assertions.ts',
      './packages/midnight-smoker/test/debug.ts',
    ],
    testFramework: 'mocha',
    tests: [
      './packages/midnight-smoker/test/**/*.spec.ts',
      './packages/plugin-default/test/**/*.spec.ts',
      // './packages/test-util/test/**/*.spec.ts',
      '!**/e2e/**/*.spec.ts',
    ],
    runMode: 'onsave',
    debug: true,
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
          value.replace('dist/src', 'src'),
        ]),
      );

      // @ts-expect-error private API
      const originalResolveFilename = Module._resolveFilename;

      /**
       * @param {string} request
       * @param {unknown} _parent
       * @returns {unknown}
       */
      // @ts-expect-error private API
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
