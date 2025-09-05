/**
 * Performance Utilities - Optimization helpers for better app performance
 * Includes debounce, throttle, and other performance utilities
 */

/**
 * Debounce function - Delays execution until after wait milliseconds have elapsed
 * since the last time the function was invoked
 * @param {Function} fn - Function to debounce
 * @param {number} delay - Delay in milliseconds
 * @param {Object} options - Options object
 * @returns {Function} - Debounced function
 */
function debounce(fn, delay = 300, options = {}) {
    const { leading = false, trailing = true, maxWait } = options;
    
    let timeout;
    let lastCallTime;
    let lastInvokeTime = 0;
    let lastArgs;
    let lastThis;
    let result;
    
    function invokeFunc(time) {
        const args = lastArgs;
        const thisArg = lastThis;
        
        lastArgs = lastThis = undefined;
        lastInvokeTime = time;
        result = fn.apply(thisArg, args);
        return result;
    }
    
    function leadingEdge(time) {
        lastInvokeTime = time;
        timeout = setTimeout(timerExpired, delay);
        return leading ? invokeFunc(time) : result;
    }
    
    function remainingWait(time) {
        const timeSinceLastCall = time - lastCallTime;
        const timeSinceLastInvoke = time - lastInvokeTime;
        const timeWaiting = delay - timeSinceLastCall;
        
        return maxWait !== undefined
            ? Math.min(timeWaiting, maxWait - timeSinceLastInvoke)
            : timeWaiting;
    }
    
    function shouldInvoke(time) {
        const timeSinceLastCall = time - lastCallTime;
        const timeSinceLastInvoke = time - lastInvokeTime;
        
        return lastCallTime === undefined || 
               timeSinceLastCall >= delay ||
               timeSinceLastCall < 0 ||
               (maxWait !== undefined && timeSinceLastInvoke >= maxWait);
    }
    
    function timerExpired() {
        const time = Date.now();
        
        if (shouldInvoke(time)) {
            return trailingEdge(time);
        }
        
        timeout = setTimeout(timerExpired, remainingWait(time));
    }
    
    function trailingEdge(time) {
        timeout = undefined;
        
        if (trailing && lastArgs) {
            return invokeFunc(time);
        }
        
        lastArgs = lastThis = undefined;
        return result;
    }
    
    function cancel() {
        if (timeout !== undefined) {
            clearTimeout(timeout);
        }
        lastInvokeTime = 0;
        lastArgs = lastCallTime = lastThis = timeout = undefined;
    }
    
    function flush() {
        return timeout === undefined ? result : trailingEdge(Date.now());
    }
    
    function debounced(...args) {
        const time = Date.now();
        const isInvoking = shouldInvoke(time);
        
        lastArgs = args;
        lastThis = this;
        lastCallTime = time;
        
        if (isInvoking) {
            if (timeout === undefined) {
                return leadingEdge(lastCallTime);
            }
            if (maxWait !== undefined) {
                timeout = setTimeout(timerExpired, delay);
                return invokeFunc(lastCallTime);
            }
        }
        
        if (timeout === undefined) {
            timeout = setTimeout(timerExpired, delay);
        }
        
        return result;
    }
    
    debounced.cancel = cancel;
    debounced.flush = flush;
    
    return debounced;
}

/**
 * Throttle function - Ensures function is called at most once per interval
 * @param {Function} fn - Function to throttle
 * @param {number} limit - Time limit in milliseconds
 * @param {Object} options - Options object
 * @returns {Function} - Throttled function
 */
function throttle(fn, limit = 100, options = {}) {
    const { leading = true, trailing = true } = options;
    
    let waiting = false;
    let lastArgs;
    let lastThis;
    let result;
    let lastCallTime = 0;
    
    function invokeFunc() {
        const args = lastArgs;
        const thisArg = lastThis;
        
        lastArgs = lastThis = undefined;
        lastCallTime = Date.now();
        result = fn.apply(thisArg, args);
        return result;
    }
    
    function throttled(...args) {
        const now = Date.now();
        
        if (!lastCallTime && !leading) {
            lastCallTime = now;
        }
        
        const remaining = limit - (now - lastCallTime);
        
        lastArgs = args;
        lastThis = this;
        
        if (remaining <= 0 || remaining > limit) {
            if (waiting) {
                clearTimeout(waiting);
                waiting = false;
            }
            
            lastCallTime = now;
            result = fn.apply(this, args);
        } else if (!waiting && trailing) {
            waiting = setTimeout(() => {
                lastCallTime = leading ? Date.now() : 0;
                waiting = false;
                
                if (lastArgs) {
                    result = invokeFunc();
                }
            }, remaining);
        }
        
        return result;
    }
    
    throttled.cancel = function() {
        if (waiting) {
            clearTimeout(waiting);
        }
        waiting = false;
        lastCallTime = 0;
        lastArgs = lastThis = undefined;
    };
    
    return throttled;
}

/**
 * Request Animation Frame throttle - Ensures function runs at most once per frame
 * @param {Function} fn - Function to throttle
 * @returns {Function} - RAF throttled function
 */
function rafThrottle(fn) {
    let rafId = null;
    let lastArgs;
    let lastThis;
    
    function throttled(...args) {
        lastArgs = args;
        lastThis = this;
        
        if (rafId === null) {
            rafId = requestAnimationFrame(() => {
                fn.apply(lastThis, lastArgs);
                rafId = null;
            });
        }
    }
    
    throttled.cancel = function() {
        if (rafId !== null) {
            cancelAnimationFrame(rafId);
            rafId = null;
        }
    };
    
    return throttled;
}

/**
 * Batch operations to run in next tick
 */
class BatchProcessor {
    constructor(processor, options = {}) {
        this.processor = processor;
        this.queue = [];
        this.scheduled = false;
        this.maxBatchSize = options.maxBatchSize || 100;
        this.delay = options.delay || 0;
    }
    
    add(item) {
        this.queue.push(item);
        
        if (!this.scheduled) {
            this.scheduled = true;
            
            if (this.delay > 0) {
                setTimeout(() => this.process(), this.delay);
            } else {
                Promise.resolve().then(() => this.process());
            }
        }
        
        // Process immediately if batch is full
        if (this.queue.length >= this.maxBatchSize) {
            this.process();
        }
    }
    
    process() {
        if (this.queue.length === 0) {
            this.scheduled = false;
            return;
        }
        
        const batch = this.queue.splice(0, this.maxBatchSize);
        this.processor(batch);
        
        // Schedule next batch if there are more items
        if (this.queue.length > 0) {
            if (this.delay > 0) {
                setTimeout(() => this.process(), this.delay);
            } else {
                Promise.resolve().then(() => this.process());
            }
        } else {
            this.scheduled = false;
        }
    }
    
    flush() {
        this.process();
    }
    
    clear() {
        this.queue = [];
        this.scheduled = false;
    }
}

/**
 * Lazy value computation
 */
class LazyValue {
    constructor(computeFn) {
        this.computeFn = computeFn;
        this.computed = false;
        this.value = undefined;
    }
    
    get() {
        if (!this.computed) {
            this.value = this.computeFn();
            this.computed = true;
        }
        return this.value;
    }
    
    reset() {
        this.computed = false;
        this.value = undefined;
    }
}

/**
 * Memoization decorator
 */
function memoize(fn, options = {}) {
    const { maxSize = 100, keyGenerator } = options;
    const cache = new Map();
    
    function memoized(...args) {
        const key = keyGenerator ? keyGenerator(...args) : JSON.stringify(args);
        
        if (cache.has(key)) {
            return cache.get(key);
        }
        
        const result = fn.apply(this, args);
        cache.set(key, result);
        
        // Limit cache size
        if (cache.size > maxSize) {
            const firstKey = cache.keys().next().value;
            cache.delete(firstKey);
        }
        
        return result;
    }
    
    memoized.clear = () => cache.clear();
    memoized.delete = (key) => cache.delete(key);
    memoized.has = (key) => cache.has(key);
    
    return memoized;
}

/**
 * Performance monitor
 */
class PerformanceMonitor {
    static measurements = new Map();
    
    static start(label) {
        this.measurements.set(label, performance.now());
    }
    
    static end(label, log = true) {
        const startTime = this.measurements.get(label);
        if (!startTime) {
            console.warn(`No start time found for label: ${label}`);
            return;
        }
        
        const duration = performance.now() - startTime;
        this.measurements.delete(label);
        
        if (log && window.Logger) {
            Logger.performance(label, startTime);
        }
        
        return duration;
    }
    
    static measure(label, fn) {
        this.start(label);
        const result = fn();
        this.end(label);
        return result;
    }
    
    static async measureAsync(label, fn) {
        this.start(label);
        const result = await fn();
        this.end(label);
        return result;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        debounce,
        throttle,
        rafThrottle,
        BatchProcessor,
        LazyValue,
        memoize,
        PerformanceMonitor
    };
}

// Make available globally
window.debounce = debounce;
window.throttle = throttle;
window.rafThrottle = rafThrottle;
window.BatchProcessor = BatchProcessor;
window.LazyValue = LazyValue;
window.memoize = memoize;
window.PerformanceMonitor = PerformanceMonitor;