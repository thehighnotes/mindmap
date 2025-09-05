/**
 * Logger - Production-ready logging system with levels
 * Replaces console.log statements for better performance and control
 */

const LogLevel = {
    ERROR: 0,
    WARN: 1,
    INFO: 2,
    DEBUG: 3
};

class Logger {
    static #level = LogLevel.INFO; // Default to INFO level
    static #isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    static #logHistory = [];
    static #maxHistorySize = 100;
    
    /**
     * Initialize logger with configuration
     * @param {Object} config - Logger configuration
     */
    static init(config = {}) {
        const {
            level = this.#isDevelopment ? LogLevel.DEBUG : LogLevel.ERROR,
            storeHistory = true,
            maxHistorySize = 100
        } = config;
        
        this.#level = level;
        this.#maxHistorySize = maxHistorySize;
        
        if (!storeHistory) {
            this.#logHistory = null;
        }
        
        // In production, override console methods to prevent accidental logs
        if (!this.#isDevelopment) {
            this.#overrideConsoleMethods();
        }
    }
    
    /**
     * Set logging level
     * @param {number} level - Log level from LogLevel enum
     */
    static setLevel(level) {
        this.#level = level;
    }
    
    /**
     * Get current logging level
     * @returns {number} Current log level
     */
    static getLevel() {
        return this.#level;
    }
    
    /**
     * Log error messages (always shown)
     */
    static error(...args) {
        if (this.#level >= LogLevel.ERROR) {
            console.error('[ERROR]', ...args);
            this.#addToHistory('ERROR', args);
        }
    }
    
    /**
     * Log warning messages
     */
    static warn(...args) {
        if (this.#level >= LogLevel.WARN) {
            console.warn('[WARN]', ...args);
            this.#addToHistory('WARN', args);
        }
    }
    
    /**
     * Log info messages
     */
    static info(...args) {
        if (this.#level >= LogLevel.INFO) {
            console.info('[INFO]', ...args);
            this.#addToHistory('INFO', args);
        }
    }
    
    /**
     * Log debug messages (only in development)
     */
    static debug(...args) {
        if (this.#level >= LogLevel.DEBUG) {
            console.log('[DEBUG]', ...args);
            this.#addToHistory('DEBUG', args);
        }
    }
    
    /**
     * Log performance metrics
     */
    static performance(label, startTime) {
        if (this.#level >= LogLevel.DEBUG) {
            const duration = performance.now() - startTime;
            console.log(`[PERF] ${label}: ${duration.toFixed(2)}ms`);
            this.#addToHistory('PERF', [label, duration]);
        }
    }
    
    /**
     * Create a grouped log
     */
    static group(label) {
        if (this.#level >= LogLevel.DEBUG) {
            console.group(label);
        }
    }
    
    /**
     * End a grouped log
     */
    static groupEnd() {
        if (this.#level >= LogLevel.DEBUG) {
            console.groupEnd();
        }
    }
    
    /**
     * Log a table (useful for debugging data structures)
     */
    static table(data, columns) {
        if (this.#level >= LogLevel.DEBUG && console.table) {
            console.table(data, columns);
        }
    }
    
    /**
     * Assert a condition and log if it fails
     */
    static assert(condition, ...args) {
        if (!condition) {
            this.error('Assertion failed:', ...args);
        }
    }
    
    /**
     * Add log entry to history
     * @private
     */
    static #addToHistory(level, args) {
        if (!this.#logHistory) return;
        
        const entry = {
            timestamp: new Date().toISOString(),
            level,
            message: args.map(arg => {
                if (typeof arg === 'object') {
                    try {
                        return JSON.stringify(arg);
                    } catch (e) {
                        return String(arg);
                    }
                }
                return String(arg);
            }).join(' ')
        };
        
        this.#logHistory.push(entry);
        
        // Limit history size
        if (this.#logHistory.length > this.#maxHistorySize) {
            this.#logHistory.shift();
        }
    }
    
    /**
     * Get log history
     * @returns {Array} Log history entries
     */
    static getHistory() {
        return this.#logHistory ? [...this.#logHistory] : [];
    }
    
    /**
     * Clear log history
     */
    static clearHistory() {
        if (this.#logHistory) {
            this.#logHistory = [];
        }
    }
    
    /**
     * Export log history as string
     * @returns {string} Formatted log history
     */
    static exportHistory() {
        if (!this.#logHistory) return '';
        
        return this.#logHistory.map(entry => {
            return `[${entry.timestamp}] [${entry.level}] ${entry.message}`;
        }).join('\n');
    }
    
    /**
     * Override console methods in production
     * @private
     */
    static #overrideConsoleMethods() {
        const noop = () => {};
        
        // Only override in production
        if (this.#level < LogLevel.DEBUG) {
            console.log = noop;
        }
        if (this.#level < LogLevel.INFO) {
            console.info = noop;
        }
        if (this.#level < LogLevel.WARN) {
            console.warn = noop;
        }
        // Never override console.error
    }
    
    /**
     * Create a logger instance with a specific prefix
     * @param {string} prefix - Prefix for all log messages
     * @returns {Object} Logger instance with prefixed methods
     */
    static create(prefix) {
        return {
            error: (...args) => Logger.error(`[${prefix}]`, ...args),
            warn: (...args) => Logger.warn(`[${prefix}]`, ...args),
            info: (...args) => Logger.info(`[${prefix}]`, ...args),
            debug: (...args) => Logger.debug(`[${prefix}]`, ...args)
        };
    }
}

// Initialize with default settings
Logger.init();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Logger, LogLevel };
}

// Make available globally for gradual migration
window.Logger = Logger;
window.LogLevel = LogLevel;