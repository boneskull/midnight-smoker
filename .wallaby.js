'use strict';

module.exports = () => {
  return {
    env: {
      type: 'node',
      params: {
        env: 'DEBUG=midnight-smoker',
      },
    },
    files: [
      './src/**/*.ts',
      {pattern: './bin/smoker.js', instrument: false},
      {pattern: './test/unit/mocks.ts', instrument: false},
      'package.json',
      '!./src/cli.ts',
    ],
    testFramework: 'mocha',
    tests: ['./test/unit/**/*.spec.ts'],
    runMode: 'onsave',
    setup(wallaby) {
      process.env.WALLABY_PROJECT_DIR = wallaby.localProjectDir;
    },
  };
};
