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
        pattern: './packages/*/test/**/fixture/**/*',
        instrument: false,
      },
      {
        pattern: './packages/midnight-smoker/test/unit/mocks/nullpm',
        instrument: false,
      },
      './packages/*/dist/src/**/*',
      './packages/*/src/**/*.ts',
      './packages/*/test/**/*.ts',
      './packages/*/package.json',
      './packages/plugin-default/data/*.json',
      '!**/*.spec.ts',
      '!./packages/midnight-smoker/src/cli/**/*',
    ],
    filesWithNoCoverageCalculated: [
      './packages/*/dist/**/*',
      './packages/*/test/**/fixture/**/*',
      './packages/midnight-smoker/test/unit/mocks/**/*.ts',
    ],
    testFramework: 'mocha',
    tests: [
      './packages/midnight-smoker/test/unit/**/*.spec.ts',
      './packages/plugin-default/test/unit/**/*.spec.ts',
      './packages/test-util/test/unit/**/*.spec.ts',
      './packages/plugin-default/test/e2e/rules/**/*.spec.ts',
    ],
    // runMode: 'onsave',
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
