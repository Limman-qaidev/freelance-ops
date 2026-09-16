const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  ...expoConfig,
  {
    ignores: [
      '.expo/**',
      'dist/**',
      'web-build/**',
      'node_modules/**',
      'android/**',
      'ios/**',
    ],
  },
  {
    files: ['app/(tabs)/**/*.{ts,tsx}', 'src/ui/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'expo-sqlite',
              message:
                'UI code must access persistence through application/repository boundaries, never Expo SQLite directly.',
            },
          ],
          patterns: [
            {
              group: [
                '@/infrastructure/database/*',
                '**/infrastructure/database/*',
              ],
              message:
                'UI code must not import database infrastructure directly.',
            },
          ],
        },
      ],
    },
  },
]);
