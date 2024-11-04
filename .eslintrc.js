/**
 * @type {import('eslint').Linter.Config}
 */
module.exports = {
  env: {
    es2020: true,
    node: true,
  },
  extends: [
    'eslint:recommended',
    'plugin:n/recommended',
    'plugin:perfectionist/recommended-natural-legacy',
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
  overrides: [
    // JS overrides
    {
      files: ['**/*.js', '**/*.mjs', '**/*.cjs'],
      overrides: [
        {
          files: '**/*.mjs',
          parserOptions: {
            ecmaVersion: 'latest',
            sourceType: 'module',
          },
          rules: {
            'n/no-unsupported-features/es-syntax': 'off',
          },
        },
      ],
      rules: {
        '@stylistic/js/lines-around-comment': [
          'warn',
          {
            allowClassStart: true,
            // these conflict with prettier, so we must allow them
            allowObjectStart: true,
            beforeBlockComment: true,
          },
        ],
        '@stylistic/js/semi': ['error', 'always'],
      },
    },

    // TS overrides
    {
      extends: ['plugin:@typescript-eslint/strict-type-checked'],
      files: '**/*.ts',
      overrides: [
        {
          env: {
            mocha: true,
          },
          files: ['**/test/**/*.ts'],
          overrides: [
            {
              extends: ['plugin:mocha/recommended'],
              files: ['**/test/**/*.spec.ts'],
              rules: {
                // conflicts with xstate's setup
                'mocha/no-nested-tests': 'off',
                // also
                'mocha/no-setup-in-describe': 'off',
              },
            },
          ],
          rules: {
            '@typescript-eslint/no-unsafe-argument': 'off',
            // mostly due to untyped unexpected assertion lib
            '@typescript-eslint/no-unsafe-assignment': 'off',
            '@typescript-eslint/no-unsafe-call': 'off',
            '@typescript-eslint/no-unsafe-member-access': 'off',
            '@typescript-eslint/no-unsafe-return': 'off',

            // using requires w/ rewiremock
            '@typescript-eslint/no-var-requires': 'off',

            // conflicts with sinon
            '@typescript-eslint/unbound-method': 'off',
          },
        },
      ],

      parser: '@typescript-eslint/parser',
      parserOptions: {
        project: true,
        tsconfigRootDir: __dirname,
      },
      rules: {
        '@stylistic/ts/lines-around-comment': [
          'warn',
          {
            allowArrayStart: true,
            allowBlockStart: true,
            allowClassStart: true,
            allowInterfaceStart: true,
            // these conflict with prettier, so we must allow them
            allowObjectStart: true,
            allowTypeStart: true,
            beforeBlockComment: true,
          },
        ],

        '@stylistic/ts/lines-between-class-members': 'error',

        '@stylistic/ts/padding-line-between-statements': [
          'error',
          {blankLine: 'always', next: 'export', prev: '*'},
        ],

        '@stylistic/ts/semi': ['error', 'always'],

        '@typescript-eslint/consistent-type-exports': [
          'error',
          {fixMixedExportsWithInlineTypeSpecifier: true},
        ],

        '@typescript-eslint/consistent-type-imports': [
          'error',
          {
            disallowTypeAnnotations: true,
            fixStyle: 'inline-type-imports',
            prefer: 'type-imports',
          },
        ],

        // and sometimes you gotta use any
        '@typescript-eslint/no-explicit-any': 'off',
        // this rule seems broken
        '@typescript-eslint/no-invalid-void-type': 'off',
        // HATE IT
        '@typescript-eslint/no-non-null-assertion': 'off',

        '@typescript-eslint/no-unnecessary-boolean-literal-compare': [
          'error',
          {
            allowComparingNullableBooleansToFalse: true,
            allowComparingNullableBooleansToTrue: true,
          },
        ],

        // too many false positives
        '@typescript-eslint/no-unnecessary-condition': 'off',

        '@typescript-eslint/no-unused-vars': [
          'error',
          {
            argsIgnorePattern: '^_',
            varsIgnorePattern: '^_',
          },
        ],

        // these 6 bytes add up
        '@typescript-eslint/require-await': 'off',

        // I like my template expressions, tyvm
        '@typescript-eslint/restrict-template-expressions': 'off',

        '@typescript-eslint/switch-exhaustiveness-check': 'error',

        '@typescript-eslint/unified-signatures': [
          'error',
          {
            ignoreDifferentlyNamedParameters: true,
          },
        ],

        'no-use-before-define': 'off',

        'perfectionist/sort-named-exports': [
          'error',
          {groupKind: 'values-first'},
        ],
      },
    },

    // JSON5 overrides
    {
      extends: ['plugin:jsonc/prettier'],
      files: ['**/tsconfig*.json', '**/*.json5', '**/*.jsonc'],
    },

    // script overrides
    {
      files: ['**/scripts/**/*'],
      rules: {
        'n/shebang': 'off',
      },
    },
  ],
  parserOptions: {
    sourceType: 'script',
  },
  plugins: ['@stylistic/ts', '@stylistic/js'],
  root: true,
  rules: {
    'n/no-extraneous-import': 'off',
    'n/no-extraneous-require': 'off',
    'n/no-missing-import': 'off',
    'n/no-missing-require': 'off',
    // either eslint-plugin-n's module resolution is busted or it's too confusing to configure properly
    'n/no-unpublished-bin': 'off',
    'n/no-unsupported-features/es-syntax': 'off',
    'no-empty': [
      'error',
      {
        allowEmptyCatch: true,
      },
    ],

    'no-useless-rename': 'error',

    'object-shorthand': 'error',
  },
};
