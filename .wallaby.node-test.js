module.exports = {
  autoDetect: ['node:test'],
  files: [
    'packages/{pkg-manager,tarball-installer,midnight-smoker}/**/*.ts',
    '!**/node_modules/**',
    '!**/dist/**',
    '!**/*.{test,spec}.?(c|m)[jt]s?(x)',
  ],
  preloadModules: ['tsx/cjs'],
  tests: [
    '!**/node_modules/**',
    'packages/pkg-manager/test/**/*.test.ts',
    'packages/tarball-installer/test/**/*.test.ts',
  ],
  env: {
    type: 'node',
    params: {
      env: `DEBUG=midnight-smoker:pkg-manager:*;WALLABY=1`,
    },
  },
};
