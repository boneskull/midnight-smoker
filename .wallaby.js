'use strict';

module.exports = () => {
  return {
    env: {
      type: 'node',
      params: {
        env: 'DEBUG=midnight-smoker'
      }
    },
    files: [
      './src/*.js',
      'package.json',
      {pattern: '.husky/**/*', instrument: false}
    ],
    testFramework: 'mocha',
    tests: ['./test/*.spec.js'],
    runMode: 'onsave',
    setup(wallaby) {
      process.env.WALLABY_PROJECT_DIR = wallaby.localProjectDir;
    }
  };
};
