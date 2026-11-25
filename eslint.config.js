// Fast per-file checks. The full import rules live in .dependency-cruiser.cjs (see docs/import-rules.md);
// the restrictions below repeat the most common ones so an edit fails immediately, with the fix in the message.
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const prettierConfig = require('eslint-config-prettier');

const noClockOrRandom = [
  'error',
  {
    object: 'Date',
    property: 'now',
    message: 'Use the injected Clock (clock.now()) so tests can run in virtual time.',
  },
  {
    object: 'Math',
    property: 'random',
    message: 'Use the seeded Rng from @core/utils so runs are repeatable.',
  },
];

module.exports = defineConfig([
  expoConfig,
  prettierConfig,
  {
    ignores: ['node_modules/*', 'ios/*', 'android/*', '.expo/*', 'dist/*', 'coverage/*'],
  },
  {
    rules: { 'no-console': ['error', { allow: ['warn', 'error'] }] },
  },
  {
    files: ['**/*.ts', '**/*.tsx'],
    rules: { '@typescript-eslint/no-explicit-any': 'error' },
  },
  {
    files: ['src/core/**', 'src/common/**'],
    rules: { 'no-restricted-properties': noClockOrRandom },
  },
  {
    files: ['src/core/**'],
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
                '@maplibre/*',
                '@react-navigation/*',
              ],
              message:
                'core is pure TypeScript. Put platform code in managers/ behind a protocol in core/protocols.',
            },
            {
              group: ['@app/*', '@features/*', '@managers/*', '@common/*', '@lab/*'],
              message: 'core imports nothing outside core.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/features/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@managers/*', '@maplibre/*'],
              message:
                'Screens never touch managers. Get { session, MapView } from useManagers() in @common/di.',
            },
            {
              group: ['@core/engine', '@core/engine/*', '@core/sharing', '@core/sharing/*'],
              message:
                'Screens see only core/protocols, core/models and core/utils. Use the Session protocol.',
            },
            { group: ['@app/*', '@lab/*'], message: 'Features may import only core and common.' },
          ],
        },
      ],
    },
  },
  {
    files: ['src/managers/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                '@app/*',
                '@features/*',
                '@common/*',
                '@lab/*',
                '@core/engine',
                '@core/engine/*',
                '@core/sharing',
                '@core/sharing/*',
              ],
              message: 'Managers see only core/protocols, core/models and core/utils.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/lab/**', 'scripts/**'],
    rules: { 'no-console': 'off' },
  },
]);
