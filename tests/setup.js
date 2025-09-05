/**
 * Jest Setup File
 * Configure testing environment and global test utilities
 */

// Add custom matchers from jest-dom
import '@testing-library/jest-dom';

// Setup DOM environment
global.document = document;
global.window = window;

// Mock localStorage for testing
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.localStorage = localStorageMock;

// Mock common DOM elements
document.body.innerHTML = `
  <div id="canvas"></div>
  <div id="toolbar"></div>
  <div id="connections-container"></div>
  <div id="minimap"></div>
`;

// Setup global variables that the app expects
global.nodes = [];
global.connections = [];
global.nextNodeId = 1;
global.nextConnectionId = 1;
global.rootNodeId = null;
global.currentTool = 'select';
global.zoomLevel = 1;
global.canvasOffset = { x: 0, y: 0 };

// Mock functions that might not be available in test environment
global.showToast = jest.fn((message, isError) => {
  console.log(`Toast: ${message} ${isError ? '(Error)' : ''}`);
});

global.updateMinimap = jest.fn();
global.refreshConnections = jest.fn();
global.saveStateForUndo = jest.fn();

// Helper function to create test nodes
global.createTestNode = (overrides = {}) => {
  const defaults = {
    id: `node-test-${Date.now()}`,
    title: 'Test Node',
    content: '',
    x: 100,
    y: 100,
    color: '#4CAF50',
    shape: 'rectangle',
    isRoot: false
  };
  return { ...defaults, ...overrides };
};

// Helper function to create test connections
global.createTestConnection = (fromId, toId, overrides = {}) => {
  const defaults = {
    id: `conn-test-${Date.now()}`,
    from: fromId,
    to: toId,
    type: 'straight',
    label: '',
    style: 'solid',
    color: '#666'
  };
  return { ...defaults, ...overrides };
};

// Clean up after each test
afterEach(() => {
  // Reset global arrays
  global.nodes = [];
  global.connections = [];
  global.nextNodeId = 1;
  global.nextConnectionId = 1;
  global.rootNodeId = null;
  
  // Clear all mocks
  jest.clearAllMocks();
  
  // Reset DOM
  document.body.innerHTML = `
    <div id="canvas"></div>
    <div id="toolbar"></div>
    <div id="connections-container"></div>
    <div id="minimap"></div>
  `;
});

// Suppress console errors in tests unless explicitly testing error handling
const originalError = console.error;
beforeAll(() => {
  console.error = jest.fn((...args) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('Not implemented: navigation')
    ) {
      return;
    }
    originalError.call(console, ...args);
  });
});

afterAll(() => {
  console.error = originalError;
});