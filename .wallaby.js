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
        pattern: './packages/plugin-typescript/template/**/*',
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
    workers: {recycle: true},
    setup(wallaby) {
      process.env.WALLABY = '1';
    },
  };
};
