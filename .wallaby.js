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
      './src',
      {pattern: './bin/smoker.js', instrument: false},
      'package.json',
    ],
    testFramework: 'mocha',
    tests: ['./test/**/*.spec.ts'],
    runMode: 'onsave',
    setup(wallaby) {
      process.env.WALLABY_PROJECT_DIR = wallaby.localProjectDir;
    },
  };
};
