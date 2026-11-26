// Import rules: an allow-list. An import that matches no `allowed` rule fails `pnpm verify`.
// docs/import-rules.md is generated from the `comment` fields below (`pnpm gen:rules`) — edit here, not there.

// A "unit" is one folder you import through its index.ts: app, or features/x, managers/x, common/x, core/x, lab/x, testing/x.
const UNIT = '(?:(?:features|managers|common|core|lab|testing)/[^/]+|app)';
const CORE_BASE = '^src/core/(?:protocols|models|utils)/';
const npm = (...pkgs) => `^node_modules/(?:@types/)?(?:${pkgs.join('|')})/`;
const REACT = ['react', 'react-native'];

/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  allowed: [
    {
      comment: 'same-folder — Any file may import files in its own folder.',
      from: { path: `^src/(${UNIT})/` },
      to: { path: '^src/$1/' },
    },
    {
      comment: 'app — app/ (start-up wiring) may import everything.',
      from: { path: '^src/app/' },
      to: { path: '^(?:src|node_modules|modules|assets)/' },
    },
    {
      comment: 'lab — lab/ (dev-only tools) may import everything except app/.',
      from: { path: '^src/lab/' },
      to: { path: '^(?:src/(?!app/)|node_modules/|modules/|assets/)' },
    },
    {
      comment:
        'testing — testing/ (fakes, contracts) may import everything; only test files may import it.',
      from: { path: '^src/testing/' },
      to: { path: '^(?:src|node_modules)/' },
    },
    {
      comment:
        'tests — Test files (*.test.ts, *.test.tsx) may also import testing/ and test libraries.',
      from: { path: '\\.test\\.tsx?$' },
      to: { path: '^(?:src/testing/|node_modules/)' },
    },
    {
      comment:
        'features-core — features/* may import core/protocols, core/models and core/utils — never core/engine or core/sharing.',
      from: { path: '^src/features/' },
      to: { path: CORE_BASE },
    },
    {
      comment: 'features-common — features/* may import common/*.',
      from: { path: '^src/features/' },
      to: { path: '^src/common/' },
    },
    {
      comment:
        'features-libraries — features/* may import React, React Native, React Navigation, safe-area, Reanimated and Gesture Handler.',
      from: { path: '^src/features/' },
      to: {
        path: npm(
          ...REACT,
          '@react-navigation/[^/]+',
          'react-native-safe-area-context',
          'react-native-reanimated',
          'react-native-gesture-handler',
        ),
      },
    },
    {
      comment: 'managers-core — managers/* may import core/protocols, core/models and core/utils.',
      from: { path: '^src/managers/' },
      to: { path: CORE_BASE },
    },
    {
      comment:
        'managers-map-libraries — managers/map is the only folder that may import MapLibre (plus React, React Native, Reanimated and the bundled map style).',
      from: { path: '^src/managers/map/' },
      to: {
        path: `(?:${npm(...REACT, '@maplibre/maplibre-react-native', 'geojson', 'react-native-reanimated', 'react-native-worklets')}|^assets/map-style/)`,
      },
    },
    {
      comment:
        'managers-device-libraries — managers/device is the only folder that may import expo-battery and modules/rtls-thermal (plus React Native).',
      from: { path: '^src/managers/device/' },
      to: {
        path: `(?:${npm('react-native', 'expo-battery', 'expo-modules-core')}|^modules/rtls-thermal/)`,
      },
    },
    {
      comment:
        'managers-storage-libraries — managers/storage is the only folder that may import AsyncStorage.',
      from: { path: '^src/managers/storage/' },
      to: { path: npm('@react-native-async-storage/async-storage') },
    },
    {
      comment: 'common-core — common/* may import core/protocols, core/models and core/utils.',
      from: { path: '^src/common/' },
      to: { path: CORE_BASE },
    },
    {
      comment: 'common-ui-utils — common/ui may import common/utils.',
      from: { path: '^src/common/ui/' },
      to: { path: '^src/common/utils/' },
    },
    {
      comment:
        'common-libraries — common/* may import React, React Native, React Navigation types and safe-area.',
      from: { path: '^src/common/' },
      to: { path: npm(...REACT, '@react-navigation/[^/]+', 'react-native-safe-area-context') },
    },
    {
      comment:
        'core-engine-sharing-sessions — core/engine, core/sharing and core/sessions may import core/protocols, core/models and core/utils; only app/, lab/ and testing/ may import them.',
      from: { path: '^src/core/(?:engine|sharing|sessions)/' },
      to: { path: CORE_BASE },
    },
    {
      comment: 'core-protocols — core/protocols may import core/models and core/utils.',
      from: { path: '^src/core/protocols/' },
      to: { path: '^src/core/(?:models|utils)/' },
    },
    {
      comment: 'core-models — core/models may import core/utils. core/utils imports nothing.',
      from: { path: '^src/core/models/' },
      to: { path: '^src/core/utils/' },
    },
  ],
  allowedSeverity: 'error',

  forbidden: [
    {
      name: 'no-circular',
      severity: 'error',
      comment:
        'No import cycles. Move the shared piece down a layer (usually core/models or core/utils).',
      from: {},
      to: { circular: true },
    },
    {
      name: 'index-only',
      severity: 'error',
      comment:
        "Import another folder only through its index.ts (e.g. '@core/protocols', not '@core/protocols/feed'). Export what you need from that index.",
      from: { path: `^src/(${UNIT})/` },
      to: {
        path: `^src/${UNIT}/(?!index\\.tsx?$).+`,
        pathNot: '^src/$1/',
      },
    },
    {
      name: 'not-to-unresolvable',
      severity: 'error',
      comment:
        'This import does not resolve. Check the path alias or install the package with npx expo install.',
      from: {},
      to: { couldNotResolve: true },
    },
  ],

  options: {
    doNotFollow: { path: 'node_modules' },
    tsPreCompilationDeps: true,
    tsConfig: { fileName: 'tsconfig.json' },
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['import', 'require', 'node', 'default', 'react-native'],
      extensions: ['.ts', '.tsx', '.d.ts', '.js', '.jsx', '.json'],
      mainFields: ['react-native', 'main', 'types', 'typings'],
    },
    reporterOptions: {
      text: { highlightFocused: true },
    },
  },
};
