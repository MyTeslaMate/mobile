/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['<rootDir>/__tests__/**/*.test.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  // ts-jest reads tsconfig.json; we keep its strict settings but disable
  // type-checking inside the transformer (jest already runs the compiled JS,
  // and `tsc --noEmit` covers types elsewhere). Faster + avoids picking up
  // unrelated type errors in the app tree.
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        diagnostics: false,
      },
    ],
  },
};
