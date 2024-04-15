/**
 * @type {import('eslint').Linter.Config}
 */
module.exports = {
  root: true,
  env: {
    es2020: true,
    node: true,
  },
  extends: ['eslint:recommended', 'plugin:n/recommended'],
  plugins: ['@stylistic/ts', '@stylistic/js'],
  rules: {
    // either eslint-plugin-n's module resolution is busted or it's too confusing to configure properly
    'n/no-unpublished-bin': 'off',
    'n/no-missing-import': 'off',
    'n/no-extraneous-import': 'off',
    'n/no-missing-require': 'off',
    'n/no-extraneous-require': 'off',
    'n/no-unsupported-features/es-syntax': 'off',

    'no-empty': [
      'error',
      {
        allowEmptyCatch: true,
      },
    ],

    'object-shorthand': 'error',
  },
  parserOptions: {
    sourceType: 'script',
  },
  overrides: [
    // JS overrides
    {
      files: ['**/*.js', '**/*.mjs', '**/*.cjs'],
      rules: {
        '@stylistic/js/semi': ['error', 'always'],
        '@stylistic/js/lines-around-comment': [
          'warn',
          {
            beforeBlockComment: true,
            // these conflict with prettier, so we must allow them
            allowObjectStart: true,
            allowClassStart: true,
          },
        ],
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
      ],
    },

    // TS overrides
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

        // node's util.inspect() seems to be either nondeterministic across platforms,
        // which makes it difficult to take snapshots of its output
        '@typescript-eslint/no-restricted-imports': [
          'warn',
          {
            paths: [
              {
                name: 'util',
                importNames: ['inspect'],
                message: 'Use stringify-object package if possible',
              },
              {
                name: 'node:util',
                importNames: ['inspect'],
                message: 'Use stringify-object package if possible',
              },
            ],
          },
        ],

        '@typescript-eslint/consistent-type-imports': [
          'error',
          {
            disallowTypeAnnotations: true,
            fixStyle: 'inline-type-imports',
            prefer: 'type-imports',
          },
        ],

        '@typescript-eslint/consistent-type-exports': [
          'error',
          {fixMixedExportsWithInlineTypeSpecifier: true},
        ],

        '@stylistic/ts/lines-around-comment': [
          'warn',
          {
            beforeBlockComment: true,
            // these conflict with prettier, so we must allow them
            allowObjectStart: true,
            allowClassStart: true,
            allowInterfaceStart: true,
            allowBlockStart: true,
            allowArrayStart: true,
            allowTypeStart: true,
          },
        ],

        '@stylistic/ts/semi': ['error', 'always'],

        '@stylistic/ts/padding-line-between-statements': [
          'error',
          {blankLine: 'always', prev: '*', next: 'export'},
        ],

        '@stylistic/ts/lines-between-class-members': 'error',
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
          },
        },
      ],
    },

    // JSON5 overrides
    {
      files: ['**/tsconfig*.json', '**/*.json5', '**/*.jsonc'],
      extends: ['plugin:jsonc/prettier'],
    },

    // script overrides
    {
      files: ['**/scripts/**/*'],
      rules: {
        'n/shebang': 'off',
      },
    },
  ],
  ignorePatterns: [
    'node_modules',
    'coverage',
    'dist',
    '__snapshots__',
    '*.tpl',
    'fixture',
    'docs/api',
    'example',
    '.astro',
    'env.d.ts',
  ],
};
