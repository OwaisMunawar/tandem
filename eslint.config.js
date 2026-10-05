// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const prettier = require('eslint-config-prettier');

module.exports = defineConfig([
  expoConfig,
  prettier,
  {
    ignores: [
      'dist/*',
      'coverage/*',
      '.expo/*',
      'ios/*',
      'android/*',
      'server/dist/*',
      'server/data/*',
    ],
  },
  {
    files: ['src/**/*.{ts,tsx}', 'server/src/**/*.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-imports': ['error', { fixStyle: 'inline-type-imports' }],
      'no-console': ['error', { allow: ['warn', 'error'] }],
    },
  },
  {
    // Components read and write the household through feature hooks and
    // repositories, never through TinyBase directly.
    files: ['src/**/*.tsx'],
    ignores: ['src/test-utils/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['tinybase', 'tinybase/*'],
              message: 'Use a feature hook or repository instead.',
            },
          ],
        },
      ],
    },
  },
  {
    // Domain code stays framework-free: it is shared with the server and
    // tested in plain Node.
    files: ['src/features/**/lib/**/*.ts'],
    ignores: ['src/features/**/lib/**/__tests__/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                'react',
                'react-native',
                'react-native-*',
                'expo',
                'expo-*',
                '@expo/*',
                '@/*',
              ],
              message: 'lib/ is pure TypeScript with relative imports only.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['server/src/main.ts'],
    rules: { 'no-console': 'off' },
  },
]);
