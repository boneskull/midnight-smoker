/**
 * @type {import('eslint').Linter.Config}
 */
module.exports = {
  root: true,
  env: {
    es2020: true,
    node: true,
  },
  extends: ['semistandard', 'prettier', 'plugin:n/recommended'],

  rules: {
    // either eslint-plugin-n's module resolution is busted or it's too confusing to configure properly
    'n/no-unpublished-bin': 'off',
    'n/no-missing-import': 'off',
    'n/no-extraneous-import': 'off',
    'n/no-missing-require': 'off',
    'n/no-extraneous-require': 'off',
  },
  parserOptions: {
    sourceType: 'script',
  },
  overrides: [
    {
      files: '**/*.mjs',
      parserOptions: {
        sourceType: 'module',
        ecmaVersion: 'latest',
      },
      rules: {
        'n/no-unsupported-features/es-syntax': 'off',
      },
    },
    {
      files: '**/*.ts',
      extends: ['plugin:@typescript-eslint/strict-type-checked'],
      rules: {
        'no-use-before-define': 'off',

        // I like my template expressions, tyvm
        '@typescript-eslint/restrict-template-expressions': 'off',

        // and sometimes you gotta use any
        '@typescript-eslint/no-explicit-any': 'off',

        // these 6 bytes add up
        '@typescript-eslint/require-await': 'off',

        // unfortunately required when using Sets and Maps
        '@typescript-eslint/no-non-null-assertion': 'off',

        // this rule seems broken
        '@typescript-eslint/no-invalid-void-type': 'off',

        '@typescript-eslint/no-unnecessary-boolean-literal-compare': [
          'error',
          {
            allowComparingNullableBooleansToTrue: true,
            allowComparingNullableBooleansToFalse: true,
          },
        ],
        '@typescript-eslint/unified-signatures': [
          'error',
          {
            ignoreDifferentlyNamedParameters: true,
          },
        ],
        // too many false positives
        '@typescript-eslint/no-unnecessary-condition': 'off',

        // node's util.inspect() seems to be either a) unstable or b) nondeterministic
        '@typescript-eslint/no-restricted-imports': [
          'error',
          {
            paths: [
              {
                name: 'util',
                importNames: ['inspect'],
                message: 'Please use stringify-object package instead',
              },
              {
                name: 'node:util',
                importNames: ['inspect'],
                message: 'Please use stringify-object package instead',
              },
            ],
          },
        ],

        'n/no-unsupported-features/es-syntax': 'off',
      },

      parser: '@typescript-eslint/parser',
      parserOptions: {
        project: true,
        tsconfigRootDir: __dirname,
      },
      overrides: [
        {
          files: ['**/test/**/*.ts'],
          env: {
            mocha: true,
          },
          rules: {
            // mostly due to untyped unexpected assertion lib
            '@typescript-eslint/no-unsafe-assignment': 'off',
            '@typescript-eslint/no-unsafe-member-access': 'off',
            '@typescript-eslint/no-unsafe-call': 'off',
            '@typescript-eslint/no-unsafe-argument': 'off',
            '@typescript-eslint/no-unsafe-return': 'off',

            // using requires w/ rewiremock
            '@typescript-eslint/no-var-requires': 'off',

            // conflicts with sinon
            '@typescript-eslint/unbound-method': 'off',
            // 'no-useless-constructor': 'off',

            // safeParse() triggers this rule
            'n/no-path-concat': 'off',
          },
        },
      ],
    },
  ],
};
