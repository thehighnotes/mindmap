/**
 * ESLint Configuration for Mindmap Application
 * Code quality and consistency rules
 */

module.exports = {
  env: {
    browser: true,
    es2021: true,
    node: true,
    jest: true
  },
  
  extends: [
    'eslint:recommended'
  ],
  
  parserOptions: {
    ecmaVersion: 2021,
    sourceType: 'script' // Not using modules yet
  },
  
  globals: {
    // Global variables used in the application
    'nodes': 'writable',
    'connections': 'writable',
    'nextNodeId': 'writable',
    'nextConnectionId': 'writable',
    'rootNodeId': 'writable',
    'currentTool': 'writable',
    'zoomLevel': 'writable',
    'canvasOffset': 'writable',
    'canvas': 'readonly',
    'showToast': 'readonly',
    'updateMinimap': 'readonly',
    'refreshConnections': 'readonly',
    'saveStateForUndo': 'readonly',
    
    // New utilities
    'Logger': 'readonly',
    'LogLevel': 'readonly',
    'IdGenerator': 'readonly',
    'IdMigrator': 'readonly',
    'DOMSanitizer': 'readonly',
    'EventBus': 'readonly',
    'globalEventBus': 'readonly',
    'Events': 'readonly',
    'DOMCache': 'readonly',
    'CompatibilityManager': 'readonly',
    'debounce': 'readonly',
    'throttle': 'readonly'
  },
  
  rules: {
    // Error prevention
    'no-console': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
    'no-debugger': process.env.NODE_ENV === 'production' ? 'error' : 'warn',
    'no-alert': 'warn',
    
    // Best practices
    'eqeqeq': ['error', 'always', { null: 'ignore' }],
    'no-eval': 'error',
    'no-implied-eval': 'error',
    'no-new-func': 'error',
    'no-return-await': 'error',
    'no-self-compare': 'error',
    'no-throw-literal': 'error',
    'no-useless-concat': 'error',
    'prefer-promise-reject-errors': 'error',
    'radix': 'error',
    
    // Variables
    'no-unused-vars': ['warn', { 
      argsIgnorePattern: '^_',
      varsIgnorePattern: '^_'
    }],
    'no-use-before-define': ['error', { 
      functions: false,
      classes: true,
      variables: true 
    }],
    
    // Stylistic (basic, since we'll use Prettier for most formatting)
    'comma-dangle': ['warn', 'never'],
    'quotes': ['warn', 'single', { avoidEscape: true }],
    'semi': ['warn', 'always'],
    'no-trailing-spaces': 'warn',
    'no-multiple-empty-lines': ['warn', { max: 2, maxEOF: 1 }],
    
    // ES6
    'prefer-const': 'warn',
    'no-var': 'warn',
    'prefer-arrow-callback': 'warn',
    'prefer-template': 'warn',
    
    // Mindmap specific rules
    'no-inner-declarations': 'off', // We have some functions declared inside blocks
    'no-prototype-builtins': 'off', // Legacy code uses these
    'no-empty': ['warn', { allowEmptyCatch: true }]
  },
  
  overrides: [
    {
      // Test files
      files: ['**/*.test.js', '**/tests/**/*.js'],
      env: {
        jest: true
      },
      rules: {
        'no-console': 'off'
      }
    },
    {
      // New utility modules using modern patterns
      files: ['js/utils/**/*.js'],
      rules: {
        'no-var': 'error',
        'prefer-const': 'error'
      }
    }
  ],
  
  ignorePatterns: [
    'node_modules/',
    'dist/',
    '*.min.js',
    '*.backup.js',
    'electron-builder-config.js',
    '.claude/',
    'tests/setup.js' // Has intentional setup code
  ]
};