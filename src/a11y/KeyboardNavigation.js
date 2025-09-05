/**
 * KeyboardNavigation - Comprehensive keyboard navigation and accessibility
 * Provides full keyboard control of the mindmap application
 */

export class KeyboardNavigation {
    #focusedElement = null;
    #elements = new Map();
    #container = null;
    #enabled = true;
    #mode = 'normal'; // normal, navigation, editing
    #focusHistory = [];
    #shortcuts = new Map();
    
    constructor(container) {
        this.#container = container || document.body;
        this.#setupListeners();
        this.#setupDefaultShortcuts();
        this.#setupFocusTrap();
    }

    // ==================== Setup ====================

    #setupListeners() {
        // Main keyboard handler
        this.#container.addEventListener('keydown', this.#handleKeyDown.bind(this), true);
        this.#container.addEventListener('keyup', this.#handleKeyUp.bind(this), true);
        
        // Focus management
        this.#container.addEventListener('focusin', this.#handleFocusIn.bind(this));
        this.#container.addEventListener('focusout', this.#handleFocusOut.bind(this));
        
        // Click to focus
        this.#container.addEventListener('click', this.#handleClick.bind(this));
    }

    #setupDefaultShortcuts() {
        // Navigation shortcuts
        this.addShortcut('Tab', () => this.#focusNext(false), 'Focus next element');
        this.addShortcut('Shift+Tab', () => this.#focusNext(true), 'Focus previous element');
        this.addShortcut('Enter', () => this.#activate(), 'Activate focused element');
        this.addShortcut('Space', () => this.#activate(), 'Activate focused element');
        this.addShortcut('Escape', () => this.#cancel(), 'Cancel current action');
        
        // Arrow navigation
        this.addShortcut('ArrowUp', () => this.#navigate('up'), 'Navigate up');
        this.addShortcut('ArrowDown', () => this.#navigate('down'), 'Navigate down');
        this.addShortcut('ArrowLeft', () => this.#navigate('left'), 'Navigate left');
        this.addShortcut('ArrowRight', () => this.#navigate('right'), 'Navigate right');
        
        // Quick actions
        this.addShortcut('n', () => this.#quickAction('newNode'), 'New node');
        this.addShortcut('c', () => this.#quickAction('newConnection'), 'New connection');
        this.addShortcut('Delete', () => this.#quickAction('delete'), 'Delete selected');
        this.addShortcut('F2', () => this.#quickAction('rename'), 'Rename selected');
        
        // View controls
        this.addShortcut('Home', () => this.#quickAction('centerView'), 'Center view');
        this.addShortcut('+', () => this.#quickAction('zoomIn'), 'Zoom in');
        this.addShortcut('-', () => this.#quickAction('zoomOut'), 'Zoom out');
        this.addShortcut('0', () => this.#quickAction('zoomReset'), 'Reset zoom');
        
        // Help
        this.addShortcut('F1', () => this.#showHelp(), 'Show help');
        this.addShortcut('?', () => this.#showShortcuts(), 'Show keyboard shortcuts');
    }

    #setupFocusTrap() {
        // Create focus trap elements for modal dialogs
        const trapStart = document.createElement('div');
        trapStart.tabIndex = 0;
        trapStart.className = 'focus-trap-start sr-only';
        trapStart.setAttribute('aria-hidden', 'true');
        
        const trapEnd = document.createElement('div');
        trapEnd.tabIndex = 0;
        trapEnd.className = 'focus-trap-end sr-only';
        trapEnd.setAttribute('aria-hidden', 'true');
        
        trapStart.addEventListener('focus', () => {
            this.#focusLast();
        });
        
        trapEnd.addEventListener('focus', () => {
            this.#focusFirst();
        });
        
        this.#container.prepend(trapStart);
        this.#container.append(trapEnd);
    }

    // ==================== Public API ====================

    /**
     * Register an element for keyboard navigation
     */
    registerElement(id, element, options = {}) {
        const config = {
            element,
            label: options.label || '',
            role: options.role || 'button',
            neighbors: options.neighbors || {},
            onActivate: options.onActivate || null,
            onFocus: options.onFocus || null,
            onBlur: options.onBlur || null,
            group: options.group || 'default',
            order: options.order || 0,
            skipInNavigation: options.skipInNavigation || false
        };
        
        // Set ARIA attributes
        element.setAttribute('tabindex', config.skipInNavigation ? '-1' : '0');
        element.setAttribute('role', config.role);
        element.setAttribute('aria-label', config.label);
        
        if (options.describedBy) {
            element.setAttribute('aria-describedby', options.describedBy);
        }
        
        if (options.controls) {
            element.setAttribute('aria-controls', options.controls);
        }
        
        // Store configuration
        this.#elements.set(id, config);
        element.dataset.navId = id;
    }

    /**
     * Unregister an element
     */
    unregisterElement(id) {
        const config = this.#elements.get(id);
        if (config) {
            config.element.removeAttribute('tabindex');
            config.element.removeAttribute('data-nav-id');
            this.#elements.delete(id);
        }
    }

    /**
     * Focus a specific element
     */
    focus(id) {
        const config = this.#elements.get(id);
        if (config && !config.skipInNavigation) {
            this.#setFocus(config.element, config);
        }
    }

    /**
     * Add a keyboard shortcut
     */
    addShortcut(keys, handler, description = '') {
        const normalizedKeys = this.#normalizeKeys(keys);
        this.#shortcuts.set(normalizedKeys, { handler, description, keys });
    }

    /**
     * Remove a keyboard shortcut
     */
    removeShortcut(keys) {
        const normalizedKeys = this.#normalizeKeys(keys);
        this.#shortcuts.delete(normalizedKeys);
    }

    /**
     * Enable/disable keyboard navigation
     */
    setEnabled(enabled) {
        this.#enabled = enabled;
    }

    /**
     * Set navigation mode
     */
    setMode(mode) {
        this.#mode = mode;
        this.#container.setAttribute('data-nav-mode', mode);
    }

    /**
     * Get current shortcuts
     */
    getShortcuts() {
        return Array.from(this.#shortcuts.entries()).map(([key, value]) => ({
            keys: value.keys,
            description: value.description
        }));
    }

    // ==================== Event Handlers ====================

    #handleKeyDown(event) {
        if (!this.#enabled) return;
        
        // Build key combination string
        const keys = this.#getKeyCombination(event);
        
        // Check for shortcut
        const shortcut = this.#shortcuts.get(keys);
        if (shortcut) {
            event.preventDefault();
            event.stopPropagation();
            shortcut.handler(event);
            return;
        }
        
        // Handle special modes
        if (this.#mode === 'editing') {
            // Allow normal typing in editing mode
            return;
        }
        
        // Navigation mode specific handling
        if (this.#mode === 'navigation') {
            this.#handleNavigationMode(event);
        }
    }

    #handleKeyUp(event) {
        // Handle key up events if needed
    }

    #handleFocusIn(event) {
        const navId = event.target.dataset.navId;
        if (navId) {
            const config = this.#elements.get(navId);
            if (config) {
                this.#focusedElement = navId;
                this.#focusHistory.push(navId);
                
                // Limit history size
                if (this.#focusHistory.length > 10) {
                    this.#focusHistory.shift();
                }
                
                // Call focus handler
                if (config.onFocus) {
                    config.onFocus(event);
                }
                
                // Announce to screen reader
                this.#announce(`${config.label} focused`);
            }
        }
    }

    #handleFocusOut(event) {
        const navId = event.target.dataset.navId;
        if (navId) {
            const config = this.#elements.get(navId);
            if (config && config.onBlur) {
                config.onBlur(event);
            }
        }
    }

    #handleClick(event) {
        // Update focus on click
        const navId = event.target.closest('[data-nav-id]')?.dataset.navId;
        if (navId) {
            this.focus(navId);
        }
    }

    #handleNavigationMode(event) {
        // Special handling for navigation mode
        switch (event.key) {
            case 'h': // Move to parent
                this.#navigateToParent();
                break;
            case 'j': // Move to next sibling
                this.#navigateToSibling(1);
                break;
            case 'k': // Move to previous sibling
                this.#navigateToSibling(-1);
                break;
            case 'l': // Move to first child
                this.#navigateToChild();
                break;
        }
    }

    // ==================== Navigation Methods ====================

    #focusNext(reverse = false) {
        const navigableElements = this.#getNavigableElements();
        if (navigableElements.length === 0) return;
        
        const currentIndex = navigableElements.findIndex(
            el => el.dataset.navId === this.#focusedElement
        );
        
        let nextIndex;
        if (reverse) {
            nextIndex = currentIndex <= 0 ? navigableElements.length - 1 : currentIndex - 1;
        } else {
            nextIndex = currentIndex >= navigableElements.length - 1 ? 0 : currentIndex + 1;
        }
        
        const nextElement = navigableElements[nextIndex];
        if (nextElement) {
            const navId = nextElement.dataset.navId;
            this.focus(navId);
        }
    }

    #focusFirst() {
        const navigableElements = this.#getNavigableElements();
        if (navigableElements.length > 0) {
            const navId = navigableElements[0].dataset.navId;
            this.focus(navId);
        }
    }

    #focusLast() {
        const navigableElements = this.#getNavigableElements();
        if (navigableElements.length > 0) {
            const navId = navigableElements[navigableElements.length - 1].dataset.navId;
            this.focus(navId);
        }
    }

    #navigate(direction) {
        if (!this.#focusedElement) {
            this.#focusFirst();
            return;
        }
        
        const config = this.#elements.get(this.#focusedElement);
        if (!config) return;
        
        // Check for custom neighbor
        const neighborId = config.neighbors[direction];
        if (neighborId) {
            this.focus(neighborId);
            return;
        }
        
        // Spatial navigation
        this.#spatialNavigate(direction);
    }

    #spatialNavigate(direction) {
        const current = this.#elements.get(this.#focusedElement);
        if (!current) return;
        
        const currentRect = current.element.getBoundingClientRect();
        const candidates = [];
        
        // Find candidates in the direction
        for (const [id, config] of this.#elements) {
            if (id === this.#focusedElement || config.skipInNavigation) continue;
            
            const rect = config.element.getBoundingClientRect();
            
            if (this.#isInDirection(currentRect, rect, direction)) {
                const distance = this.#getDistance(currentRect, rect);
                candidates.push({ id, distance, rect });
            }
        }
        
        // Sort by distance and select closest
        if (candidates.length > 0) {
            candidates.sort((a, b) => a.distance - b.distance);
            this.focus(candidates[0].id);
        }
    }

    #activate() {
        if (!this.#focusedElement) return;
        
        const config = this.#elements.get(this.#focusedElement);
        if (config) {
            if (config.onActivate) {
                config.onActivate();
            } else {
                // Default activation (click)
                config.element.click();
            }
            
            this.#announce(`${config.label} activated`);
        }
    }

    #cancel() {
        // Emit cancel event
        this.#container.dispatchEvent(new CustomEvent('navigation:cancel'));
        
        // Return focus to previous element
        if (this.#focusHistory.length > 1) {
            this.#focusHistory.pop(); // Remove current
            const previousId = this.#focusHistory[this.#focusHistory.length - 1];
            this.focus(previousId);
        }
    }

    // ==================== Helper Methods ====================

    #getNavigableElements() {
        const elements = [];
        
        for (const [id, config] of this.#elements) {
            if (!config.skipInNavigation && config.element.offsetParent !== null) {
                elements.push(config.element);
            }
        }
        
        // Sort by group and order
        elements.sort((a, b) => {
            const configA = this.#elements.get(a.dataset.navId);
            const configB = this.#elements.get(b.dataset.navId);
            
            if (configA.group !== configB.group) {
                return configA.group.localeCompare(configB.group);
            }
            
            return configA.order - configB.order;
        });
        
        return elements;
    }

    #setFocus(element, config) {
        element.focus();
        
        // Ensure element is visible
        if (element.scrollIntoViewIfNeeded) {
            element.scrollIntoViewIfNeeded();
        } else {
            element.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }

    #getKeyCombination(event) {
        const keys = [];
        
        if (event.ctrlKey) keys.push('Ctrl');
        if (event.altKey) keys.push('Alt');
        if (event.shiftKey) keys.push('Shift');
        if (event.metaKey) keys.push('Meta');
        
        // Add the actual key
        const key = event.key;
        if (!['Control', 'Alt', 'Shift', 'Meta'].includes(key)) {
            keys.push(key);
        }
        
        return keys.join('+');
    }

    #normalizeKeys(keys) {
        return keys.split('+')
            .map(k => k.trim())
            .sort()
            .join('+');
    }

    #isInDirection(fromRect, toRect, direction) {
        const margin = 10; // Tolerance margin
        
        switch (direction) {
            case 'up':
                return toRect.bottom <= fromRect.top + margin;
            case 'down':
                return toRect.top >= fromRect.bottom - margin;
            case 'left':
                return toRect.right <= fromRect.left + margin;
            case 'right':
                return toRect.left >= fromRect.right - margin;
            default:
                return false;
        }
    }

    #getDistance(rect1, rect2) {
        const cx1 = rect1.left + rect1.width / 2;
        const cy1 = rect1.top + rect1.height / 2;
        const cx2 = rect2.left + rect2.width / 2;
        const cy2 = rect2.top + rect2.height / 2;
        
        return Math.sqrt(Math.pow(cx2 - cx1, 2) + Math.pow(cy2 - cy1, 2));
    }

    #quickAction(action) {
        this.#container.dispatchEvent(new CustomEvent('navigation:quickAction', {
            detail: { action }
        }));
    }

    #showHelp() {
        this.#container.dispatchEvent(new CustomEvent('navigation:showHelp'));
    }

    #showShortcuts() {
        this.#container.dispatchEvent(new CustomEvent('navigation:showShortcuts', {
            detail: { shortcuts: this.getShortcuts() }
        }));
    }

    #announce(message) {
        // Create or update screen reader announcement
        let announcer = document.getElementById('sr-announcer');
        if (!announcer) {
            announcer = document.createElement('div');
            announcer.id = 'sr-announcer';
            announcer.className = 'sr-only';
            announcer.setAttribute('role', 'status');
            announcer.setAttribute('aria-live', 'polite');
            document.body.appendChild(announcer);
        }
        
        announcer.textContent = message;
    }

    // Navigation helpers for tree structures
    #navigateToParent() {
        // Implementation specific to mindmap structure
        this.#container.dispatchEvent(new CustomEvent('navigation:toParent'));
    }

    #navigateToSibling(offset) {
        // Implementation specific to mindmap structure
        this.#container.dispatchEvent(new CustomEvent('navigation:toSibling', {
            detail: { offset }
        }));
    }

    #navigateToChild() {
        // Implementation specific to mindmap structure
        this.#container.dispatchEvent(new CustomEvent('navigation:toChild'));
    }

    /**
     * Cleanup
     */
    destroy() {
        this.#elements.clear();
        this.#shortcuts.clear();
        this.#focusHistory = [];
        this.#focusedElement = null;
    }
}

export default KeyboardNavigation;