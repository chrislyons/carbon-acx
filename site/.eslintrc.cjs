module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    sourceType: 'module',
    ecmaVersion: 2022,
    ecmaFeatures: {
      jsx: true
    }
  },
  env: {
    browser: true,
    es2022: true,
    node: true
  },
  plugins: ['@typescript-eslint', 'react-hooks', 'jsx-a11y', 'react-refresh', 'react'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
    'plugin:jsx-a11y/recommended',
    'prettier'
  ],
  settings: {
    react: {
      version: 'detect'
    }
  },
  ignorePatterns: ['dist', 'node_modules'],
  globals: {
    vi: 'readonly',
    describe: 'readonly',
    it: 'readonly',
    expect: 'readonly',
    beforeEach: 'readonly',
    beforeAll: 'readonly',
    afterEach: 'readonly',
    afterAll: 'readonly'
  },
  rules: {
    '@typescript-eslint/consistent-type-imports': ['warn', { prefer: 'type-imports' }],
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    '@typescript-eslint/no-explicit-any': 'off',
    'react-refresh/only-export-components': 'off',
    'jsx-a11y/no-autofocus': 'off',
    'jsx-a11y/no-noninteractive-element-interactions': 'off',
    'jsx-a11y/no-noninteractive-tabindex': 'off',
    'jsx-a11y/no-redundant-roles': 'off',
    'jsx-a11y/label-has-associated-control': 'off'
  },
  overrides: [
    {
      files: ['src/**/*.{ts,tsx}'],
      rules: {
        'no-restricted-imports': [
          'error',
          {
            patterns: [
              {
                group: ['node:*'],
                message: 'Do not import Node.js built-ins into client bundles.'
              }
            ]
          }
        ]
      }
    },
    {
      files: ['vite.config.ts', 'scripts/**/*.{ts,js,mjs,cjs}'],
      rules: {
        'no-restricted-imports': 'off'
      }
    },
    {
      files: ['__tests__/**/*.{ts,tsx}'],
      env: {
        jest: false
      },
      rules: {
        '@typescript-eslint/no-unsafe-assignment': 'off',
        '@typescript-eslint/no-unsafe-call': 'off',
        '@typescript-eslint/no-unsafe-member-access': 'off'
      }
    }
  ]
};
