import {defineConfig, globalIgnores} from 'eslint/config';
import globals from 'globals';
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import stylistic from '@stylistic/eslint-plugin';

export default defineConfig([
  globalIgnores(['image-importer.user.js', 'compiled file']),
  {
    languageOptions: {
      ecmaVersion: 'latest',
      globals: {
        ...globals.browser,
        ...globals.greasemonkey,
      },
    },
    plugins: {
      js,
      '@stylistic': stylistic,
    },
    extends: [
      'js/recommended',
      stylistic.configs.customize({
        arrowParens: false,
        blockSpacing: true,
        braceStyle: '1tbs',
        indent: 2,
        jsx: false,
        quoteProps: 'consistent',
        quotes: 'single',
        semi: true,
        severity: 'warn',
      }),
    ],
  },
  {
    name: 'my-rules',
    rules: {
      'block-scoped-var': 'error',
      'no-debugger': 'warn',
      'no-console': 'off',
      'no-irregular-whitespace': 'error',
      'no-label-var': 'warn',
      'no-redeclare': ['error', {builtinGlobals: true}],
      'no-self-compare': 'error',
      'no-sparse-arrays': 'warn',
      'no-undef': 'warn',
      'no-unreachable': 'error',
      'no-unused-expressions': 'warn',
      'prefer-const': 'warn',
      'prefer-spread': 'warn',
      'valid-typeof': 'warn',
    },
  },
  {
    name: 'my-stylistic-rules',
    rules: {
      '@stylistic/arrow-parens': ['warn', 'as-needed', {requireForBlockBody: false}],
      '@stylistic/comma-dangle': ['warn', {
        'arrays': 'always-multiline',
        'dynamicImports': 'always-multiline',
        'enums': 'always-multiline',
        'exports': 'always-multiline',
        'functions': 'only-multiline',
        'importAttributes': 'always-multiline',
        'imports': 'always-multiline',
        'objects': 'only-multiline',
        'tuples': 'always-multiline',
      }],
      '@stylistic/function-call-spacing': ['warn', 'never'],
      '@stylistic/indent': ['error', 2, {
        'ArrayExpression': 1,
        'CallExpression': {arguments: 1},
        'flatTernaryExpressions': true,
        'FunctionDeclaration': {body: 1, parameters: 1, returnType: 1},
        'FunctionExpression': {body: 1, parameters: 1, returnType: 1},
        'ignoreComments': true,
        'ignoredNodes': [
          'TSUnionType',
          'TSIntersectionType',
          'TSTypeParameterInstantiation',
          'FunctionExpression > .params[decorators.length > 0]',
          'FunctionExpression > .params > :matches(Decorator, :not(:first-child))',
        ],
        'ImportDeclaration': 1,
        'MemberExpression': 1,
        'ObjectExpression': 1,
        'offsetTernaryExpressions': false,
        'outerIIFEBody': 'off',
        'SwitchCase': 1,
        'tabLength': 2,
        'VariableDeclarator': 'first',
      }],
      '@stylistic/key-spacing': ['error', {
        'afterColon': true,
        'beforeColon': false,
        'mode': 'minimum',
      }],
      '@stylistic/lines-between-class-members': 'off',
      '@stylistic/max-statements-per-line': 'off',
      '@stylistic/lines-around-comment': ['warn', {
        'beforeBlockComment': false,
        'beforeLineComment': false,
        'allowBlockStart': true,
      }],
      '@stylistic/member-delimiter-style': ['warn', {
        'multiline': {
          'delimiter': 'semi',
          'requireLast': true,
        },
        'singleline': {
          'delimiter': 'semi',
          'requireLast': false,
        },
        'multilineDetection': 'brackets',
        'overrides': {
          'typeLiteral': {
            'multiline': {
              'delimiter': 'comma',
              'requireLast': true,
            },
            'singleline': {
              'delimiter': 'comma',
              'requireLast': false,
            },
          },
        },
      }],
      '@stylistic/multiline-ternary': 'off',
      '@stylistic/no-extra-semi': 'warn',
      '@stylistic/no-multi-spaces': ['warn', {ignoreEOLComments: true}],
      '@stylistic/no-multiple-empty-lines': ['warn', {max: 2, maxBOF: 0, maxEOF: 0}],
      '@stylistic/object-curly-spacing': ['warn', 'never'],
      '@stylistic/padded-blocks': 'off',
      '@stylistic/quotes': ['error', 'single', {avoidEscape: true}],
      '@stylistic/switch-colon-spacing': 'warn',
      '@stylistic/wrap-iife': ['warn', 'inside', {functionPrototypeMethods: true}],
      '@stylistic/wrap-regex': 'warn',
    },
  },
  {
    name: 'my-rules-ts',
    extends: [
      tseslint.configs.recommended,
      tseslint.configs.stylistic,
    ],
    rules: {
      '@typescript-eslint/array-type': ['error', {
        'default': 'array-simple'
      }],
      '@typescript-eslint/consistent-type-definitions': 'off',
      '@typescript-eslint/consistent-indexed-object-style': 'off',
      '@typescript-eslint/no-explicit-any': ['error', {'ignoreRestArgs': true}],
      '@typescript-eslint/no-unused-vars': ['warn', {
        'args': 'all',
        'argsIgnorePattern': '^_',
        'caughtErrors': 'all',
        'caughtErrorsIgnorePattern': '^_',
        'destructuredArrayIgnorePattern': '^_',
        'varsIgnorePattern': '^_',
        'ignoreRestSiblings': true,
      }],
      '@typescript-eslint/no-inferrable-types': ['warn', {
        'ignoreParameters': true,
        'ignoreProperties': true,
      }],
      '@typescript-eslint/prefer-for-of': 'off',
    }
  },
]);
