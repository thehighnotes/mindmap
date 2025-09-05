/**
 * ModernHelpers - Utility functions using modern ES6+ features
 * Showcases modern array/object methods and syntax
 */

/**
 * Array utilities using modern methods
 */
export class ArrayUtils {
    /**
     * Group array items by a key using reduce
     */
    static groupBy(array, keyFn) {
        return array.reduce((groups, item) => {
            const key = typeof keyFn === 'function' ? keyFn(item) : item[keyFn];
            return {
                ...groups,
                [key]: [...(groups[key] ?? []), item]
            };
        }, {});
    }

    /**
     * Unique values using Set
     */
    static unique(array, keyFn = null) {
        if (keyFn) {
            const seen = new Set();
            return array.filter(item => {
                const key = typeof keyFn === 'function' ? keyFn(item) : item[keyFn];
                if (seen.has(key)) return false;
                seen.add(key);
                return true;
            });
        }
        return [...new Set(array)];
    }

    /**
     * Partition array based on predicate
     */
    static partition(array, predicate) {
        return array.reduce(
            ([pass, fail], item) => 
                predicate(item) ? [[...pass, item], fail] : [pass, [...fail, item]],
            [[], []]
        );
    }

    /**
     * Chunk array into smaller arrays
     */
    static chunk(array, size) {
        return Array.from(
            { length: Math.ceil(array.length / size) },
            (_, index) => array.slice(index * size, (index + 1) * size)
        );
    }

    /**
     * Flatten nested arrays with depth control
     */
    static flatten(array, depth = 1) {
        return depth > 0
            ? array.reduce((acc, val) =>
                acc.concat(Array.isArray(val) ? this.flatten(val, depth - 1) : val), [])
            : array.slice();
    }

    /**
     * Create array range with modern syntax
     */
    static range(start, end, step = 1) {
        return Array.from(
            { length: Math.floor((end - start) / step) + 1 },
            (_, i) => start + i * step
        );
    }

    /**
     * Async map with concurrency control
     */
    static async mapAsync(array, asyncFn, concurrency = Infinity) {
        const results = [];
        const executing = [];
        
        for (const [index, item] of array.entries()) {
            const promise = asyncFn(item, index).then(result => {
                results[index] = result;
            });
            
            if (concurrency < Infinity) {
                executing.push(promise);
                if (executing.length >= concurrency) {
                    await Promise.race(executing);
                    executing.splice(executing.findIndex(p => p === promise), 1);
                }
            } else {
                results[index] = await promise;
            }
        }
        
        await Promise.all(executing);
        return results;
    }

    /**
     * Find with async predicate
     */
    static async findAsync(array, asyncPredicate) {
        for (const item of array) {
            if (await asyncPredicate(item)) {
                return item;
            }
        }
        return undefined;
    }
}

/**
 * Object utilities using modern methods
 */
export class ObjectUtils {
    /**
     * Deep merge objects using spread and recursion
     */
    static deepMerge(...objects) {
        return objects.reduce((result, obj) => {
            Object.entries(obj ?? {}).forEach(([key, value]) => {
                if (value && typeof value === 'object' && !Array.isArray(value)) {
                    result[key] = this.deepMerge(result[key] ?? {}, value);
                } else {
                    result[key] = value;
                }
            });
            return result;
        }, {});
    }

    /**
     * Pick specific keys from object
     */
    static pick(obj, keys) {
        return Object.fromEntries(
            Object.entries(obj).filter(([key]) => keys.includes(key))
        );
    }

    /**
     * Omit specific keys from object
     */
    static omit(obj, keys) {
        return Object.fromEntries(
            Object.entries(obj).filter(([key]) => !keys.includes(key))
        );
    }

    /**
     * Map object values
     */
    static mapValues(obj, mapFn) {
        return Object.fromEntries(
            Object.entries(obj).map(([key, value]) => [key, mapFn(value, key)])
        );
    }

    /**
     * Map object keys
     */
    static mapKeys(obj, mapFn) {
        return Object.fromEntries(
            Object.entries(obj).map(([key, value]) => [mapFn(key, value), value])
        );
    }

    /**
     * Deep clone using structured clone (if available) or JSON fallback
     */
    static deepClone(obj) {
        if (typeof structuredClone === 'function') {
            return structuredClone(obj);
        }
        
        // Fallback for complex objects
        if (obj instanceof Date) return new Date(obj);
        if (obj instanceof RegExp) return new RegExp(obj);
        if (obj === null || typeof obj !== 'object') return obj;
        
        if (obj instanceof Map) {
            return new Map(Array.from(obj.entries()).map(
                ([k, v]) => [k, this.deepClone(v)]
            ));
        }
        
        if (obj instanceof Set) {
            return new Set(Array.from(obj).map(v => this.deepClone(v)));
        }
        
        if (Array.isArray(obj)) {
            return obj.map(item => this.deepClone(item));
        }
        
        return Object.fromEntries(
            Object.entries(obj).map(([k, v]) => [k, this.deepClone(v)])
        );
    }

    /**
     * Check if object is empty
     */
    static isEmpty(obj) {
        return obj == null || 
               (typeof obj === 'object' && Object.keys(obj).length === 0);
    }

    /**
     * Get nested property safely using optional chaining alternative
     */
    static get(obj, path, defaultValue = undefined) {
        const keys = path.split('.');
        let result = obj;
        
        for (const key of keys) {
            result = result?.[key];
            if (result === undefined) {
                return defaultValue;
            }
        }
        
        return result;
    }

    /**
     * Set nested property immutably
     */
    static set(obj, path, value) {
        const keys = path.split('.');
        const lastKey = keys.pop();
        
        const deepCopy = this.deepClone(obj);
        let current = deepCopy;
        
        for (const key of keys) {
            current[key] = current[key] ?? {};
            current = current[key];
        }
        
        current[lastKey] = value;
        return deepCopy;
    }
}

/**
 * String utilities with modern methods
 */
export class StringUtils {
    /**
     * Template literal tag for dedenting
     */
    static dedent(strings, ...values) {
        const raw = strings.raw;
        let result = '';
        
        for (let i = 0; i < raw.length; i++) {
            result += raw[i].replace(/\n\s*/g, '\n').trim();
            if (i < values.length) {
                result += values[i];
            }
        }
        
        return result.trim();
    }

    /**
     * Capitalize using modern string methods
     */
    static capitalize(str) {
        return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    }

    /**
     * CamelCase to kebab-case
     */
    static toKebabCase(str) {
        return str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
    }

    /**
     * Truncate with ellipsis
     */
    static truncate(str, length, ending = '...') {
        if (str.length <= length) return str;
        return str.slice(0, length - ending.length) + ending;
    }

    /**
     * Parse template with variables
     */
    static template(str, variables) {
        return str.replace(/\${(\w+)}/g, (_, key) => variables[key] ?? '');
    }
}

/**
 * Function utilities with modern patterns
 */
export class FunctionUtils {
    /**
     * Compose functions from right to left
     */
    static compose(...fns) {
        return fns.reduce((f, g) => (...args) => f(g(...args)));
    }

    /**
     * Pipe functions from left to right
     */
    static pipe(...fns) {
        return fns.reduce((f, g) => (...args) => g(f(...args)));
    }

    /**
     * Curry function with modern syntax
     */
    static curry(fn) {
        return function curried(...args) {
            if (args.length >= fn.length) {
                return fn.apply(this, args);
            }
            return (...nextArgs) => curried(...args, ...nextArgs);
        };
    }

    /**
     * Memoize with Map
     */
    static memoize(fn, keyFn = (...args) => JSON.stringify(args)) {
        const cache = new Map();
        
        return function(...args) {
            const key = keyFn(...args);
            
            if (cache.has(key)) {
                return cache.get(key);
            }
            
            const result = fn.apply(this, args);
            cache.set(key, result);
            return result;
        };
    }

    /**
     * Debounce with leading/trailing options
     */
    static debounce(fn, delay, { leading = false, trailing = true } = {}) {
        let timeout;
        let lastArgs;
        
        return function(...args) {
            lastArgs = args;
            
            if (!timeout && leading) {
                fn.apply(this, args);
            }
            
            clearTimeout(timeout);
            
            timeout = setTimeout(() => {
                timeout = null;
                if (trailing && lastArgs) {
                    fn.apply(this, lastArgs);
                    lastArgs = null;
                }
            }, delay);
        };
    }

    /**
     * Throttle with modern implementation
     */
    static throttle(fn, limit) {
        let inThrottle;
        let lastArgs;
        
        return function(...args) {
            lastArgs = args;
            
            if (!inThrottle) {
                fn.apply(this, args);
                inThrottle = true;
                
                setTimeout(() => {
                    inThrottle = false;
                    if (lastArgs) {
                        fn.apply(this, lastArgs);
                        lastArgs = null;
                    }
                }, limit);
            }
        };
    }

    /**
     * Retry async function with exponential backoff
     */
    static async retry(asyncFn, options = {}) {
        const {
            maxAttempts = 3,
            delay = 1000,
            backoff = 2,
            onRetry = () => {}
        } = options;

        let lastError;
        
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            try {
                return await asyncFn();
            } catch (error) {
                lastError = error;
                
                if (attempt < maxAttempts - 1) {
                    const waitTime = delay * Math.pow(backoff, attempt);
                    onRetry(attempt + 1, waitTime, error);
                    await new Promise(resolve => setTimeout(resolve, waitTime));
                }
            }
        }
        
        throw lastError;
    }
}

/**
 * Promise utilities
 */
export class PromiseUtils {
    /**
     * Promise with timeout
     */
    static timeout(promise, ms, errorMessage = 'Operation timed out') {
        return Promise.race([
            promise,
            new Promise((_, reject) =>
                setTimeout(() => reject(new Error(errorMessage)), ms)
            )
        ]);
    }

    /**
     * Delay promise
     */
    static delay(ms, value) {
        return new Promise(resolve => setTimeout(() => resolve(value), ms));
    }

    /**
     * Promise all with object
     */
    static async allObject(obj) {
        const entries = await Promise.all(
            Object.entries(obj).map(async ([key, promise]) => [key, await promise])
        );
        return Object.fromEntries(entries);
    }

    /**
     * Sequential promise execution
     */
    static async sequence(promises) {
        const results = [];
        for (const promise of promises) {
            results.push(await promise);
        }
        return results;
    }
}

// Export all utilities as default
export default {
    ArrayUtils,
    ObjectUtils,
    StringUtils,
    FunctionUtils,
    PromiseUtils
};