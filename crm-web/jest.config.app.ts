module.exports = {
  displayName: 'crm-web',
  preset: 'jest-preset-angular',
  coverageDirectory: './coverage/crm-web',
  setupFilesAfterEnv: ['<rootDir>/src/test-setup.ts'],
  testEnvironment: 'jsdom',
  moduleNameMapper: {
    '^@srm/(.*)$': '<rootDir>/libs/$1/src/index.ts',
    '^@crm-web/(.*)$': '<rootDir>/libs/$1/src/index.ts',
  },
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.[jt]s?(x)',
    '<rootDir>/src/**/*(*.)@(spec|test).[jt]s?(x)',
    '<rootDir>/libs/**/*(*.)@(spec|test).[jt]s?(x)',
  ],
};
