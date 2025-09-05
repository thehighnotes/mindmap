/**
 * DOMCache - Efficient DOM element caching system
 * Reduces repeated DOM queries for better performance
 */

class DOMCache {
    #cache = new Map();
    #queryCount = new Map();
    
    /**
     * Get element from cache or query DOM
     * @param {string} selector - CSS selector
     * @param {boolean} forceRefresh - Force re-query
     * @returns {HTMLElement|null} - Cached or queried element
     */
    get(selector, forceRefresh = false) {
        if (!forceRefresh && this.#cache.has(selector)) {
            return this.#cache.get(selector);
        }
        
        const element = document.querySelector(selector);
        if (element) {
            this.#cache.set(selector, element);
        }
        
        // Track query count for performance monitoring
        this.#incrementQueryCount(selector);
        
        return element;
    }
    
    /**
     * Get multiple elements from cache or query DOM
     * @param {string} selector - CSS selector
     * @param {boolean} forceRefresh - Force re-query
     * @returns {NodeList|Array} - Cached or queried elements
     */
    getAll(selector, forceRefresh = false) {
        const cacheKey = `all:${selector}`;
        
        if (!forceRefresh && this.#cache.has(cacheKey)) {
            return this.#cache.get(cacheKey);
        }
        
        const elements = Array.from(document.querySelectorAll(selector));
        this.#cache.set(cacheKey, elements);
        
        // Track query count
        this.#incrementQueryCount(selector);
        
        return elements;
    }
    
    /**
     * Get element by ID (optimized)
     * @param {string} id - Element ID
     * @param {boolean} forceRefresh - Force re-query
     * @returns {HTMLElement|null} - Element
     */
    getById(id, forceRefresh = false) {
        const cacheKey = `#${id}`;
        
        if (!forceRefresh && this.#cache.has(cacheKey)) {
            return this.#cache.get(cacheKey);
        }
        
        const element = document.getElementById(id);
        if (element) {
            this.#cache.set(cacheKey, element);
        }
        
        return element;
    }
    
    /**
     * Cache multiple selectors at once
     * @param {Array<string>} selectors - Array of CSS selectors
     */
    preload(selectors) {
        selectors.forEach(selector => {
            if (!this.#cache.has(selector)) {
                this.get(selector);
            }
        });
    }
    
    /**
     * Clear cache for specific selector or all
     * @param {string} selector - Optional selector to clear
     */
    clear(selector) {
        if (selector) {
            this.#cache.delete(selector);
            this.#cache.delete(`all:${selector}`);
        } else {
            this.#cache.clear();
        }
    }
    
    /**
     * Invalidate cache for elements that may have changed
     * @param {string} parentSelector - Parent element selector
     */
    invalidateChildren(parentSelector) {
        const keysToDelete = [];
        
        this.#cache.forEach((value, key) => {
            if (key.startsWith(parentSelector) || key.includes(parentSelector)) {
                keysToDelete.push(key);
            }
        });
        
        keysToDelete.forEach(key => this.#cache.delete(key));
    }
    
    /**
     * Get cache statistics
     * @returns {Object} - Cache statistics
     */
    getStats() {
        return {
            cacheSize: this.#cache.size,
            queryCount: Array.from(this.#queryCount.entries())
                .sort((a, b) => b[1] - a[1])
                .slice(0, 10) // Top 10 most queried
        };
    }
    
    /**
     * Track query count for performance monitoring
     * @private
     */
    #incrementQueryCount(selector) {
        const count = this.#queryCount.get(selector) || 0;
        this.#queryCount.set(selector, count + 1);
    }
}

/**
 * Commonly used element cache with predefined selectors
 */
class CommonElements {
    static #instance = null;
    
    constructor() {
        if (CommonElements.#instance) {
            return CommonElements.#instance;
        }
        
        this.cache = new DOMCache();
        this.#preloadCommonElements();
        
        CommonElements.#instance = this;
    }
    
    #preloadCommonElements() {
        // Preload commonly used elements
        const commonSelectors = [
            '#canvas',
            '#toolbar',
            '#contextMenu',
            '#nodeEditor',
            '#connectionEditor',
            '#minimap',
            '.modal',
            '.modal-overlay',
            '#searchBox',
            '#zoomLevel'
        ];
        
        // Wait for DOM ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.cache.preload(commonSelectors);
            });
        } else {
            this.cache.preload(commonSelectors);
        }
    }
    
    // Getters for common elements
    get canvas() {
        return this.cache.getById('canvas');
    }
    
    get toolbar() {
        return this.cache.getById('toolbar');
    }
    
    get contextMenu() {
        return this.cache.getById('contextMenu');
    }
    
    get nodeEditor() {
        return this.cache.getById('nodeEditor');
    }
    
    get connectionEditor() {
        return this.cache.getById('connectionEditor');
    }
    
    get minimap() {
        return this.cache.getById('minimap');
    }
    
    get modals() {
        return this.cache.getAll('.modal');
    }
    
    get modalOverlay() {
        return this.cache.get('.modal-overlay');
    }
    
    get searchBox() {
        return this.cache.getById('searchBox');
    }
    
    get zoomLevel() {
        return this.cache.getById('zoomLevel');
    }
    
    // Get all nodes
    get nodes() {
        return this.cache.getAll('.node', true); // Always refresh for dynamic content
    }
    
    // Get all connections
    get connections() {
        return this.cache.getAll('.connection', true); // Always refresh for dynamic content
    }
}

/**
 * Performance-optimized query selector wrapper
 */
const $ = (selector, forceRefresh = false) => {
    if (!window.domCache) {
        window.domCache = new DOMCache();
    }
    return window.domCache.get(selector, forceRefresh);
};

const $$ = (selector, forceRefresh = false) => {
    if (!window.domCache) {
        window.domCache = new DOMCache();
    }
    return window.domCache.getAll(selector, forceRefresh);
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { DOMCache, CommonElements, $, $$ };
}

// Initialize global instances
window.DOMCache = DOMCache;
window.domCache = new DOMCache();
window.commonElements = new CommonElements();
window.$ = $;
window.$$ = $$;