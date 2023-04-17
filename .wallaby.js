'use strict';

module.exports = (wallaby) => {
  return {
    compilers: {
      '**/*.js': wallaby.compilers.typeScript({
        allowJs: true,
        allowSyntheticDefaultImports: true,
        resolveJsonModule: true,
        isolatedModules: true,
      }),
      '**/*.ts?(x)': wallaby.compilers.typeScript(),
    },
    env: {
      type: 'node',
      params: {
        env: 'DEBUG=midnight-smoker'
      }
    },
    files: [
      './src/*',
      './bin/*',
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
