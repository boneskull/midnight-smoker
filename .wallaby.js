'use strict';

// const pkg = require('./packages/midnight-smoker/package.json');

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
    ],
    testFramework: 'mocha',
    tests: [
      './packages/*/test/**/*.spec.ts',
      '!./packages/*/test/e2e/**/*.spec.ts',
    ],
    setup(wallaby) {
      process.env.WALLABY_PROJECT_DIR = wallaby.localProjectDir;

      // const originalResolveFilename = Module._resolveFilename;

      // Module._resolveFilename = function (request, _parent) {
      //   if (request in pkg.imports) {
      //     return originalResolveFilename.call(
      //       this,
      //       path.join(
      //         wallaby.projectCacheDir,
      //         'packages',
      //         'midnight-smoker',
      //         pkg.imports[request],
      //       ),
      //       _parent,
      //     );
      //   }

      //   return originalResolveFilename.apply(this, arguments);
      // };
    },
  };
};
