/*
 * Two projects: the app runs under jest-expo, the sync server under plain
 * Node so its tests exercise a real WebSocket server on a real port.
 */
const esmPackages = [
  'tinybase',
  'ai',
  '@ai-sdk',
  '@workflow',
  'eventsource-parser',
  '@standard-schema',
];

/** @type {import('jest').Config} */
module.exports = {
  // Server tests open real sockets; screen tests pay the transform cost once.
  testTimeout: 20_000,
  projects: [
    {
      displayName: 'app',
      preset: 'jest-expo/ios',
      // Worklets ships native-only entry points; this resolver picks the JS ones.
      resolver: 'react-native-worklets/jest/resolver',
      setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
      roots: ['<rootDir>/src'],
      transformIgnorePatterns: [
        `node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|expo-.*|${esmPackages.join('|')}))`,
      ],
    },
    {
      displayName: 'server',
      testEnvironment: 'node',
      roots: ['<rootDir>/server/src'],
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
        '^expo-crypto$': '<rootDir>/server/src/__tests__/expoCryptoShim.ts',
      },
      testPathIgnorePatterns: ['/__tests__/(helpers|expoCryptoShim)\\.ts$'],
      transformIgnorePatterns: [`node_modules/(?!(${esmPackages.join('|')})/)`],
    },
  ],
  // Domain logic, repositories and sync carry the 90% gate. Screens are
  // covered by component tests and Maestro flows instead of line counts.
  collectCoverageFrom: [
    'src/features/**/lib/**/*.ts',
    'src/features/**/data/**/*.ts',
    'src/features/**/parsers/**/*.ts',
    'src/core/store/**/*.ts',
    'src/core/errors/**/*.ts',
    'server/src/**/*.ts',
    '!**/__tests__/**',
    // Entry points and thin adapters over native modules, exercised on device.
    '!server/src/main.ts',
    '!src/core/store/nativePersistence.ts',
    '!src/features/widget/data/nativeWidget.ts',
    '!src/features/reminders/data/expoNotifications.ts',
    '!src/**/index.ts',
  ],
  coverageThreshold: {
    global: { lines: 90, statements: 90, functions: 90, branches: 80 },
  },
  coverageReporters: ['text-summary', 'lcov'],
};
