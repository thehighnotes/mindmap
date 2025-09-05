/**
 * Jest Configuration for Mindmap Application
 * Testing framework setup for unit and integration tests
 */

module.exports = {
  // Use jsdom environment for DOM testing
  testEnvironment: 'jsdom',
  
  // Setup files to run before tests
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  
  // Test file patterns
  testMatch: [
    '**/tests/**/*.test.js',
    '**/__tests__/**/*.js'
  ],
  
  // Coverage configuration
  collectCoverageFrom: [
    'js/**/*.js',
    '!js/**/*.backup.js',
    '!js/**/*.min.js',
    '!node_modules/**',
    '!tests/**'
  ],
  
  // Coverage thresholds (start low, increase over time)
  coverageThreshold: {
    global: {
      branches: 10,
      functions: 10,
      lines: 10,
      statements: 10
    }
  },
  
  // Module name mapping for imports
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/js/$1',
    '^@utils/(.*)$': '<rootDir>/js/utils/$1'
  },
  
  // Transform files
  transform: {
    '^.+\\.js$': ['babel-jest', {
      presets: [['@babel/preset-env', { targets: { node: 'current' } }]]
    }]
  },
  
  // Ignore patterns
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/.claude/'
  ],
  
  // Verbose output
  verbose: true,
  
  // Clear mocks between tests
  clearMocks: true,
  
  // Restore mocks after each test
  restoreMocks: true
};