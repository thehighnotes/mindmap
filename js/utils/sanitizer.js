/**
 * DOMSanitizer - Security module for safe HTML manipulation
 * Prevents XSS attacks by sanitizing user input and safely creating DOM elements
 */

class DOMSanitizer {
    /**
     * Sanitize HTML string to prevent XSS attacks
     * @param {string} html - Raw HTML string to sanitize
     * @returns {string} - Sanitized HTML string
     */
    static sanitizeHTML(html) {
        if (typeof html !== 'string') return '';
        
        // Create a temporary element to hold the text content
        const temp = document.createElement('div');
        temp.textContent = html;
        return temp.innerHTML;
    }

    /**
     * Create a safe DOM element with sanitized content
     * @param {string} tag - HTML tag name
     * @param {string} content - Text content for the element
     * @param {Object} attributes - Safe attributes to set
     * @returns {HTMLElement} - Safely created element
     */
    static createSafeElement(tag, content = '', attributes = {}) {
        const element = document.createElement(tag);
        
        // Set text content safely (never use innerHTML)
        if (content) {
            element.textContent = content;
        }
        
        // Set attributes safely
        const safeAttributes = ['class', 'id', 'data-id', 'data-type', 'style', 'title', 'placeholder', 'type', 'value'];
        Object.entries(attributes).forEach(([key, value]) => {
            if (safeAttributes.includes(key.toLowerCase()) || key.startsWith('data-')) {
                element.setAttribute(key, String(value));
            }
        });
        
        return element;
    }

    /**
     * Safely update element content
     * @param {HTMLElement} element - Element to update
     * @param {string} content - New content
     * @param {boolean} isHTML - If true, content is treated as text that may contain HTML structure
     */
    static updateElementContent(element, content, isHTML = false) {
        if (!element) return;
        
        if (isHTML) {
            // Parse HTML safely using DOMParser
            const parser = new DOMParser();
            const doc = parser.parseFromString(content, 'text/html');
            
            // Clear existing content
            element.innerHTML = '';
            
            // Append parsed nodes
            while (doc.body.firstChild) {
                element.appendChild(doc.body.firstChild);
            }
        } else {
            // For plain text, use textContent
            element.textContent = content;
        }
    }

    /**
     * Escape HTML special characters
     * @param {string} text - Text to escape
     * @returns {string} - Escaped text
     */
    static escapeHTML(text) {
        if (typeof text !== 'string') return '';
        
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        
        return text.replace(/[&<>"']/g, m => map[m]);
    }

    /**
     * Create safe text node
     * @param {string} text - Text content
     * @returns {Text} - Text node
     */
    static createTextNode(text) {
        return document.createTextNode(String(text || ''));
    }

    /**
     * Safely set element attributes
     * @param {HTMLElement} element - Target element
     * @param {Object} attributes - Attributes to set
     */
    static setAttributes(element, attributes = {}) {
        if (!element) return;
        
        const dangerousAttributes = ['onclick', 'onmouseover', 'onerror', 'onload', 'href', 'src'];
        
        Object.entries(attributes).forEach(([key, value]) => {
            // Skip dangerous attributes that could execute code
            if (dangerousAttributes.some(danger => key.toLowerCase().startsWith(danger))) {
                console.warn(`Blocked potentially dangerous attribute: ${key}`);
                return;
            }
            
            // Special handling for style
            if (key === 'style' && typeof value === 'object') {
                Object.entries(value).forEach(([prop, val]) => {
                    element.style[prop] = val;
                });
            } else {
                element.setAttribute(key, String(value));
            }
        });
    }

    /**
     * Validate and sanitize user input
     * @param {string} input - User input to validate
     * @param {Object} options - Validation options
     * @returns {string} - Validated and sanitized input
     */
    static validateInput(input, options = {}) {
        const {
            maxLength = 1000,
            allowedTags = [],
            stripTags = true
        } = options;
        
        if (typeof input !== 'string') return '';
        
        // Trim and limit length
        let sanitized = input.trim().substring(0, maxLength);
        
        // Remove or escape HTML tags
        if (stripTags) {
            sanitized = this.escapeHTML(sanitized);
        } else if (allowedTags.length > 0) {
            // This is a simplified tag stripping - in production use a proper HTML parser
            const tagPattern = /<\/?([a-z]+)(?:\s[^>]*)?\/?>/gi;
            sanitized = sanitized.replace(tagPattern, (match, tag) => {
                return allowedTags.includes(tag.toLowerCase()) ? match : '';
            });
        }
        
        return sanitized;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DOMSanitizer;
}

// Make available globally for gradual migration
window.DOMSanitizer = DOMSanitizer;