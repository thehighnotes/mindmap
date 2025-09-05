/**
 * Logger Module - ES6 Version
 * Modern logging with enhanced features
 */

export class Logger {
    static #levels = {
        ERROR: 0,
        WARN: 1,
        INFO: 2,
        DEBUG: 3
    };

    static #currentLevel = Logger.#levels.INFO;
    static #history = [];
    static #maxHistorySize = 1000;
    static #filters = new Set();
    static #handlers = new Map();

    /**
     * Set the logging level
     */
    static setLevel(level) {
        const levelName = typeof level === 'string' ? level.toUpperCase() : 'INFO';
        this.#currentLevel = this.#levels[levelName] ?? this.#levels.INFO;
    }

    /**
     * Check if a level is enabled
     */
    static isEnabled(level) {
        const levelName = typeof level === 'string' ? level.toUpperCase() : level;
        const levelValue = this.#levels[levelName] ?? this.#levels.DEBUG;
        return levelValue <= this.#currentLevel;
    }

    /**
     * Add a filter to exclude certain messages
     */
    static addFilter(filter) {
        if (typeof filter === 'function') {
            this.#filters.add(filter);
        }
    }

    /**
     * Add a custom handler for log messages
     */
    static addHandler(name, handler) {
        if (typeof handler === 'function') {
            this.#handlers.set(name, handler);
        }
    }

    /**
     * Internal log method with modern features
     */
    static #log(level, message, ...args) {
        const levelValue = this.#levels[level];
        
        if (levelValue > this.#currentLevel) {
            return;
        }

        // Apply filters
        for (const filter of this.#filters) {
            if (!filter(level, message, args)) {
                return;
            }
        }

        const timestamp = new Date().toISOString();
        const logEntry = {
            timestamp,
            level,
            message,
            data: args.length === 1 ? args[0] : args.length > 1 ? args : undefined
        };

        // Add to history
        this.#history.push(logEntry);
        if (this.#history.length > this.#maxHistorySize) {
            this.#history.shift();
        }

        // Format console output
        const prefix = `[${timestamp}] [${level}]`;
        const style = this.#getStyle(level);
        
        // Output to console
        const consoleFn = this.#getConsoleFunction(level);
        if (args.length > 0) {
            consoleFn(`%c${prefix}%c ${message}`, style, '', ...args);
        } else {
            consoleFn(`%c${prefix}%c ${message}`, style, '');
        }

        // Call custom handlers
        for (const handler of this.#handlers.values()) {
            try {
                handler(logEntry);
            } catch (error) {
                console.error('Logger handler error:', error);
            }
        }
    }

    /**
     * Get console function based on level
     */
    static #getConsoleFunction(level) {
        switch (level) {
            case 'ERROR': return console.error.bind(console);
            case 'WARN': return console.warn.bind(console);
            case 'INFO': return console.info.bind(console);
            case 'DEBUG': return console.debug.bind(console);
            default: return console.log.bind(console);
        }
    }

    /**
     * Get style for console output
     */
    static #getStyle(level) {
        const styles = {
            ERROR: 'color: #ff0000; font-weight: bold;',
            WARN: 'color: #ff9800; font-weight: bold;',
            INFO: 'color: #2196f3;',
            DEBUG: 'color: #9e9e9e;'
        };
        return styles[level] || '';
    }

    // Public logging methods
    static error(message, ...args) {
        this.#log('ERROR', message, ...args);
    }

    static warn(message, ...args) {
        this.#log('WARN', message, ...args);
    }

    static info(message, ...args) {
        this.#log('INFO', message, ...args);
    }

    static debug(message, ...args) {
        this.#log('DEBUG', message, ...args);
    }

    /**
     * Log with timing
     */
    static time(label) {
        if (this.isEnabled('DEBUG')) {
            console.time(label);
        }
    }

    static timeEnd(label) {
        if (this.isEnabled('DEBUG')) {
            console.timeEnd(label);
        }
    }

    /**
     * Group logging
     */
    static group(label) {
        if (this.isEnabled('DEBUG')) {
            console.group(label);
        }
    }

    static groupEnd() {
        if (this.isEnabled('DEBUG')) {
            console.groupEnd();
        }
    }

    /**
     * Table logging for structured data
     */
    static table(data, columns) {
        if (this.isEnabled('DEBUG')) {
            console.table(data, columns);
        }
    }

    /**
     * Assert with logging
     */
    static assert(condition, message, ...args) {
        if (!condition) {
            this.error(`Assertion failed: ${message}`, ...args);
            if (process.env.NODE_ENV !== 'production') {
                throw new Error(`Assertion failed: ${message}`);
            }
        }
    }

    /**
     * Get log history
     */
    static getHistory(filter = {}) {
        let history = [...this.#history];
        
        if (filter.level) {
            history = history.filter(entry => entry.level === filter.level);
        }
        
        if (filter.since) {
            const sinceTime = new Date(filter.since).getTime();
            history = history.filter(entry => 
                new Date(entry.timestamp).getTime() >= sinceTime
            );
        }
        
        if (filter.search) {
            const searchLower = filter.search.toLowerCase();
            history = history.filter(entry => 
                entry.message.toLowerCase().includes(searchLower)
            );
        }
        
        return history;
    }

    /**
     * Clear log history
     */
    static clearHistory() {
        this.#history = [];
    }

    /**
     * Export logs as JSON
     */
    static exportLogs() {
        return JSON.stringify(this.#history, null, 2);
    }

    /**
     * Performance logging helper
     */
    static async measure(label, asyncFn) {
        const start = performance.now();
        try {
            const result = await asyncFn();
            const duration = performance.now() - start;
            this.debug(`${label} took ${duration.toFixed(2)}ms`);
            return result;
        } catch (error) {
            const duration = performance.now() - start;
            this.error(`${label} failed after ${duration.toFixed(2)}ms`, error);
            throw error;
        }
    }
}

// Create singleton instance for backward compatibility
export const logger = Logger;

// Default export
export default Logger;