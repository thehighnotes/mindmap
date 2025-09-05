/**
 * Unit tests for Logger
 */

describe('Logger', () => {
  let consoleLogSpy;
  let consoleErrorSpy;
  let consoleWarnSpy;
  let consoleInfoSpy;
  
  beforeEach(() => {
    // Spy on console methods
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
    consoleInfoSpy = jest.spyOn(console, 'info').mockImplementation();
    
    // Reset logger
    if (window.Logger) {
      window.Logger.clearHistory();
      window.Logger.setLevel(window.LogLevel.DEBUG);
    }
  });
  
  afterEach(() => {
    // Restore console methods
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleInfoSpy.mockRestore();
  });
  
  describe('Log Levels', () => {
    test('should respect log level settings', () => {
      window.Logger.setLevel(window.LogLevel.ERROR);
      
      window.Logger.debug('debug message');
      window.Logger.info('info message');
      window.Logger.warn('warning message');
      window.Logger.error('error message');
      
      expect(consoleLogSpy).not.toHaveBeenCalled();
      expect(consoleInfoSpy).not.toHaveBeenCalled();
      expect(consoleWarnSpy).not.toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalledWith('[ERROR]', 'error message');
    });
    
    test('should log all levels when set to DEBUG', () => {
      window.Logger.setLevel(window.LogLevel.DEBUG);
      
      window.Logger.debug('debug');
      window.Logger.info('info');
      window.Logger.warn('warn');
      window.Logger.error('error');
      
      expect(consoleLogSpy).toHaveBeenCalledWith('[DEBUG]', 'debug');
      expect(consoleInfoSpy).toHaveBeenCalledWith('[INFO]', 'info');
      expect(consoleWarnSpy).toHaveBeenCalledWith('[WARN]', 'warn');
      expect(consoleErrorSpy).toHaveBeenCalledWith('[ERROR]', 'error');
    });
  });
  
  describe('Log Methods', () => {
    beforeEach(() => {
      window.Logger.setLevel(window.LogLevel.DEBUG);
    });
    
    test('error() should log errors', () => {
      window.Logger.error('Test error', { code: 500 });
      
      expect(consoleErrorSpy).toHaveBeenCalledWith('[ERROR]', 'Test error', { code: 500 });
    });
    
    test('warn() should log warnings', () => {
      window.Logger.warn('Test warning');
      
      expect(consoleWarnSpy).toHaveBeenCalledWith('[WARN]', 'Test warning');
    });
    
    test('info() should log info messages', () => {
      window.Logger.info('Test info');
      
      expect(consoleInfoSpy).toHaveBeenCalledWith('[INFO]', 'Test info');
    });
    
    test('debug() should log debug messages', () => {
      window.Logger.debug('Test debug', 'extra', 'args');
      
      expect(consoleLogSpy).toHaveBeenCalledWith('[DEBUG]', 'Test debug', 'extra', 'args');
    });
  });
  
  describe('Performance Logging', () => {
    test('performance() should calculate and log duration', () => {
      const startTime = performance.now() - 100; // 100ms ago
      
      window.Logger.setLevel(window.LogLevel.DEBUG);
      window.Logger.performance('TestOperation', startTime);
      
      expect(consoleLogSpy).toHaveBeenCalled();
      const call = consoleLogSpy.mock.calls[0];
      expect(call[0]).toMatch(/\[PERF\] TestOperation: \d+\.\d+ms/);
    });
  });
  
  describe('History', () => {
    test('should store log history', () => {
      window.Logger.setLevel(window.LogLevel.DEBUG);
      
      window.Logger.info('Message 1');
      window.Logger.error('Message 2');
      
      const history = window.Logger.getHistory();
      
      expect(history).toHaveLength(2);
      expect(history[0].level).toBe('INFO');
      expect(history[0].message).toContain('Message 1');
      expect(history[1].level).toBe('ERROR');
      expect(history[1].message).toContain('Message 2');
    });
    
    test('clearHistory() should clear log history', () => {
      window.Logger.info('Test message');
      expect(window.Logger.getHistory()).toHaveLength(1);
      
      window.Logger.clearHistory();
      expect(window.Logger.getHistory()).toHaveLength(0);
    });
    
    test('exportHistory() should export formatted history', () => {
      window.Logger.setLevel(window.LogLevel.DEBUG);
      window.Logger.info('Test message');
      
      const exported = window.Logger.exportHistory();
      
      expect(exported).toMatch(/\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\] \[INFO\] Test message/);
    });
  });
  
  describe('Utility Methods', () => {
    test('group() and groupEnd() should work', () => {
      const groupSpy = jest.spyOn(console, 'group').mockImplementation();
      const groupEndSpy = jest.spyOn(console, 'groupEnd').mockImplementation();
      
      window.Logger.setLevel(window.LogLevel.DEBUG);
      window.Logger.group('Test Group');
      window.Logger.groupEnd();
      
      expect(groupSpy).toHaveBeenCalledWith('Test Group');
      expect(groupEndSpy).toHaveBeenCalled();
      
      groupSpy.mockRestore();
      groupEndSpy.mockRestore();
    });
    
    test('table() should call console.table', () => {
      const tableSpy = jest.spyOn(console, 'table').mockImplementation();
      
      window.Logger.setLevel(window.LogLevel.DEBUG);
      const data = [{ id: 1, name: 'Test' }];
      window.Logger.table(data);
      
      expect(tableSpy).toHaveBeenCalledWith(data, undefined);
      
      tableSpy.mockRestore();
    });
    
    test('assert() should log error when condition fails', () => {
      window.Logger.assert(false, 'Assertion failed');
      
      expect(consoleErrorSpy).toHaveBeenCalledWith('[ERROR]', 'Assertion failed:', 'Assertion failed');
    });
    
    test('assert() should not log when condition passes', () => {
      window.Logger.assert(true, 'Should not log');
      
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });
  });
  
  describe('Created Instances', () => {
    test('create() should return logger with prefix', () => {
      const nodeLogger = window.Logger.create('NodeManager');
      
      window.Logger.setLevel(window.LogLevel.DEBUG);
      nodeLogger.info('Creating node');
      
      expect(consoleInfoSpy).toHaveBeenCalledWith('[INFO]', '[NodeManager]', 'Creating node');
    });
  });
  
  describe('LogLevel Constants', () => {
    test('should have correct log level values', () => {
      expect(window.LogLevel.ERROR).toBe(0);
      expect(window.LogLevel.WARN).toBe(1);
      expect(window.LogLevel.INFO).toBe(2);
      expect(window.LogLevel.DEBUG).toBe(3);
    });
  });
});