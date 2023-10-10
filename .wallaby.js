'use strict';

module.exports = () => {
  return {
    env: {
      type: 'node',
      params: {
        env: 'DEBUG=midnight-smoker*',
      },
    },
    files: [
      './packages/*/src/**/*.ts',
      {
        pattern: './packages/midnight-smoker/bin/smoker.js',
        instrument: false,
      },
      './packages/midnight-smoker/test/unit/mocks.ts',
      './packages/midnight-smoker/test/unit/test-plugin.ts',
      './packages/*/package.json',
      '!./packages/midnight-smoker/src/cli.ts',
      {
        pattern: './packages/*/data/*.json',
        instrument: false,
      },
      './packages/*/test/harness.ts',
      {
        pattern: './packages/*/test/**/fixture/**/*',
        instrument: false,
      },
    ],
    testFramework: 'mocha',
    tests: [
      './packages/*/test/**/*.spec.ts',
      '!./packages/*/test/e2e/**/*.spec.ts',
    ],
    runMode: 'onsave',
    setup(wallaby) {
      process.env.WALLABY_PROJECT_DIR = wallaby.localProjectDir;
    },
  };
};
