/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',
  roots: ['<rootDir>/src', '<rootDir>/scripts'],
  moduleNameMapper: {
    '^@app/(.*)$': '<rootDir>/src/app/$1',
    '^@features/(.*)$': '<rootDir>/src/features/$1',
    '^@managers/(.*)$': '<rootDir>/src/managers/$1',
    '^@common/(.*)$': '<rootDir>/src/common/$1',
    '^@core/(.*)$': '<rootDir>/src/core/$1',
    '^@lab/(.*)$': '<rootDir>/src/lab/$1',
    '^@testing/(.*)$': '<rootDir>/src/testing/$1',
  },
  passWithNoTests: true,
  watchman: false, // the local Homebrew watchman is broken; plain file crawling is fast enough here
};
