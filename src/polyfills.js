/**
 * Polyfills for Browser Compatibility
 * Ensures modern features work in older browsers
 */

// Core-js for ES6+ features
import 'core-js/stable';

// Async/await support
import 'regenerator-runtime/runtime';

// Custom polyfills for specific features

/**
 * RequestIdleCallback polyfill
 */
if (!window.requestIdleCallback) {
    window.requestIdleCallback = function(callback, options) {
        const start = Date.now();
        return setTimeout(() => {
            callback({
                didTimeout: false,
                timeRemaining: () => Math.max(0, 50 - (Date.now() - start))
            });
        }, options?.timeout || 1);
    };
}

if (!window.cancelIdleCallback) {
    window.cancelIdleCallback = function(id) {
        clearTimeout(id);
    };
}

/**
 * Element.matches polyfill
 */
if (!Element.prototype.matches) {
    Element.prototype.matches = 
        Element.prototype.matchesSelector ||
        Element.prototype.mozMatchesSelector ||
        Element.prototype.msMatchesSelector ||
        Element.prototype.oMatchesSelector ||
        Element.prototype.webkitMatchesSelector ||
        function(s) {
            const matches = (this.document || this.ownerDocument).querySelectorAll(s);
            let i = matches.length;
            while (--i >= 0 && matches.item(i) !== this) {}
            return i > -1;
        };
}

/**
 * Element.closest polyfill
 */
if (!Element.prototype.closest) {
    Element.prototype.closest = function(s) {
        let el = this;
        do {
            if (el.matches(s)) return el;
            el = el.parentElement || el.parentNode;
        } while (el !== null && el.nodeType === 1);
        return null;
    };
}

/**
 * Object.entries polyfill
 */
if (!Object.entries) {
    Object.entries = function(obj) {
        const ownProps = Object.keys(obj);
        let i = ownProps.length;
        const resArray = new Array(i);
        while (i--) {
            resArray[i] = [ownProps[i], obj[ownProps[i]]];
        }
        return resArray;
    };
}

/**
 * Object.values polyfill
 */
if (!Object.values) {
    Object.values = function(obj) {
        return Object.keys(obj).map(key => obj[key]);
    };
}

/**
 * Array.from polyfill (enhanced)
 */
if (!Array.from) {
    Array.from = (function() {
        const toStr = Object.prototype.toString;
        const isCallable = function(fn) {
            return typeof fn === 'function' || toStr.call(fn) === '[object Function]';
        };
        const toInteger = function(value) {
            const number = Number(value);
            if (isNaN(number)) return 0;
            if (number === 0 || !isFinite(number)) return number;
            return (number > 0 ? 1 : -1) * Math.floor(Math.abs(number));
        };
        const maxSafeInteger = Math.pow(2, 53) - 1;
        const toLength = function(value) {
            const len = toInteger(value);
            return Math.min(Math.max(len, 0), maxSafeInteger);
        };

        return function from(arrayLike/*, mapFn, thisArg */) {
            const C = this;
            const items = Object(arrayLike);

            if (arrayLike == null) {
                throw new TypeError('Array.from requires an array-like object - not null or undefined');
            }

            const mapFn = arguments.length > 1 ? arguments[1] : void undefined;
            let T;
            if (typeof mapFn !== 'undefined') {
                if (!isCallable(mapFn)) {
                    throw new TypeError('Array.from: when provided, the second argument must be a function');
                }
                if (arguments.length > 2) {
                    T = arguments[2];
                }
            }

            const len = toLength(items.length);
            const A = isCallable(C) ? Object(new C(len)) : new Array(len);

            let k = 0;
            let kValue;
            while (k < len) {
                kValue = items[k];
                if (mapFn) {
                    A[k] = typeof T === 'undefined' ? mapFn(kValue, k) : mapFn.call(T, kValue, k);
                } else {
                    A[k] = kValue;
                }
                k += 1;
            }
            A.length = len;
            return A;
        };
    }());
}

/**
 * String.prototype.includes polyfill
 */
if (!String.prototype.includes) {
    String.prototype.includes = function(search, start) {
        'use strict';
        if (typeof start !== 'number') {
            start = 0;
        }

        if (start + search.length > this.length) {
            return false;
        } else {
            return this.indexOf(search, start) !== -1;
        }
    };
}

/**
 * Array.prototype.includes polyfill
 */
if (!Array.prototype.includes) {
    Array.prototype.includes = function(searchElement, fromIndex) {
        'use strict';
        const O = Object(this);
        const len = parseInt(O.length, 10) || 0;

        if (len === 0) return false;

        const n = parseInt(fromIndex, 10) || 0;
        let k;

        if (n >= 0) {
            k = n;
        } else {
            k = len + n;
            if (k < 0) k = 0;
        }

        let currentElement;
        while (k < len) {
            currentElement = O[k];
            if (searchElement === currentElement ||
                (searchElement !== searchElement && currentElement !== currentElement)) {
                return true;
            }
            k++;
        }
        return false;
    };
}

/**
 * Promise.finally polyfill
 */
if (!Promise.prototype.finally) {
    Promise.prototype.finally = function(callback) {
        const P = this.constructor;
        return this.then(
            value => P.resolve(callback()).then(() => value),
            reason => P.resolve(callback()).then(() => { throw reason; })
        );
    };
}

/**
 * Performance.now polyfill
 */
if (!window.performance || !window.performance.now) {
    window.performance = window.performance || {};
    window.performance.now = (function() {
        return window.performance.now ||
            window.performance.mozNow ||
            window.performance.msNow ||
            window.performance.oNow ||
            window.performance.webkitNow ||
            function() { return new Date().getTime(); };
    })();
}

/**
 * CustomEvent polyfill for IE
 */
(function() {
    if (typeof window.CustomEvent === 'function') return false;

    function CustomEvent(event, params) {
        params = params || { bubbles: false, cancelable: false, detail: null };
        const evt = document.createEvent('CustomEvent');
        evt.initCustomEvent(event, params.bubbles, params.cancelable, params.detail);
        return evt;
    }

    window.CustomEvent = CustomEvent;
})();

// Log polyfills loaded
console.log('✅ Polyfills loaded');